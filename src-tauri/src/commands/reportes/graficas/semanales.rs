// reporte_ventas_semanales — últimas 4 semanas (Lunes–Sábado) desde la fecha base.

use super::utils::{campo_total, filtro_facturable, joins_facturable, resolver_fecha, MESES_ES};
use crate::commands::AppState;
use crate::models::*;
use chrono::{Datelike, Duration};
use rusqlite::params;
use tauri::State;

/// Obtener ventas semanales (últimas 4 semanas Lunes–Sábado desde la fecha base).
#[tauri::command]
pub fn reporte_ventas_semanales(
    state: State<AppState>,
    facturable: Option<bool>,
    fecha_base: Option<String>,
) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();

    let base = resolver_fecha(&fecha_base);
    let dias_desde_lunes = base.weekday().num_days_from_monday() as i64;
    
    let lunes_base = if dias_desde_lunes == 6 {
        base - Duration::days(6)
    } else {
        base - Duration::days(dias_desde_lunes)
    };

    let query_tmpl = format!(
        r#"SELECT COALESCE(SUM({campo}), 0)
           FROM ticket t{joins}
           WHERE DATE(t.fecha) BETWEEN ? AND ?{filtro}"#,
        campo = campo_total(facturable),
        joins = joins_facturable(facturable),
        filtro = filtro_facturable(facturable),
    );

    let mut labels = Vec::new();
    let mut ventas = Vec::new();

    for i in (0..4).rev() {
        let lunes = lunes_base - Duration::weeks(i);
        let sabado = lunes + Duration::days(5); // semana laboral Lun–Sáb

        let mes_lunes = MESES_ES[lunes.month() as usize - 1];
        let mes_sabado = MESES_ES[sabado.month() as usize - 1];

        let d_lunes = lunes.format("%d").to_string();
        let d_sabado = sabado.format("%d").to_string();
        if mes_lunes == mes_sabado {
            labels.push(format!("{} al {} {}", d_lunes, d_sabado, mes_lunes));
        } else {
            labels.push(format!("{} {} - {} {}", d_lunes, mes_lunes, d_sabado, mes_sabado));
        }

        let lunes_str = lunes.format("%Y-%m-%d").to_string();
        let sabado_str = sabado.format("%Y-%m-%d").to_string();

        let total: f64 = conn
            .query_row(&query_tmpl, params![lunes_str, sabado_str], |row| row.get(0))
            .unwrap_or(0.0);

        ventas.push(total);
    }

    ApiResponse::success("Ventas semanales", VentasDiarias { labels, ventas })
}
