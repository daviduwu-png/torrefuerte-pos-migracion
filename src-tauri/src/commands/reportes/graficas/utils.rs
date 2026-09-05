// Utilidades compartidas para los reportes de gráficas del dashboard.
// Helpers para resolver la fecha base y construir filtros SQL dinámicos.

use chrono::{Local, NaiveDate};

pub const MESES_ES: [&str; 12] = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/// Resuelve la fecha base: usa `fecha_base` si viene en formato "YYYY-MM-DD", si no usa hoy.
pub fn resolver_fecha(fecha_base: &Option<String>) -> NaiveDate {
    match fecha_base.as_deref() {
        Some(f) => NaiveDate::parse_from_str(f, "%Y-%m-%d")
            .unwrap_or_else(|_| Local::now().date_naive()),
        None => Local::now().date_naive(),
    }
}

/// Genera la cláusula WHERE extra para el filtro de facturable (con " AND " inicial).
/// Devuelve cadena vacía si `facturable` es `None`.
pub fn filtro_facturable(facturable: Option<bool>) -> String {
    match facturable {
        None => String::new(),
        Some(f) => format!(" AND p.facturable = {}", if f { 1 } else { 0 }),
    }
}

/// Devuelve el campo de total a sumar según si hay filtro de facturable.
/// - Sin filtro → `t.total` (campo ya calculado en el ticket)
/// - Con filtro → `tp.subtotal` (sum de líneas filtradas)
pub fn campo_total(facturable: Option<bool>) -> &'static str {
    if facturable.is_none() {
        "t.total"
    } else {
        "tp.subtotal"
    }
}

/// Devuelve los JOINs necesarios cuando se filtra por facturable.
pub fn joins_facturable(facturable: Option<bool>) -> &'static str {
    if facturable.is_some() {
        "\n               JOIN ticket_producto tp ON t.id = tp.ticket_id\n               JOIN producto p ON tp.producto_id = p.id"
    } else {
        ""
    }
}
