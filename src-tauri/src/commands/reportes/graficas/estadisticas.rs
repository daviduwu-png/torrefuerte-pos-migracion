//obtener_estadisticas — estadísticas del día seleccionado para las StatCards del dashboard.

use super::utils::filtro_facturable;
use crate::commands::AppState;
use crate::models::*;
use chrono::Local;
use rusqlite::params;
use tauri::State;

/// Estadísticas del día seleccionado (ventas, tickets, productos vendidos, stock bajo, devoluciones).
#[tauri::command]
pub fn obtener_estadisticas(
    state: State<AppState>,
    facturable: Option<bool>,
    fecha_base: Option<String>,
) -> ApiResponse<serde_json::Value> {
    let conn = state.db.conn.lock().unwrap();

    let fecha_dia = match fecha_base.as_deref() {
        Some(f) if !f.is_empty() => f.to_string(),
        _ => Local::now().format("%Y-%m-%d").to_string(),
    };

    let filtro_f = filtro_facturable(facturable);

    // ventas del dia
    let ventas_hoy: f64 = if facturable.is_none() {
        conn.query_row(
            "SELECT COALESCE(SUM(total), 0) FROM ticket WHERE DATE(fecha) = ?",
            params![&fecha_dia],
            |row| row.get(0),
        )
        .unwrap_or(0.0)
    } else {
        let q = format!(
            r#"SELECT COALESCE(SUM(tp.subtotal), 0)
               FROM ticket t
               JOIN ticket_producto tp ON t.id = tp.ticket_id
               JOIN producto p ON tp.producto_id = p.id
               WHERE DATE(t.fecha) = ?{}"#,
            filtro_f
        );
        conn.query_row(&q, params![&fecha_dia], |row| row.get(0))
            .unwrap_or(0.0)
    };

    // Tickets del día
    let tickets_hoy: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM ticket WHERE DATE(fecha) = ?",
            params![&fecha_dia],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Productos vendidos del día
    let productos_vendidos_hoy: f64 = if facturable.is_none() {
        conn.query_row(
            r#"SELECT COALESCE(SUM(tp.cantidad), 0)
               FROM ticket_producto tp
               JOIN ticket t ON tp.ticket_id = t.id
               WHERE DATE(t.fecha) = ?"#,
            params![&fecha_dia],
            |row| row.get(0),
        )
        .unwrap_or(0.0)
    } else {
        let q = format!(
            r#"SELECT COALESCE(SUM(tp.cantidad), 0)
               FROM ticket_producto tp
               JOIN ticket t ON tp.ticket_id = t.id
               JOIN producto p ON tp.producto_id = p.id
               WHERE DATE(t.fecha) = ?{}"#,
            filtro_f
        );
        conn.query_row(&q, params![&fecha_dia], |row| row.get(0))
            .unwrap_or(0.0)
    };

    // Stock bajo (< 10 unidades)
    let stock_bajo: i64 = if facturable.is_none() {
        conn.query_row(
            "SELECT COUNT(*) FROM producto WHERE stock < 10",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0)
    } else {
        let q = format!(
            "SELECT COUNT(*) FROM producto WHERE stock < 10{}",
            filtro_f.replace(" AND p.", " AND ")
        );
        conn.query_row(&q, [], |row| row.get(0)).unwrap_or(0)
    };

    // devoluciones del dia
    let devoluciones_hoy: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM devolucion WHERE DATE(fecha) = ?",
            params![&fecha_dia],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let stats = serde_json::json!({
        "ventas_hoy":            ventas_hoy,
        "tickets_hoy":           tickets_hoy,
        "productos_vendidos_hoy":productos_vendidos_hoy,
        "stock_bajo":            stock_bajo,
        "devoluciones_hoy":      devoluciones_hoy,
        "ticket_promedio": if tickets_hoy > 0 { ventas_hoy / tickets_hoy as f64 } else { 0.0 }
    });

    ApiResponse::success("Estadísticas obtenidas", stats)
}
