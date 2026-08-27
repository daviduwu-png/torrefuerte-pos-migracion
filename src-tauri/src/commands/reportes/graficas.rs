use crate::commands::productos::AppState;
use crate::models::*;
use chrono::{Datelike, Duration, Local};
use rusqlite::params;
use tauri::State;

/// Obtener ventas diarias (últimos 7 días)
#[tauri::command]
pub fn reporte_ventas_diarias(state: State<AppState>) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();

    // Nombres de días en español
    let dias_es = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    let mut labels = Vec::new();
    let mut ventas_data = std::collections::HashMap::new();

    // Inicializar últimos 7 días
    let hoy = Local::now().date_naive();
    for i in (0..7).rev() {
        let fecha = hoy - Duration::days(i);
        let fecha_str = fecha.format("%Y-%m-%d").to_string();
        let dia_idx = fecha.weekday().num_days_from_sunday() as usize;
        let dia_num = fecha.format("%d").to_string();
        labels.push(format!("{} {}", dias_es[dia_idx], dia_num));
        ventas_data.insert(fecha_str, 0.0);
    }

    // Obtener ventas reales
    let mut stmt = conn
        .prepare(
            r#"SELECT DATE(fecha) as fecha, SUM(total) as total_ventas
           FROM ticket
           WHERE fecha >= datetime('now', '-7 days')
           GROUP BY DATE(fecha)"#,
        )
        .unwrap();

    let _ = stmt
        .query_map([], |row| {
            let fecha: String = row.get(0)?;
            let total: f64 = row.get(1)?;
            if let Some(v) = ventas_data.get_mut(&fecha) {
                *v = total;
            }
            Ok(())
        })
        .unwrap()
        .count();

    // Convertir a array ordenado
    let ventas: Vec<f64> = (0..7)
        .rev()
        .map(|i| {
            let fecha = (hoy - Duration::days(i)).format("%Y-%m-%d").to_string();
            *ventas_data.get(&fecha).unwrap_or(&0.0)
        })
        .collect();

    ApiResponse::success("Ventas diarias", VentasDiarias { labels, ventas })
}

/// Obtener ventas semanales (últimas 4 semanas de Lunes a Sábado)
#[tauri::command]
pub fn reporte_ventas_semanales(state: State<AppState>) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();

    let mut labels: Vec<String> = Vec::new();
    let mut ventas: Vec<f64> = Vec::new();

    let hoy = Local::now().date_naive();
    let dias_desde_lunes = hoy.weekday().num_days_from_monday() as i64;
    // Si hoy es domingo (dias_desde_lunes == 6), tomamos el lunes de la semana que terminó ayer.
    // Si hoy es lunes a sábado (0..=5), tomamos el lunes de esta misma semana.
    let lunes_actual = if dias_desde_lunes == 6 {
        hoy - Duration::days(6)
    } else {
        hoy - Duration::days(dias_desde_lunes)
    };

    let meses_es = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    for i in (0..4).rev() {
        let lunes = lunes_actual - Duration::weeks(i);
        let sabado = lunes + Duration::days(5); // Lunes + 5 días = Sábado de la semana laboral

        let mes_lunes = meses_es[lunes.month() as usize - 1];
        let mes_sabado = meses_es[sabado.month() as usize - 1];

        // Pre-materializamos los DelayedFormat a String antes del format!
        // para evitar la ambigüedad de tipo con DelayedFormat en if/else.
        let d_lunes = lunes.format("%d").to_string();
        let d_sabado = sabado.format("%d").to_string();
        if mes_lunes == mes_sabado {
            labels.push(format!("{} al {} {}", d_lunes, d_sabado, mes_lunes));
        } else {
            labels.push(format!("{} {} - {} {}", d_lunes, mes_lunes, d_sabado, mes_sabado));
        }

        let total: f64 = conn
            .query_row(
                r#"SELECT COALESCE(SUM(total), 0) FROM ticket 
               WHERE DATE(fecha) BETWEEN ? AND ?"#,
                params![
                    lunes.format("%Y-%m-%d").to_string(),
                    sabado.format("%Y-%m-%d").to_string()
                ],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        ventas.push(total);
    }

    ApiResponse::success("Ventas semanales", VentasDiarias { labels, ventas })
}

/// Obtener ventas mensuales (últimos 12 meses)
#[tauri::command]
pub fn reporte_ventas_mensuales(state: State<AppState>) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();

    let meses_es = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];

    let mut labels = Vec::new();
    let mut ventas = Vec::new();

    let hoy = Local::now().date_naive();

    for i in (0..12).rev() {
        let fecha = hoy - Duration::days(i * 30);
        let mes = fecha.month() as usize - 1;
        let año = fecha.year();

        labels.push(format!("{} {}", meses_es[mes], año));

        let total: f64 = conn
            .query_row(
                r#"SELECT COALESCE(SUM(total), 0) FROM ticket 
               WHERE strftime('%Y-%m', fecha) = ?"#,
                params![fecha.format("%Y-%m").to_string()],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        ventas.push(total);
    }

    ApiResponse::success("Ventas mensuales", VentasDiarias { labels, ventas })
}

/// Obtener ventas anuales (últimos 5 años)
#[tauri::command]
pub fn reporte_ventas_anuales(state: State<AppState>) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();

    let mut labels = Vec::new();
    let mut ventas = Vec::new();

    let año_actual = Local::now().year();

    for i in (0..5).rev() {
        let año = año_actual - i;
        labels.push(año.to_string());

        let total: f64 = conn
            .query_row(
                r#"SELECT COALESCE(SUM(total), 0) FROM ticket 
               WHERE strftime('%Y', fecha) = ?"#,
                params![año.to_string()],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        ventas.push(total);
    }

    ApiResponse::success("Ventas anuales", VentasDiarias { labels, ventas })
}

/// Estadísticas generales para el dashboard
#[tauri::command]
pub fn obtener_estadisticas(state: State<AppState>) -> ApiResponse<serde_json::Value> {
    let conn = state.db.conn.lock().unwrap();
    let fecha_hoy = Local::now().format("%Y-%m-%d").to_string();

    // Ventas de hoy
    let ventas_hoy: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total), 0) FROM ticket WHERE DATE(fecha) = ?",
            params![&fecha_hoy],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Tickets de hoy
    let tickets_hoy: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM ticket WHERE DATE(fecha) = ?",
            params![&fecha_hoy],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Productos vendidos hoy (suma de cantidades en ticket_producto de hoy)
    let productos_vendidos_hoy: f64 = conn
        .query_row(
            r#"SELECT COALESCE(SUM(tp.cantidad), 0) 
           FROM ticket_producto tp
           JOIN ticket t ON tp.ticket_id = t.id
           WHERE DATE(t.fecha) = ?"#,
            params![&fecha_hoy],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Productos con stock bajo (< 10)
    let stock_bajo: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM producto WHERE stock < 10",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Devoluciones de hoy
    let devoluciones_hoy: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM devolucion WHERE DATE(fecha) = ?",
            params![&fecha_hoy],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let stats = serde_json::json!({
        "ventas_hoy": ventas_hoy,
        "tickets_hoy": tickets_hoy,
        "productos_vendidos_hoy": productos_vendidos_hoy,
        "stock_bajo": stock_bajo,
        "devoluciones_hoy": devoluciones_hoy,
        "ticket_promedio": if tickets_hoy > 0 { ventas_hoy / tickets_hoy as f64 } else { 0.0 }
    });

    ApiResponse::success("Estadísticas obtenidas", stats)
}
