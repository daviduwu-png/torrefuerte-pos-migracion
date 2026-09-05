//reporte_ventas_anuales — últimos 5 años desde la fecha base.

use super::utils::{campo_total, filtro_facturable, joins_facturable, resolver_fecha};
use crate::commands::AppState;
use crate::models::*;
use chrono::Datelike;
use rusqlite::params;
use tauri::State;

/// Obtener ventas anuales (últimos 5 años desde la fecha base).
#[tauri::command]
pub fn reporte_ventas_anuales(
    state: State<AppState>,
    facturable: Option<bool>,
    fecha_base: Option<String>,
) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();

    let base = resolver_fecha(&fecha_base);
    let año_base = base.year();

    let query_tmpl = format!(
        r#"SELECT COALESCE(SUM({campo}), 0)
           FROM ticket t{joins}
           WHERE strftime('%Y', t.fecha) = ?{filtro}"#,
        campo = campo_total(facturable),
        joins = joins_facturable(facturable),
        filtro = filtro_facturable(facturable),
    );

    let mut labels = Vec::new();
    let mut ventas = Vec::new();

    for i in (0..5).rev() {
        let año = año_base - i;
        labels.push(año.to_string());

        let año_str = año.to_string();
        let total: f64 = conn
            .query_row(&query_tmpl, params![año_str], |row| row.get(0))
            .unwrap_or(0.0);

        ventas.push(total);
    }

    ApiResponse::success("Ventas anuales", VentasDiarias { labels, ventas })
}
