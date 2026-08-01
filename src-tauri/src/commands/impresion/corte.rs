use crate::models::{ApiResponse, CorteCaja};
use crate::commands::impresion::{driver::send_to_printer, escpos::EscPos};
use tauri::command;

/// Imprime el corte de caja (resumen del día).
#[command]
pub fn imprimir_corte(corte: CorteCaja) -> ApiResponse<()> {
    let mut p = EscPos::new();
    p.init();
    p.padding();
    p.feed(1);

    p.center();
    p.double_size(true);
    p.text("CORTE DE CAJA\n");
    p.double_size(false);

    p.text("TORRE FUERTE\n");

    // Formatear fecha de "YYYY-MM-DD HH:MM:SS" a "DD/MM/YYYY HH:MM:SS"
    let partes: Vec<&str> = corte.fecha.split_whitespace().collect();
    let fecha_hora_fmt: String = if partes.len() >= 2 {
        let f_str = partes[0];
        let h_str = partes[1];
        let f_parts: Vec<&str> = f_str.split('-').collect();
        let f_fmt: String = if f_parts.len() == 3 {
            format!("{}/{}/{}", f_parts[2], f_parts[1], f_parts[0])
        } else {
            f_str.to_string()
        };
        format!("{} {}", f_fmt, h_str)
    } else {
        use chrono::Local;
        Local::now().format("%d/%m/%Y %H:%M:%S").to_string()
    };
    p.text(&format!("Fecha: {}\n", fecha_hora_fmt));
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
