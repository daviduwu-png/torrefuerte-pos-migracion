use crate::models::ApiResponse;
use crate::commands::impresion::{driver::send_to_printer, escpos::EscPos};
use tauri::command;

/// Imprime una página de prueba mínima para verificar que la impresora responde.
/// No requiere datos de BD: solo imprime un banner, fecha/hora actual y un corte.
#[command]
pub async fn imprimir_test(impresora: Option<String>) -> ApiResponse<()> {
    use chrono::Local;

    let fecha_hora = Local::now().format("%d/%m/%Y %H:%M:%S").to_string();

    let mut p = EscPos::new();
    p.init();
    p.padding();
    p.feed(1);

    p.center();
    p.double_size(true);
    p.text("TEST\n");
    p.double_size(false);
    p.feed(1);

    p.text("TORRE FUERTE\n");
    p.text_raw("--------------------------------\n");
    p.feed(1);

    p.text("Impresora OK\n");
    p.feed(1);

    p.left();
    p.text(&format!("Fecha: {}\n", fecha_hora));
    p.feed(1);

    p.center();
    p.text_raw("--------------------------------\n");
    p.text("** FIN DE PRUEBA **\n");
    p.feed(4);
    p.cut();

    match send_to_printer(&p.buffer, impresora.as_deref()) {
        Ok(_) => ApiResponse::success("Página de prueba enviada", ()),
        Err(e) => ApiResponse::error(&e),
    }
}
