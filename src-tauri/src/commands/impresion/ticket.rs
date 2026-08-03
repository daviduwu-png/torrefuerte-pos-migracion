use crate::commands::productos::AppState;
use crate::models::{ApiResponse, Ticket, TicketProducto};
use crate::commands::impresion::{driver::send_to_printer, escpos::{sanitize_text, EscPos}};
use rusqlite::params;
use tauri::{command, State};

/// Imprime el ticket de venta completo dado su ID.
#[command]
pub fn imprimir_ticket(ticket_id: i64, impresora: Option<String>, state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();

    // 1. Obtener cabecera
    let ticket_res = conn.query_row(
        "SELECT id, folio_fiscal, metodo_pago, total, direccion_local, nombre_local, dinero_recibido, cambio, fecha FROM ticket WHERE id = ?",
        params![ticket_id],
        |row| {
            Ok(Ticket {
                id: row.get(0)?,
                folio_fiscal: row.get(1)?,
                metodo_pago: row.get(2)?,
                total: row.get(3)?,
                direccion_local: row.get(4)?,
                nombre_local: row.get(5)?,
                dinero_recibido: row.get(6)?,
                cambio: row.get(7)?,
                usuario_id: None,
                fecha: row.get(8)?,
            })
        },
    );

    let ticket = match ticket_res {
        Ok(t) => t,
        Err(_) => return ApiResponse::error("Ticket no encontrado"),
    };

    // 2. Obtener productos
    let mut stmt = conn
        .prepare(
            "SELECT tp.producto_id, p.nombre, p.codigo_interno, tp.cantidad, tp.precio_unitario, tp.subtotal
             FROM ticket_producto tp
             JOIN producto p ON tp.producto_id = p.id
             WHERE tp.ticket_id = ?",
        )
        .unwrap();

    let productos: Vec<TicketProducto> = stmt
        .query_map(params![ticket_id], |row| {
            Ok(TicketProducto {
                producto_id: row.get(0)?,
                nombre: row.get(1)?,
                codigo_interno: row.get(2)?,
                cantidad: row.get(3)?,
                devuelto: 0.0,
                precio_unitario: row.get(4)?,
                subtotal: row.get(5)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    // Obtener configuración de tickets de la base de datos
    let mut config_stmt = conn.prepare("SELECT clave, valor FROM configuracion WHERE clave LIKE 'ticket_%'").unwrap();
    let config_map: std::collections::HashMap<String, String> = config_stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    let _nombre_local = config_map.get("ticket_nombre_local").cloned().unwrap_or_else(|| "TORRE FUERTE".to_string());
    let rfc = config_map.get("ticket_rfc").cloned().unwrap_or_default();
    let dir1 = config_map.get("ticket_direccion_1").cloned().unwrap_or_default();
    let dir2 = config_map.get("ticket_direccion_2").cloned().unwrap_or_default();
    let dir3 = config_map.get("ticket_direccion_3").cloned().unwrap_or_default();
    let mensaje_despedida = config_map.get("ticket_mensaje").cloned().unwrap_or_else(|| "Gracias por su compra".to_string());

    // 3. Generar ESC/POS
    let mut p = EscPos::new();
    p.init();
    p.padding();
    p.feed(1);

    // Encabezado
    p.center();
    p.double_size(true);
    // Usa el nombre_local histórico guardado al momento de la venta
    p.text(&format!("{}\n", ticket.nombre_local));
    p.double_size(false);
    
    if !rfc.is_empty() { p.text(&format!("RFC: {}\n", rfc)); }
    // Usa la direccion_local histórica si existe, sino la actual
    if !ticket.direccion_local.is_empty() { 
        p.text(&format!("{}\n", ticket.direccion_local)); 
    } else if !dir1.is_empty() { 
        p.text(&format!("{}\n", dir1)); 
    }
    if !dir2.is_empty() { p.text(&format!("{}\n", dir2)); }
    if !dir3.is_empty() { p.text(&format!("{}\n", dir3)); }
    p.feed(1);

    // Datos del ticket
    p.left();
    p.text(&format!("Ticket: {}\n", ticket.id));

    let mut fecha_fmt: String = ticket.fecha.clone();
    let partes: Vec<&str> = ticket.fecha.split_whitespace().collect();
    if partes.len() >= 2 {
        let f: Vec<&str> = partes[0].split('-').collect();
        let hora = partes[1].get(..8).unwrap_or(partes[1]);
        if f.len() == 3 {
            fecha_fmt = format!("{}/{}/{} {}", f[2], f[1], f[0], hora);
        }
    }
    p.text(&format!("Fecha:  {}\n", fecha_fmt));
    p.text_raw("--------------------------------\n");

    // Línea por producto
    for prod in &productos {
        let mut nombre: String = sanitize_text(&prod.nombre);
        if nombre.len() > 32 {
            nombre = format!("{}...", &nombre[..29]);
        }
        p.text_raw(&format!("{}\n", nombre));

        let detalles = format!("{} x ${:.2}", prod.cantidad, prod.precio_unitario);
        let subtotal = format!("${:.2}", prod.subtotal);

        let ancho = 32;
        let espacios = if ancho > (detalles.len() + subtotal.len()) {
            ancho - detalles.len() - subtotal.len()
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
    p.text(&format!("{}\n", mensaje_despedida));
    p.feed(3);
    p.cut();
    p.pulse();

    match send_to_printer(&p.buffer, impresora.as_deref()) {
        Ok(_) => ApiResponse::success("Ticket enviado a impresión", ()),
        Err(e) => ApiResponse::error(&e),
    }
}
