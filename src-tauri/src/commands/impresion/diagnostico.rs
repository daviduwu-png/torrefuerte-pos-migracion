use crate::models::ApiResponse;
use std::process::Command;
use tauri::command;

/// Lista las impresoras disponibles en el sistema (CUPS / dispositivos USB).
#[command]
pub async fn listar_impresoras() -> ApiResponse<String> {
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

        // 3. Hardware detectado por CUPS (lpinfo -v)
        if let Ok(res) = Command::new("lpinfo").args(&["-v"]).output() {
            let salida = String::from_utf8_lossy(&res.stdout);
            let directos: Vec<&str> = salida
                .lines()
                .filter(|l| l.trim().starts_with("direct "))
                .collect();
            if !directos.is_empty() {
                info.push_str(&format!(
                    "\n[Hardware CUPS (lpinfo -v)]\n{}\n",
                    directos.join("\n")
                ));
            }
        }

        // 4. Todos los dispositivos de impresora detectados directamente
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

/// Registra una impresora en CUPS usando el modo raw. Requiere permisos (usará pkexec).
#[command]
pub async fn registrar_impresora_cups(nombre: String, uri: String) -> ApiResponse<()> {
    #[cfg(target_os = "linux")]
    {
        // Sanitizar inputs básicos
        let nombre = nombre.replace(" ", "_");
        
        let status = Command::new("pkexec")
            .args([
                "lpadmin",
                "-p",
                &nombre,
                "-E",
                "-v",
                &uri,
                "-m",
                "raw",
            ])
            .status();

        match status {
            Ok(s) if s.success() => ApiResponse::success(&format!("Impresora {} registrada exitosamente.", nombre), ()),
            Ok(s) => ApiResponse::error(&format!("Error al registrar: el comando salió con código {}", s)),
            Err(e) => ApiResponse::error(&format!("Error ejecutando pkexec: {}", e)),
        }
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        ApiResponse::error("El registro por CUPS solo está soportado en Linux.")
    }
}
