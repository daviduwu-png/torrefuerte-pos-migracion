use crate::commands::productos::AppState;
use crate::models::{ApiResponse, CorteCaja, Ticket, TicketProducto};
use rusqlite::params;
use std::process::Command;
use tauri::{command, State};

// Usando sintaxis de dispositivo de Windows para acceder a impresora compartida
#[allow(dead_code)] // Se usa solo en cfg(windows)
const PRINTER_NAME: &str = r"\\.\POS-58";

struct EscPos {
    buffer: Vec<u8>,
}

impl EscPos {
    fn new() -> Self {
        Self { buffer: Vec::new() }
    }

    fn init(&mut self) {
        self.buffer.extend_from_slice(&[0x1B, 0x40]); // ESC @
    }

    fn center(&mut self) {
        self.buffer.extend_from_slice(&[0x1B, 0x61, 0x01]); // ESC a 1
    }

    fn left(&mut self) {
        self.buffer.extend_from_slice(&[0x1B, 0x61, 0x00]); // ESC a 0
    }

    fn right(&mut self) {
        self.buffer.extend_from_slice(&[0x1B, 0x61, 0x02]); // ESC a 2
    }

    fn bold(&mut self, on: bool) {
        let val = if on { 1 } else { 0 };
        self.buffer.extend_from_slice(&[0x1B, 0x45, val]); // ESC E n
    }

    fn double_size(&mut self, on: bool) {
        let val = if on { 0x11 } else { 0x00 };
        self.buffer.extend_from_slice(&[0x1D, 0x21, val]); // GS ! n
    }

    fn text(&mut self, s: &str) {
        let sanitized = sanitize_text(s);
        self.buffer.extend_from_slice(sanitized.as_bytes());
    }

    fn text_raw(&mut self, s: &str) {
        self.buffer.extend_from_slice(s.as_bytes());
    }

    fn feed(&mut self, n: u8) {
        self.buffer.extend_from_slice(&[0x1B, 0x64, n]); // ESC d n
    }

    fn cut(&mut self) {
        self.buffer.extend_from_slice(&[0x1D, 0x56, 0x41, 0x03]); // GS V A 3
    }

    fn pulse(&mut self) {
        self.buffer
            .extend_from_slice(&[0x1B, 0x70, 0x00, 0x19, 0xFA]); // ESC p 0 25 250
    }
}

fn sanitize_text(s: &str) -> String {
    let s = s.to_uppercase();
    let s = s
        .replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
        .replace("Ñ", "N")
        .replace("Ü", "U");
    s.chars().filter(|c| c.is_ascii()).collect()
}

// Usar API de Windows para imprimir RAW (igual que WindowsPrintConnector de PHP)
#[cfg(windows)]
fn send_to_printer(buffer: &[u8]) -> Result<(), String> {
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

// ── Implementación Linux ────────────────────────────────────────────────────
// Estrategia (en orden de prioridad):
//   1. Escritura directa al dispositivo (sin dependencias, latencia mínima).
//      Dispositivos probados en orden:
//        /dev/usb/lp*  → impresoras USB (clase USB Printing)
//        /dev/ttyUSB*  → impresoras conectadas vía adaptador USB→Serial
//        /dev/ttyS*    → puertos COM nativos (ej. NEC TWINPOS G7 tiene 4 puertos COM)
//        /dev/lp*      → puerto paralelo LPT (ej. NEC TWINPOS G7 tiene 1 LPT)
//      Requisito de permisos:
//        sudo usermod -aG lp $USER        (para /dev/usb/lp*, /dev/lp*)
//        sudo usermod -aG dialout $USER   (para /dev/ttyUSB*, /dev/ttyS*)
//        Luego cerrar sesión y volver a entrar.
//   2. CUPS vía comando `lp -d IMPRESORA -o raw -`.
//      Funciona con cualquier impresora config. en CUPS (localhost:631).
#[cfg(target_os = "linux")]
fn send_to_printer(buffer: &[u8]) -> Result<(), String> {
    use std::io::Write;

    // Todos los tipos de interfaz que puede tener una impresora térmica POS.
    // Se prueban en orden; se usa el primero que exista y al que tengamos permiso.
    let rutas_candidatas: &[&str] = &[
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

    for ruta in rutas_candidatas {
        let path = std::path::Path::new(ruta);
        if !path.exists() {
            continue;
        }
        match std::fs::OpenOptions::new().write(true).open(path) {
            Ok(mut archivo) => {
                return archivo.write_all(buffer).map_err(|e| {
                    format!(
                        "Error escribiendo a {}: {}.\n\
                         Si es un error de permisos, ejecuta UNA VEZ:\n\
                           sudo usermod -aG lp $USER        (para USB/LPT)\n\
                           sudo usermod -aG dialout $USER   (para COM/Serial)\n\
                         Y luego cierra e inicia sesión nuevamente.",
                        ruta, e
                    )
                });
            }
            Err(_) => continue, // Sin permiso o bloqueado → probar siguiente
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
    let nombre_impresora = salida
        .split(':')
        .nth(1)
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    if nombre_impresora.is_empty() {
        return Err("No hay impresora por defecto configurada en CUPS.\n\
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

// Fallback para macOS y otros Unix (no Linux)
#[cfg(not(any(windows, target_os = "linux")))]
fn send_to_printer(_buffer: &[u8]) -> Result<(), String> {
    Err("Impresión ESC/POS no soportada en este sistema operativo.".to_string())
}

#[command]
pub fn imprimir_ticket(ticket_id: i64, state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();

    // 1. Obtener cabecera
    let ticket_res = conn.query_row(
        "SELECT id, folio_fiscal, metodo_pago, total, dinero_recibido, cambio, fecha FROM ticket WHERE id = ?",
        params![ticket_id],
        |row| Ok(Ticket {
            id: row.get(0)?,
            folio_fiscal: row.get(1)?,
            metodo_pago: row.get(2)?,
            total: row.get(3)?,
            direccion_local: "TORRE FUERTE".to_string(), // Default
            nombre_local: "TORRE FUERTE".to_string(),
            dinero_recibido: row.get(4)?,
            cambio: row.get(5)?,
            usuario_id: None, // No necesario para impresión
            fecha: row.get(6)?,
        })
    );

    let ticket = match ticket_res {
        Ok(t) => t,
        Err(_) => return ApiResponse::error("Ticket no encontrado"),
    };

    // 2. Obtener productos
    let mut stmt = conn
        .prepare(
            "SELECT p.nombre, tp.cantidad, tp.precio_unitario, tp.subtotal 
         FROM ticket_producto tp 
         JOIN producto p ON tp.producto_id = p.id 
         WHERE tp.ticket_id = ?",
        )
        .unwrap();

    let productos: Vec<TicketProducto> = stmt
        .query_map(params![ticket_id], |row| {
            Ok(TicketProducto {
                producto_id: 0, // No necesario
                nombre: row.get(0)?,
                cantidad: row.get(1)?,
                devuelto: 0.0, // Default value for printing
                precio_unitario: row.get(2)?,
                subtotal: row.get(3)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    // 3. Generar ESC/POS
    let mut p = EscPos::new();
    p.init();

    // Encabezado
    p.center();
    p.double_size(true);
    p.text("TORRE FUERTE\n");
    p.double_size(false);
    p.text("RFC: ------------\n"); // cambiar rfc al de juan
    p.text("9 PONIENTE 907,\n");
    p.text("COL ALVARO OBREGON\n");
    p.text("ATLIXCO PUEBLA C.P 74260\n");
    p.feed(1);

    // Datos
    p.left();
    p.text(&format!("Ticket: {}\n", ticket.id));
    p.text(&format!("Fecha:  {}\n", ticket.fecha));
    p.text_raw("--------------------------------\n");

    // Productos
    for prod in &productos {
        let nombre = sanitize_text(&prod.nombre);
        // Truncar
        let nombre = if nombre.len() > 32 {
            format!("{}...", &nombre[..29])
        } else {
            nombre
        };
        p.text_raw(&format!("{}\n", nombre));

        let detalles = format!("{} x ${:.2}", prod.cantidad, prod.precio_unitario);
        let subtotal = format!("${:.2}", prod.subtotal);

        // Espaciado
        let ancho = 32;
        let len_det = detalles.len();
        let len_sub = subtotal.len();
        let espacios = if ancho > (len_det + len_sub) {
            ancho - len_det - len_sub
        } else {
            1
        };

        p.text_raw(&format!(
            "{}{}{}\n",
            detalles,
            " ".repeat(espacios),
            subtotal
        ));
    }
    p.text_raw("--------------------------------\n");

    // Totales
    p.right();
    p.bold(true);
    p.text(&format!("TOTAL: ${:.2}\n", ticket.total));
    p.bold(false);

    let metodo = sanitize_text(&ticket.metodo_pago);
    if metodo == "EFECTIVO" {
        p.text(&format!("RECIBIDO: ${:.2}\n", ticket.dinero_recibido));
        p.text(&format!("CAMBIO:   ${:.2}\n", ticket.cambio));
    } else {
        p.text(&format!("PAGO: {}\n", metodo));
    }

    // Pie
    p.center();
    p.feed(2);
    p.text("Gracias por su compra\n");
    p.feed(3);

    p.cut();
    p.pulse();

    match send_to_printer(&p.buffer) {
        Ok(_) => ApiResponse::success("Ticket enviado a impresión", ()),
        Err(e) => ApiResponse::error(&e),
    }
}

#[command]
pub fn imprimir_corte(corte: CorteCaja) -> ApiResponse<()> {
    let mut p = EscPos::new();
    p.init();

    p.center();
    p.double_size(true);
    p.text("CORTE DE CAJA\n");
    p.double_size(false);

    p.text("TORRE FUERTE\n");
    p.text(&format!("Fecha: {}\n", corte.fecha));
    p.feed(1);

    p.left();
    p.text_raw("--------------------------------\n");

    p.text(&format!("Tickets: {}\n", corte.total_tickets));
    if let (Some(ini), Some(fin)) = (corte.ticket_inicial, corte.ticket_final) {
        p.text(&format!("Del #{} al #{}\n", ini, fin));
    }
    p.text_raw("--------------------------------\n");

    p.right();
    p.bold(true);
    p.text(&format!("TOTAL VENTA: ${:.2}\n", corte.total_venta));
    p.feed(1);

    p.left();
    p.bold(false);
    p.text("Desglose:\n");
    p.text(&format!("Efectivo:      ${:.2}\n", corte.total_efectivo));
    p.text(&format!("Tarjeta:       ${:.2}\n", corte.total_tarjeta));
    p.text(&format!(
        "Transferencia: ${:.2}\n",
        corte.total_transferencia
    ));

    p.center();
    p.feed(3);
    p.cut();

    match send_to_printer(&p.buffer) {
        Ok(_) => ApiResponse::success("Corte enviado a impresión", ()),
        Err(e) => ApiResponse::error(&e),
    }
}

#[command]
pub fn listar_impresoras() -> ApiResponse<String> {
    #[cfg(windows)]
    {
        // Windows: listar con PowerShell
        let output = Command::new("powershell")
            .args(&[
                "-Command",
                "Get-Printer | Select-Object Name, PortName, Shared, ShareName | Format-List",
            ])
            .output();

        match output {
            Ok(result) => {
                let stdout = String::from_utf8_lossy(&result.stdout);
                let stderr = String::from_utf8_lossy(&result.stderr);
                if result.status.success() {
                    ApiResponse::success("Impresoras listadas", stdout.to_string())
                } else {
                    ApiResponse::error(&format!("Error ejecutando PowerShell: {}", stderr))
                }
            }
            Err(e) => ApiResponse::error(&format!("No se pudo ejecutar PowerShell: {}", e)),
        }
    }

    #[cfg(target_os = "linux")]
    {
        let mut info = String::new();

        // 1. Impresoras configuradas en CUPS
        match Command::new("lpstat").args(&["-a"]).output() {
            Ok(res) if res.status.success() => {
                let stdout = String::from_utf8_lossy(&res.stdout);
                if stdout.trim().is_empty() {
                    info.push_str("[CUPS] Sin impresoras registradas.\n");
                } else {
                    info.push_str("[CUPS] Impresoras registradas:\n");
                    info.push_str(&stdout);
                }
            }
            _ => {
                info.push_str("[CUPS] No instalado o sin impresoras.\n");
            }
        }

        // 2. Impresora por defecto
        if let Ok(res) = Command::new("lpstat").args(&["-d"]).output() {
            let salida = String::from_utf8_lossy(&res.stdout);
            info.push_str(&format!("\n[Por defecto] {}\n", salida.trim()));
        }

        // 3. Todos los dispositivos de impresora detectados
        let rutas_usb_lp = ["/dev/usb/lp0", "/dev/usb/lp1", "/dev/usb/lp2"];
        let rutas_tty_usb = ["/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyUSB2"];
        let rutas_tty_s = ["/dev/ttyS0", "/dev/ttyS1", "/dev/ttyS2", "/dev/ttyS3"]; // COM nativos
        let rutas_lp = ["/dev/lp0", "/dev/lp1"]; // LPT paralelo

        let todos: Vec<&str> = rutas_usb_lp
            .iter()
            .chain(rutas_tty_usb.iter())
            .chain(rutas_tty_s.iter())
            .chain(rutas_lp.iter())
            .filter(|r| std::path::Path::new(r).exists())
            .copied()
            .collect();

        if todos.is_empty() {
            info.push_str("\n[Dispositivos] Ninguno detectado.\n");
        } else {
            info.push_str(&format!(
                "\n[Dispositivos detectados] {}\n",
                todos.join(", ")
            ));
        }

        info.push_str(
            "\nPermisos necesarios (ejecutar UNA VEZ y reiniciar sesión):\n\
             • USB/LPT   → sudo usermod -aG lp $USER\n\
             • COM/Serial → sudo usermod -aG dialout $USER",
        );

        ApiResponse::success("Dispositivos de impresión listados", info)
    }

    #[cfg(not(any(windows, target_os = "linux")))]
    {
        ApiResponse::error("Listado de impresoras no soportado en este sistema operativo.")
    }
}
