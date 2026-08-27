use crate::commands::productos::AppState;
use crate::models::*;
use chrono::Local;
use rusqlite::params;
use rust_xlsxwriter::{Format, Workbook};
use tauri::State;

use super::utils::get_home_dir;

/// Obtener resumen del corte de caja para un día específico.
/// Si `fecha` es None o vacío, se usa el día actual.
/// `fecha` debe tener formato "YYYY-MM-DD".
#[tauri::command]
pub fn obtener_corte_caja(
    fecha: Option<String>,
    state: State<AppState>,
) -> ApiResponse<CorteCaja> {
    let conn = state.db.conn.lock().unwrap();

    // Determinar la fecha a consultar
    let fecha_consulta = match &fecha {
        Some(f) if !f.trim().is_empty() => f.trim().to_string(),
        _ => Local::now().format("%Y-%m-%d").to_string(),
    };

    // Etiqueta de hora para el campo `fecha` del resultado
    // IMPORTANTE: mantener formato "YYYY-MM-DD HH:MM:SS" para que
    // parseFechaLocal() del frontend lo interprete correctamente.
    let fecha_hora_resultado = format!(
        "{} {}",
        fecha_consulta,
        Local::now().format("%H:%M:%S")
    );

    let result = conn.query_row(
        r#"SELECT 
               COUNT(DISTINCT t.id) as total_tickets,
               COALESCE(SUM(DISTINCT t.total), 0) as total_venta,
               COALESCE(SUM(CASE WHEN t.metodo_pago = 'Efectivo' THEN t.total ELSE 0 END), 0) as total_efectivo,
               COALESCE(SUM(CASE WHEN t.metodo_pago = 'Tarjeta' THEN t.total ELSE 0 END), 0) as total_tarjeta,
               COALESCE(SUM(CASE WHEN t.metodo_pago = 'Transferencia' THEN t.total ELSE 0 END), 0) as total_transferencia,
               COALESCE((
                   SELECT SUM(tp2.subtotal)
                   FROM ticket t2
                   JOIN ticket_producto tp2 ON t2.id = tp2.ticket_id
                   JOIN producto p2 ON tp2.producto_id = p2.id
                   WHERE DATE(t2.fecha) = ? AND p2.facturable = 1
               ), 0) as total_facturable,
               COALESCE((
                   SELECT SUM(tp3.subtotal)
                   FROM ticket t3
                   JOIN ticket_producto tp3 ON t3.id = tp3.ticket_id
                   JOIN producto p3 ON tp3.producto_id = p3.id
                   WHERE DATE(t3.fecha) = ? AND p3.facturable = 0
               ), 0) as total_no_facturable,
               MIN(t.id) as ticket_inicial,
               MAX(t.id) as ticket_final
           FROM ticket t
           WHERE DATE(t.fecha) = ?"#,
        params![fecha_consulta, fecha_consulta, fecha_consulta],
        |row| {
            Ok(CorteCaja {
                total_tickets: row.get(0)?,
                total_venta: row.get(1)?,
                total_efectivo: row.get(2)?,
                total_tarjeta: row.get(3)?,
                total_transferencia: row.get(4)?,
                total_facturable: row.get(5)?,
                total_no_facturable: row.get(6)?,
                ticket_inicial: row.get(7)?,
                ticket_final: row.get(8)?,
                fecha: fecha_hora_resultado.clone(),
            })
        },
    );

    match result {
        Ok(corte) => {
            if corte.total_tickets == 0 {
                ApiResponse::error(&format!(
                    "No hay ventas registradas el {} para el corte",
                    fecha_consulta
                ))
            } else {
                ApiResponse::success("Corte de caja obtenido", corte)
            }
        }
        Err(e) => ApiResponse::error(&format!("Error al obtener corte: {}", e)),
    }
}

/// Generar Excel de corte de caja para un día específico.
/// Si `fecha` es None o vacío, usa el día actual.
#[tauri::command]
pub fn exportar_corte_excel(
    fecha: Option<String>,
    state: State<AppState>,
) -> ApiResponse<String> {
    let conn = state.db.conn.lock().unwrap();

    let fecha_consulta = match &fecha {
        Some(f) if !f.trim().is_empty() => f.trim().to_string(),
        _ => Local::now().format("%Y-%m-%d").to_string(),
    };

    // Obtener datos del día
    let mut stmt = conn
        .prepare(
            r#"SELECT 
               t.id AS ticket_id, t.folio_fiscal, t.fecha, t.metodo_pago, t.total,
               u.nombre AS usuario_nombre, tp.producto_id, p.nombre AS producto_nombre,
               p.precio_compra, tp.cantidad, tp.precio_unitario, tp.subtotal,
               COALESCE(tp.costo_historico, 0) as costo_historico
           FROM ticket t
           LEFT JOIN usuario u ON t.usuario_id = u.id
           JOIN ticket_producto tp ON t.id = tp.ticket_id
           JOIN producto p ON tp.producto_id = p.id
           WHERE DATE(t.fecha) = ?
           ORDER BY t.id ASC"#,
        )
        .unwrap();

    let ventas: Vec<(
        i64,
        String,
        String,
        String,
        f64,
        Option<String>,
        i64,
        String,
        f64,
        f64,
        f64,
        f64,
        f64,
    )> = stmt
        .query_map(params![&fecha_consulta], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
                row.get(10)?,
                row.get(11)?,
                row.get(12)?,
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    if ventas.is_empty() {
        return ApiResponse::error(&format!("No hay ventas para exportar el {}", fecha_consulta));
    }

    // ── Directorio de cortes: ~/TorreFuerte/Cortes/ ──────────────────────────
    let cortes_dir = get_home_dir().join("TorreFuerte").join("Cortes");
    std::fs::create_dir_all(&cortes_dir).ok();

    let file_name = format!("Corte_Caja_{}.xlsx", fecha_consulta);
    let file_path = cortes_dir.join(&file_name);

    // Crear workbook
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Corte del Dia").ok();

    // Formato de encabezados
    let header_format = Format::new().set_bold();

    // Headers
    let headers = [
        "Ticket ID",
        "Folio",
        "Fecha",
        "Método Pago",
        "Total Ticket",
        "Usuario",
        "Prod. ID",
        "Producto",
        "Cant.",
        "Precio Venta",
        "Subtotal",
        "Costo Unit. (Hist/Act)",
        "Costo Total",
        "Ganancia",
    ];

    for (col, header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, col as u16, *header, &header_format)
            .ok();
    }

    // Datos
    let mut row = 1u32;
    let mut total_ventas = 0.0;
    let mut total_ganancia = 0.0;
    let mut last_ticket_id = 0i64;

    for venta in &ventas {
        let precio_compra_actual = venta.8;
        let cantidad        = venta.9;
        let precio_venta    = venta.10;
        let subtotal        = venta.11;
        let costo_historico = venta.12;

        // Priorizar costo histórico si existe (> 0), si no usar el actual
        let costo_unit = if costo_historico > 0.0 { costo_historico } else { precio_compra_actual };
        let costo_total = cantidad * costo_unit;
        let ganancia    = subtotal - costo_total;

        worksheet.write_number(row, 0, venta.0 as f64).ok();
        worksheet.write_string(row, 1, &venta.1).ok();
        worksheet.write_string(row, 2, &venta.2).ok();
        worksheet.write_string(row, 3, &venta.3).ok();
        worksheet.write_number(row, 4, venta.4).ok();
        worksheet
            .write_string(row, 5, venta.5.as_deref().unwrap_or(""))
            .ok();
        worksheet.write_number(row, 6, venta.6 as f64).ok();
        worksheet.write_string(row, 7, &venta.7).ok();
        worksheet.write_number(row, 8, cantidad).ok();
        worksheet.write_number(row, 9, precio_venta).ok();
        worksheet.write_number(row, 10, subtotal).ok();
        worksheet.write_number(row, 11, costo_unit).ok();
        worksheet.write_number(row, 12, costo_total).ok();
        worksheet.write_number(row, 13, ganancia).ok();

        if last_ticket_id != venta.0 {
            total_ventas += venta.4;
            last_ticket_id = venta.0;
        }
        total_ganancia += ganancia;

        row += 1;
    }

    // Totales
    row += 1;
    worksheet
        .write_string_with_format(row, 3, "TOTAL VENTAS:", &header_format)
        .ok();
    worksheet
        .write_number_with_format(row, 4, total_ventas, &header_format)
        .ok();
    worksheet
        .write_string_with_format(row, 12, "TOTAL GANANCIA:", &header_format)
        .ok();
    worksheet
        .write_number_with_format(row, 13, total_ganancia, &header_format)
        .ok();

    // Guardar archivo
    if let Err(e) = workbook.save(&file_path) {
        return ApiResponse::error(&format!("Error al guardar Excel: {}", e));
    }

    // ── Rotación: mantener solo los últimos 7 cortes ──────────────────────────
    // Los nombres tienen formato "Corte_Caja_YYYY-MM-DD.xlsx", por lo que
    // ordenar alfabéticamente = ordenar cronológicamente.
    const MAX_CORTES: usize = 7;
    if let Ok(entries) = std::fs::read_dir(&cortes_dir) {
        let mut archivos: Vec<std::path::PathBuf> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.extension().and_then(|e| e.to_str()) == Some("xlsx")
                    && p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with("Corte_Caja_"))
                        .unwrap_or(false)
            })
            .collect();

        // Orden alfabético ascendente (más viejo primero)
        archivos.sort();

        // Eliminar los más viejos si hay más de MAX_CORTES
        if archivos.len() > MAX_CORTES {
            let a_eliminar = archivos.len() - MAX_CORTES;
            for viejo in archivos.iter().take(a_eliminar) {
                let _ = std::fs::remove_file(viejo);
            }
        }
    }

    ApiResponse::success(
        &format!("Excel guardado en: {}", file_path.display()),
        file_path.to_string_lossy().to_string(),
    )
}
