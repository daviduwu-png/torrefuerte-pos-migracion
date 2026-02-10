

use crate::commands::productos::AppState;
use crate::models::{ApiResponse, CorteCaja, Ticket, TicketProducto};
use rusqlite::params;
use std::process::Command;
use tauri::{command, State};

// Usando sintaxis de dispositivo de Windows para acceder a impresora compartida
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
        self.buffer.extend_from_slice(&[0x1B, 0x70, 0x00, 0x19, 0xFA]); // ESC p 0 25 250
    }
}

fn sanitize_text(s: &str) -> String {
    let s = s.to_uppercase();
    let s = s.replace("Á", "A")
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
    use windows::core::PWSTR;
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::Graphics::Printing::{
        OpenPrinterW, ClosePrinter, StartDocPrinterW, EndDocPrinter,
        WritePrinter, DOC_INFO_1W, PRINTER_DEFAULTSW
    };
    use std::ptr::null_mut;
    
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
            Some(null_mut() as *const PRINTER_DEFAULTSW)
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
            &mut written as *mut _
        );
        
        // Finalizar documento
        EndDocPrinter(h_printer);
        ClosePrinter(h_printer);
        
        if !write_result.as_bool() || written != buffer.len() as u32 {
            return Err(format!(
                "Error escribiendo a la impresora. Bytes escritos: {}/{}",
                written, buffer.len()
            ));
        }
        
        Ok(())
    }
}

// Fallback para plataformas no-Windows
#[cfg(not(windows))]
fn send_to_printer(_buffer: &[u8]) -> Result<(), String> {
    Err("Impresión solo soportada en Windows".to_string())
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
    let mut stmt = conn.prepare(
        "SELECT p.nombre, tp.cantidad, tp.precio_unitario, tp.subtotal 
         FROM ticket_producto tp 
         JOIN producto p ON tp.producto_id = p.id 
         WHERE tp.ticket_id = ?"
    ).unwrap();

    let productos: Vec<TicketProducto> = stmt.query_map(params![ticket_id], |row| {
        Ok(TicketProducto {
            producto_id: 0, // No necesario
            nombre: row.get(0)?,
            cantidad: row.get(1)?,
            devuelto: 0.0, // Default value for printing
            precio_unitario: row.get(2)?,
            subtotal: row.get(3)?,
        })
    }).unwrap().filter_map(|r| r.ok()).collect();

    // 3. Generar ESC/POS
    let mut p = EscPos::new();
    p.init();

    // Encabezado
    p.center();
    p.double_size(true);
    p.text("TORRE FUERTE\n");
    p.double_size(false);
    p.text("RFC: NIZA620827PH8\n"); // cambiar rfc al de juan
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
        
        p.text_raw(&format!("{}{}{}\n", detalles, " ".repeat(espacios), subtotal));
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
    p.text(&format!("Transferencia: ${:.2}\n", corte.total_transferencia));
    
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
    // Obtener lista de impresoras usando PowerShell
    let output = Command::new("powershell")
        .args(&[
            "-Command",
            "Get-Printer | Select-Object Name, PortName, Shared, ShareName | Format-List"
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
