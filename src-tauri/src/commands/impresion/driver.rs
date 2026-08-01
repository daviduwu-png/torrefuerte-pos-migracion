/// Capa de transporte: envía el buffer ESC/POS a la impresora física.
///
/// Estrategia (en orden de prioridad):
///   1. Escritura directa al dispositivo (sin dependencias, latencia mínima).
///      Dispositivos probados en orden:
///        /dev/usb/lp*  → impresoras USB (clase USB Printing)
///        /dev/ttyUSB*  → impresoras conectadas vía adaptador USB→Serial
///        /dev/ttyS*    → puertos COM nativos (ej. NEC TWINPOS G7)
///        /dev/lp*      → puerto paralelo LPT
///      Requisito de permisos:
///        sudo usermod -aG lp $USER        (para /dev/usb/lp*, /dev/lp*)
///        sudo usermod -aG dialout $USER   (para /dev/ttyUSB*, /dev/ttyS*)
///        Luego cerrar sesión y volver a entrar.
///   2. CUPS vía comando `lp -d IMPRESORA -o raw -`.
///      Funciona con cualquier impresora configurada en CUPS (localhost:631).

// Usando sintaxis de dispositivo de Windows para acceder a impresora compartida.
#[allow(dead_code)] // Se usa solo en cfg(windows)
const PRINTER_NAME: &str = r"\\.\POS-58";

// ── Implementación Windows ─────────────────────────────────────────────────
#[cfg(windows)]
pub fn send_to_printer(buffer: &[u8], _impresora_target: Option<&str>) -> Result<(), String> {
    use std::ptr::null_mut;
    use windows::core::PWSTR;
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::Graphics::Printing::{
        ClosePrinter, EndDocPrinter, OpenPrinterW, StartDocPrinterW, WritePrinter, DOC_INFO_1W,
        PRINTER_DEFAULTSW,
    };

    unsafe {
        // Convertir nombre de impresora a UTF-16
        let printer_name_wide: Vec<u16> = PRINTER_NAME
            .trim_start_matches(r"\\.\")
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        let mut h_printer: HANDLE = HANDLE::default();

        // Abrir impresora
        let result = OpenPrinterW(
            PWSTR(printer_name_wide.as_ptr() as *mut u16),
            &mut h_printer as *mut _,
            Some(null_mut() as *const PRINTER_DEFAULTSW),
        );

        if result.is_err() {
            return Err(format!(
                "No se pudo abrir la impresora '{}'. Verifica que esté instalada y compartida.",
                PRINTER_NAME.trim_start_matches(r"\\.\")
            ));
        }

        // Preparar documento
        let doc_name: Vec<u16> = "Ticket TorreFuerte"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        let datatype: Vec<u16> = "RAW\0".encode_utf16().collect();

        let doc_info = DOC_INFO_1W {
            pDocName: PWSTR(doc_name.as_ptr() as *mut u16),
            pOutputFile: PWSTR::null(),
            pDatatype: PWSTR(datatype.as_ptr() as *mut u16),
        };

        // Iniciar documento
        let job_id = StartDocPrinterW(h_printer, 1, &doc_info as *const DOC_INFO_1W);
        if job_id == 0 {
            ClosePrinter(h_printer);
            return Err("No se pudo iniciar el documento de impresión".to_string());
        }

        // Escribir datos
        let mut written: u32 = 0;
        let write_result = WritePrinter(
            h_printer,
            buffer.as_ptr() as *const _,
            buffer.len() as u32,
            &mut written as *mut _,
        );

        // Finalizar documento
        EndDocPrinter(h_printer);
        ClosePrinter(h_printer);

        if !write_result.as_bool() || written != buffer.len() as u32 {
            return Err(format!(
                "Error escribiendo a la impresora. Bytes escritos: {}/{}",
                written,
                buffer.len()
            ));
        }

        Ok(())
    }
}

// ── Implementación Linux ───────────────────────────────────────────────────
#[cfg(target_os = "linux")]
pub fn send_to_printer(buffer: &[u8], impresora_target: Option<&str>) -> Result<(), String> {
    use std::io::Write;

    let mut try_usb = true;
    let mut rutas_candidatas: Vec<&str> = vec![];
    let mut cups_target = None;

    if let Some(target) = impresora_target {
        if target == "1" || target == "principal" {
            rutas_candidatas = vec!["/dev/usb/lp0", "/dev/ttyUSB0", "/dev/ttyS0", "/dev/lp0"];
            cups_target = Some("POS-58");
        } else if target == "2" || target == "secundaria" {
            rutas_candidatas = vec!["/dev/usb/lp1", "/dev/usb/lp2", "/dev/ttyUSB1", "/dev/ttyS1", "/dev/lp1"];
            cups_target = Some("POS-58-2"); // O el nombre que tenga en CUPS
        } else if target.starts_with("/dev/") {
            rutas_candidatas.push(target);
        } else {
            try_usb = false;
            cups_target = Some(target);
        }
    } else {
        rutas_candidatas = vec![
            // USB (clase Printing) — lo más común en impresoras modernas
            "/dev/usb/lp0",
            "/dev/usb/lp1",
            "/dev/usb/lp2",
            // USB → Serial (adaptadores, dongles)
            "/dev/ttyUSB0",
            "/dev/ttyUSB1",
            "/dev/ttyUSB2",
            // COM nativos (NEC TWINPOS G7 tiene 4 puertos COM en la placa)
            "/dev/ttyS0",
            "/dev/ttyS1",
            "/dev/ttyS2",
            "/dev/ttyS3",
            // Puerto paralelo LPT (NEC TWINPOS G7 tiene 1 puerto LPT)
            "/dev/lp0",
            "/dev/lp1",
        ];
    }

    if try_usb {
        for ruta in rutas_candidatas {
            let path = std::path::Path::new(ruta);
            if !path.exists() {
                continue;
            }
            match std::fs::OpenOptions::new().write(true).open(path) {
                Ok(mut archivo) => {
                    let r: Result<(), String> = archivo
                        .write_all(buffer)
                        .map_err(|e: std::io::Error| {
                            format!(
                                "Error escribiendo a {}: {}.\n\
                                 Si es un error de permisos, ejecuta UNA VEZ:\n\
                                   sudo usermod -aG lp $USER        (para USB/LPT)\n\
                                   sudo usermod -aG dialout $USER   (para COM/Serial)\n\
                                 Y luego cierra e inicia sesión nuevamente.",
                                ruta, e
                            )
                        });
                    return r;
                }
                Err(_) => continue,
            }
        }
    }

    // --- Estrategia 2: CUPS vía comando `lp` ---
    use std::process::{Command, Stdio};

    // Obtener nombre de la impresora por defecto configurada en CUPS
    let lpstat = Command::new("lpstat").args(&["-d"]).output().map_err(|_| {
        "No se encontró dispositivo USB de impresora ni CUPS instalado.\n\
             Opciones:\n\
             • Conectar impresora USB y añadir tu usuario al grupo lp:\n\
               sudo usermod -aG lp $USER\n\
             • O instalar y configurar CUPS:\n\
               sudo dnf install cups  (Fedora)\n\
               sudo apt install cups  (Mint)"
            .to_string()
    })?;

    let salida = String::from_utf8_lossy(&lpstat.stdout);
    // lpstat -d devuelve: "system default destination: NombreImpresora"
    let mut nombre_impresora = if let Some(target) = cups_target {
        target.to_string()
    } else {
        salida
            .split(':')
            .nth(1)
            .map(|s| s.trim().to_string())
            .unwrap_or_default()
    };

    if nombre_impresora.is_empty() {
        // Intento 1: Buscar si hay alguna impresora instalada en CUPS (aunque no sea la por defecto)
        if let Ok(res_a) = Command::new("lpstat").args(&["-a"]).output() {
            let salida_a = String::from_utf8_lossy(&res_a.stdout);
            if let Some(primera) = salida_a
                .lines()
                .next()
                .and_then(|l| l.split_whitespace().next())
            {
                nombre_impresora = primera.trim().to_string();
                let _ = Command::new("lpadmin")
                    .args(&["-d", &nombre_impresora])
                    .status();
            }
        }
    }

    if nombre_impresora.is_empty() {
        // Intento 2: Buscar si CUPS detecta una impresora USB directa y auto-configurarla como cola RAW
        if let Ok(res_v) = Command::new("lpinfo").args(&["-v"]).output() {
            let salida_v = String::from_utf8_lossy(&res_v.stdout);
            for linea in salida_v.lines() {
                let linea_trim = linea.trim();
                if linea_trim.starts_with("direct usb://") {
                    if let Some(uri) = linea_trim.split_whitespace().nth(1) {
                        let nombre_auto = "POS58";
                        let _ = Command::new("lpadmin")
                            .args(&["-p", nombre_auto, "-v", uri, "-E", "-m", "raw"])
                            .status();
                        let _ = Command::new("lpadmin")
                            .args(&["-d", nombre_auto])
                            .status();
                        nombre_impresora = nombre_auto.to_string();
                        break;
                    }
                }
            }
        }
    }

    if nombre_impresora.is_empty() {
        return Err("No hay impresora por defecto configurada en CUPS ni detectada por USB.\n\
             Configúrala en: http://localhost:631  o con  system-config-printer"
            .to_string());
    }

    // Enviar bytes ESC/POS crudos a CUPS
    let mut proceso = Command::new("lp")
        .args(&["-d", &nombre_impresora, "-o", "raw", "-"])
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| format!("No se pudo ejecutar 'lp': {}", e))?;

    if let Some(stdin) = proceso.stdin.as_mut() {
        stdin
            .write_all(buffer)
            .map_err(|e| format!("Error enviando datos a la impresora: {}", e))?;
    }

    let estado = proceso
        .wait()
        .map_err(|e| format!("Error esperando respuesta de la impresora: {}", e))?;

    if estado.success() {
        Ok(())
    } else {
        Err(format!(
            "La impresora '{}' rechazó los datos. \
             Verifica que esté en línea y configurada en modo RAW en CUPS.",
            nombre_impresora
        ))
    }
}

// ── Fallback para macOS y otros Unix (no Linux) ───────────────────────────
#[cfg(not(any(windows, target_os = "linux")))]
pub fn send_to_printer(_buffer: &[u8], _impresora_target: Option<&str>) -> Result<(), String> {
    Err("Impresión ESC/POS no soportada en este sistema operativo.".to_string())
}
