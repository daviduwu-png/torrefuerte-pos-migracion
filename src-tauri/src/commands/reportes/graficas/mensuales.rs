//reporte_ventas_mensuales — últimos 12 meses desde la fecha base.

use super::utils::{campo_total, filtro_facturable, joins_facturable, resolver_fecha, MESES_ES};
use crate::commands::AppState;
use crate::models::*;
use chrono::{Datelike, Duration};
use rusqlite::params;
use tauri::State;

/// Obtener ventas mensuales (últimos 12 meses desde la fecha base).
#[tauri::command]
pub fn reporte_ventas_mensuales(
    state: State<AppState>,
    facturable: Option<bool>,
    fecha_base: Option<String>,
) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();

    let base = resolver_fecha(&fecha_base);

    let query_tmpl = format!(
        r#"SELECT COALESCE(SUM({campo}), 0)
           FROM ticket t{joins}
           WHERE strftime('%Y-%m', t.fecha) = ?{filtro}"#,
        campo = campo_total(facturable),
        joins = joins_facturable(facturable),
        filtro = filtro_facturable(facturable),
    );

    let mut labels = Vec::new();
    let mut ventas = Vec::new();

    for i in (0..12).rev() {
        let fecha = base - Duration::days(i * 30);
        let mes = fecha.month() as usize - 1;
        let año = fecha.year();

        labels.push(format!("{} {}", MESES_ES[mes], año));

        let mes_str = fecha.format("%Y-%m").to_string();
        let total: f64 = conn
            .query_row(&query_tmpl, params![mes_str], |row| row.get(0))
            .unwrap_or(0.0);

        ventas.push(total);
    }

    ApiResponse::success("Ventas mensuales", VentasDiarias { labels, ventas })
}
