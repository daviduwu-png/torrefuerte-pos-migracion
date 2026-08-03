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
        "SELECT id, folio_fiscal, metodo_pago, total, dinero_recibido, cambio, fecha FROM ticket WHERE id = ?",
        params![ticket_id],
        |row| {
            Ok(Ticket {
                id: row.get(0)?,
                folio_fiscal: row.get(1)?,
                metodo_pago: row.get(2)?,
                total: row.get(3)?,
                direccion_local: "TORRE FUERTE".to_string(),
                nombre_local: "TORRE FUERTE".to_string(),
                dinero_recibido: row.get(4)?,
                cambio: row.get(5)?,
                usuario_id: None,
                fecha: row.get(6)?,
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

    // 3. Generar ESC/POS
    let mut p = EscPos::new();
    p.init();
    p.padding();
    p.feed(1);

    // Encabezado
    p.center();
    p.double_size(true);
    p.text("TORRE FUERTE\n");
    p.double_size(false);
    p.text("RFC: NIGA0412116D7\n");
    p.text("9 PONIENTE 907,\n");
    p.text("COL ALVARO OBREGON\n");
    p.text("ATLIXCO PUEBLA C.P 74260\n");
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
    p.text("Gracias por su compra\n");
    p.feed(3);
    p.cut();
    p.pulse();

    match send_to_printer(&p.buffer, impresora.as_deref()) {
        Ok(_) => ApiResponse::success("Ticket enviado a impresión", ()),
        Err(e) => ApiResponse::error(&e),
    }
}
