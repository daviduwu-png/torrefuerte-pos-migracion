//reporte_ventas_diarias — últimos 7 días desde la fecha base.

use super::utils::{campo_total, filtro_facturable, joins_facturable, resolver_fecha};
use crate::commands::AppState;
use crate::models::*;
use chrono::{Datelike, Duration};
use rusqlite::params;
use tauri::State;

/// Obtener ventas diarias (últimos 7 días desde la fecha base).
#[tauri::command]
pub fn reporte_ventas_diarias(
    state: State<AppState>,
    facturable: Option<bool>,
    fecha_base: Option<String>,
) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();
    let dias_es = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    let base = resolver_fecha(&fecha_base);
    let mut labels = Vec::new();
    let mut ventas_data = std::collections::HashMap::new();

    for i in (0..7).rev() {
        let fecha = base - Duration::days(i);
        let fecha_str = fecha.format("%Y-%m-%d").to_string();
        let dia_idx = fecha.weekday().num_days_from_sunday() as usize;
        let dia_num = fecha.format("%d").to_string();
        labels.push(format!("{} {}", dias_es[dia_idx], dia_num));
        ventas_data.insert(fecha_str, 0.0);
    }

    let inicio_str = (base - Duration::days(6)).format("%Y-%m-%d").to_string();
    let fin_str = base.format("%Y-%m-%d").to_string();

    let query = format!(
        r#"SELECT DATE(t.fecha) as fecha, SUM({campo}) as total_ventas
               FROM ticket t{joins}
               WHERE DATE(t.fecha) BETWEEN ? AND ?{filtro}
               GROUP BY DATE(t.fecha)"#,
        campo = campo_total(facturable),
        joins = joins_facturable(facturable),
        filtro = filtro_facturable(facturable),
    );

    let mut stmt = conn.prepare(&query).unwrap();
    let _ = stmt
        .query_map(params![inicio_str, fin_str], |row| {
            let fecha: String = row.get(0)?;
            let total: f64 = row.get(1)?;
            if let Some(v) = ventas_data.get_mut(&fecha) {
                *v = total;
            }
            Ok(())
        })
        .unwrap()
        .count();

    let ventas: Vec<f64> = (0..7)
        .rev()
        .map(|i| {
            let fecha = (base - Duration::days(i)).format("%Y-%m-%d").to_string();
            *ventas_data.get(&fecha).unwrap_or(&0.0)
        })
        .collect();

    ApiResponse::success("Ventas diarias", VentasDiarias { labels, ventas })
}
