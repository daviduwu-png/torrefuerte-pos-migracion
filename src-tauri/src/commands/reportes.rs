use crate::commands::productos::AppState;
use crate::models::*;
use chrono::{Datelike, Duration, Local};
use rusqlite::params;
use rust_xlsxwriter::{Format, Workbook};
use std::path::PathBuf;
use tauri::State;

// ==================== CORTE DE CAJA ====================

/// Obtener resumen del día para corte de caja
#[tauri::command]
pub fn obtener_corte_caja(state: State<AppState>) -> ApiResponse<CorteCaja> {
    let conn = state.db.conn.lock().unwrap();
    let fecha_hoy = Local::now().format("%Y-%m-%d").to_string();
    let fecha_hora_actual = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    let result = conn.query_row(
        r#"SELECT 
               COUNT(*) as total_tickets,
               COALESCE(SUM(total), 0) as total_venta,
               COALESCE(SUM(CASE WHEN metodo_pago = 'Efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
               COALESCE(SUM(CASE WHEN metodo_pago = 'Tarjeta' THEN total ELSE 0 END), 0) as total_tarjeta,
               COALESCE(SUM(CASE WHEN metodo_pago = 'Transferencia' THEN total ELSE 0 END), 0) as total_transferencia,
               MIN(id) as ticket_inicial,
               MAX(id) as ticket_final
           FROM ticket 
           WHERE DATE(fecha) = ?"#,
        params![fecha_hoy],
        |row| {
            Ok(CorteCaja {
                total_tickets: row.get(0)?,
                total_venta: row.get(1)?,
                total_efectivo: row.get(2)?,
                total_tarjeta: row.get(3)?,
                total_transferencia: row.get(4)?,
                ticket_inicial: row.get(5)?,
                ticket_final: row.get(6)?,
                fecha: fecha_hora_actual.clone(),
            })
        }
    );
    
    match result {
        Ok(corte) => {
            if corte.total_tickets == 0 {
                ApiResponse::error("No hay ventas registradas hoy para el corte")
            } else {
                ApiResponse::success("Corte de caja obtenido", corte)
            }
        }
        Err(e) => ApiResponse::error(&format!("Error al obtener corte: {}", e)),
    }
}

/// Generar Excel de corte de caja
#[tauri::command]
pub fn exportar_corte_excel(state: State<AppState>) -> ApiResponse<String> {
    let conn = state.db.conn.lock().unwrap();
    let fecha_hoy = Local::now().format("%Y-%m-%d").to_string();
    
    // Obtener datos del día
    let mut stmt = conn.prepare(
        r#"SELECT 
               t.id AS ticket_id, t.folio_fiscal, t.fecha, t.metodo_pago, t.total,
               u.nombre AS usuario_nombre, tp.producto_id, p.nombre AS producto_nombre,
               p.precio_compra, tp.cantidad, tp.precio_unitario, tp.subtotal
           FROM ticket t
           LEFT JOIN usuario u ON t.usuario_id = u.id
           JOIN ticket_producto tp ON t.id = tp.ticket_id
           JOIN producto p ON tp.producto_id = p.id
           WHERE DATE(t.fecha) = ?
           ORDER BY t.id ASC"#
    ).unwrap();
    
    let ventas: Vec<(i64, String, String, String, f64, Option<String>, i64, String, f64, f64, f64, f64)> = stmt
        .query_map(params![&fecha_hoy], |row| {
            Ok((
                row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?,
                row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?, row.get(9)?,
                row.get(10)?, row.get(11)?
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();
    
    if ventas.is_empty() {
        return ApiResponse::error("No hay ventas para exportar");
    }
    
    // Crear directorio de reportes
    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:/Users/Default".to_string());
    let reportes_dir = PathBuf::from(&user_profile).join("Documents/Reportes_TorreFuerte");
    std::fs::create_dir_all(&reportes_dir).ok();
    
    let file_name = format!("Corte_Caja_{}.xlsx", fecha_hoy);
    let file_path = reportes_dir.join(&file_name);
    
    // Crear workbook
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Corte del Dia").ok();
    
    // Formato de encabezados
    let header_format = Format::new().set_bold();
    
    // Headers
    let headers = [
        "Ticket ID", "Folio", "Fecha", "Método Pago", "Total Ticket", "Usuario",
        "Prod. ID", "Producto", "Cant.", "Precio Venta", "Subtotal",
        "Costo Unit.", "Costo Total", "Ganancia"
    ];
    
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format).ok();
    }
    
    // Datos
    let mut row = 1u32;
    let mut total_ventas = 0.0;
    let mut total_ganancia = 0.0;
    let mut last_ticket_id = 0i64;
    
    for venta in &ventas {
        let costo_total = venta.9 * venta.8; // cantidad * precio_compra
        let ganancia = venta.11 - costo_total; // subtotal - costo_total
        
        worksheet.write_number(row, 0, venta.0 as f64).ok();
        worksheet.write_string(row, 1, &venta.1).ok();
        worksheet.write_string(row, 2, &venta.2).ok();
        worksheet.write_string(row, 3, &venta.3).ok();
        worksheet.write_number(row, 4, venta.4).ok();
        worksheet.write_string(row, 5, venta.5.as_deref().unwrap_or("")).ok();
        worksheet.write_number(row, 6, venta.6 as f64).ok();
        worksheet.write_string(row, 7, &venta.7).ok();
        worksheet.write_number(row, 8, venta.9).ok();
        worksheet.write_number(row, 9, venta.10).ok();
        worksheet.write_number(row, 10, venta.11).ok();
        worksheet.write_number(row, 11, venta.8).ok();
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
    worksheet.write_string_with_format(row, 3, "TOTAL VENTAS:", &header_format).ok();
    worksheet.write_number_with_format(row, 4, total_ventas, &header_format).ok();
    worksheet.write_string_with_format(row, 12, "TOTAL GANANCIA:", &header_format).ok();
    worksheet.write_number_with_format(row, 13, total_ganancia, &header_format).ok();
    
    // Guardar archivo
    if let Err(e) = workbook.save(&file_path) {
        return ApiResponse::error(&format!("Error al guardar Excel: {}", e));
    }
    
    ApiResponse::success(
        &format!("Excel guardado en: {}", file_path.display()),
        file_path.to_string_lossy().to_string()
    )
}

/// Generar Reporte Financiero completo (Ventas Totales, Facturables, Devoluciones)
#[tauri::command]
pub fn exportar_reporte_financiero(
    fecha_inicio: String,
    fecha_fin: String,
    state: State<AppState>
) -> ApiResponse<String> {
    let conn = state.db.conn.lock().unwrap();

    // 1. Preparar datos de Ventas Totales
    // Se extrae explícitamente:
    // - tp.precio_unitario AS precio_venta_ticket (Precio histórico de venta)
    // - tp.costo_historico AS costo_historico (Costo histórico guardado)
    // - p.precio_compra AS precio_compra_actual (Costo actual referencia)
    let mut stmt = conn.prepare(
        r#"SELECT 
            t.id, t.folio_fiscal, t.fecha, t.metodo_pago, t.total,
            u.nombre, tp.producto_id, p.nombre, 
            COALESCE(p.precio_compra, 0) as precio_compra_actual,
            tp.cantidad, 
            tp.precio_unitario as precio_venta_ticket, 
            tp.subtotal,
            COALESCE(tp.costo_historico, 0) as costo_historico
        FROM ticket t
        LEFT JOIN usuario u ON t.usuario_id = u.id
        JOIN ticket_producto tp ON t.id = tp.ticket_id
        JOIN producto p ON tp.producto_id = p.id
        WHERE DATE(t.fecha) BETWEEN ? AND ?
        ORDER BY t.fecha DESC"#
    ).unwrap();

    let ventas_totales: Vec<(i64, String, String, String, f64, Option<String>, i64, String, f64, f64, f64, f64, f64)> = stmt
        .query_map(params![fecha_inicio, fecha_fin], |row| {
            Ok((
                row.get(0)?, // id
                row.get(1)?, // folio
                row.get(2)?, // fecha
                row.get(3)?, // metodo
                row.get(4)?, // total
                row.get(5)?, // usuario
                row.get(6)?, // prod_id
                row.get(7)?, // prod_nombre
                row.get(8)?, // precio_compra_actual
                row.get(9)?, // cantidad
                row.get(10)?, // precio_venta_ticket
                row.get(11)?, // subtotal
                row.get(12)?  // costo_historico
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    // 2. Preparar datos de Facturables
    let mut stmt_fact = conn.prepare(
        r#"SELECT 
            t.id, t.folio_fiscal, t.fecha, t.metodo_pago,
            p.id, p.nombre, 
            COALESCE(p.precio_compra, 0) as precio_compra_actual,
            tp.cantidad, 
            tp.precio_unitario as precio_venta_ticket, 
            tp.subtotal,
            COALESCE(tp.costo_historico, 0) as costo_historico
        FROM ticket t
        JOIN ticket_producto tp ON t.id = tp.ticket_id
        JOIN producto p ON tp.producto_id = p.id
        WHERE DATE(t.fecha) BETWEEN ? AND ? AND p.facturable = 1"#
    ).unwrap();

    let facturables: Vec<(i64, String, String, String, i64, String, f64, f64, f64, f64, f64)> = stmt_fact
        .query_map(params![fecha_inicio, fecha_fin], |row| {
            Ok((
                row.get(0)?, // id
                row.get(1)?, // folio
                row.get(2)?, // fecha
                row.get(3)?, // metodo
                row.get(4)?, // prod_id
                row.get(5)?, // prod_nombre
                row.get(6)?, // precio_compra_actual
                row.get(7)?, // cantidad
                row.get(8)?, // precio_venta_ticket
                row.get(9)?, // subtotal
                row.get(10)? // costo_historico
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    // 3. Preparar datos de Devoluciones (Sin cambios estructurales query)
    let mut stmt_dev = conn.prepare(
        r#"SELECT 
            d.ticket_id, t.folio_fiscal, d.fecha, p.nombre,
            d.cantidad, d.motivo, u.nombre
        FROM devolucion d
        JOIN ticket t ON d.ticket_id = t.id
        JOIN producto p ON d.producto_id = p.id
        LEFT JOIN usuario u ON d.usuario_id = u.id
        WHERE DATE(d.fecha) BETWEEN ? AND ?
        ORDER BY d.fecha DESC"#
    ).unwrap();

    let devoluciones: Vec<(i64, String, String, String, i64, Option<String>, Option<String>)> = stmt_dev
        .query_map(params![fecha_inicio, fecha_fin], |row| {
            Ok((
                row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?,
                row.get(4)?, row.get(5)?, row.get(6)?
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    // --- Generación Excel ---
    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:/Users/Default".to_string());
    let reportes_dir = PathBuf::from(&user_profile).join("Documents/Reportes_TorreFuerte");
    std::fs::create_dir_all(&reportes_dir).ok();
    
    let file_name = format!("Reporte_Financiero_Del_{}_al_{}.xlsx", fecha_inicio, fecha_fin);
    let file_path = reportes_dir.join(&file_name);
    
    let mut workbook = Workbook::new();
    let header_format = Format::new().set_bold();

    // Hoja 1: Ventas Totales
    let sheet1 = workbook.add_worksheet();
    sheet1.set_name("Ventas Totales").ok();
    let h1 = [
        "Ticket ID", "Folio", "Fecha", "Método Pago", "Total Ticket", "Usuario", 
        "Prod. ID", "Producto", "Cant.", "Precio Venta", "Subtotal", 
        "Costo Unit. (Hist/Act)", "Ganancia Unit.", "Costo Total", "Ganancia Total"
    ];
    for (i, h) in h1.iter().enumerate() { sheet1.write_string_with_format(0, i as u16, *h, &header_format).ok(); }
    
    let mut row = 1;
    let mut total_periodo = 0.0;
    let mut total_ganancia_global = 0.0;
    let mut current_ticket_id = -1;

    for v in &ventas_totales {
        let precio_venta_ticket = v.10; // Precio real de venta (Ticket)
        let precio_compra_actual = v.8; // Costo actual (BD)
        let costo_historico = v.12;     // Costo guardado al momento de venta
        
        // Priorizar costo histórico si existe (> 0), si no usar actual
        let costo_final = if costo_historico > 0.0 { costo_historico } else { precio_compra_actual };

        let cantidad = v.9;
        let subtotal_venta = v.11;
        
        // Cálculos
        let ganancia_unitaria = precio_venta_ticket - costo_final;
        let costo_total = cantidad * costo_final;
        let ganancia_total = subtotal_venta - costo_total; 

        sheet1.write_number(row, 0, v.0 as f64).ok();
        sheet1.write_string(row, 1, &v.1).ok();
        sheet1.write_string(row, 2, &v.2).ok();
        sheet1.write_string(row, 3, &v.3).ok();
        sheet1.write_number(row, 4, v.4).ok();
        sheet1.write_string(row, 5, v.5.as_deref().unwrap_or("")).ok();
        sheet1.write_number(row, 6, v.6 as f64).ok();
        sheet1.write_string(row, 7, &v.7).ok();
        sheet1.write_number(row, 8, cantidad).ok();
        sheet1.write_number(row, 9, precio_venta_ticket).ok();
        sheet1.write_number(row, 10, subtotal_venta).ok();
        sheet1.write_number(row, 11, costo_final).ok();
        sheet1.write_number(row, 12, ganancia_unitaria).ok();
        sheet1.write_number(row, 13, costo_total).ok();
        sheet1.write_number(row, 14, ganancia_total).ok();

        if current_ticket_id != v.0 {
            total_periodo += v.4;
            current_ticket_id = v.0;
        }
        total_ganancia_global += ganancia_total;
        row += 1;
    }
    
    row += 1;
    sheet1.write_string_with_format(row, 3, "TOTAL VENTAS:", &header_format).ok();
    sheet1.write_number_with_format(row, 4, total_periodo, &header_format).ok();
    sheet1.write_string_with_format(row, 13, "TOTAL GANANCIA:", &header_format).ok();
    sheet1.write_number_with_format(row, 14, total_ganancia_global, &header_format).ok();


    // Hoja 2: Solo Facturables
    let sheet2 = workbook.add_worksheet();
    sheet2.set_name("Solo Facturables").ok();
    let h2 = [
        "Ticket ID", "Folio", "Fecha", "Método", "ID Prod", "Producto", "Cant", "Precio Venta", "Subtotal",
        "Costo Unit. (Hist/Act)", "Ganancia Unit.", "Costo Total", "Ganancia Total"
    ];
    for (i, h) in h2.iter().enumerate() { sheet2.write_string_with_format(0, i as u16, *h, &header_format).ok(); }

    row = 1;
    let mut total_facturable = 0.0;
    let mut total_ganancia_fact = 0.0;

    for f in &facturables {
        let precio_venta_ticket = f.8;
        let precio_compra_actual = f.6;
        let costo_historico = f.10;
        
        let costo_final = if costo_historico > 0.0 { costo_historico } else { precio_compra_actual };
        
        let cantidad = f.7;
        let subtotal_venta = f.9;

        let ganancia_unitaria = precio_venta_ticket - costo_final;
        let costo_total = cantidad * costo_final;
        let ganancia_total = subtotal_venta - costo_total;

        sheet2.write_number(row, 0, f.0 as f64).ok();   // Ticket ID
        sheet2.write_string(row, 1, &f.1).ok();         // Folio
        sheet2.write_string(row, 2, &f.2).ok();         // Fecha
        sheet2.write_string(row, 3, &f.3).ok();         // Metodo
        sheet2.write_number(row, 4, f.4 as f64).ok();   // ID Prod
        sheet2.write_string(row, 5, &f.5).ok();         // Producto
        sheet2.write_number(row, 6, cantidad).ok();
        sheet2.write_number(row, 7, precio_venta_ticket).ok();
        sheet2.write_number(row, 8, subtotal_venta).ok();
        
        sheet2.write_number(row, 9, costo_final).ok();      // Costo Unit (Hist/Act)
        sheet2.write_number(row, 10, ganancia_unitaria).ok(); 
        sheet2.write_number(row, 11, costo_total).ok();
        sheet2.write_number(row, 12, ganancia_total).ok();

        total_facturable += subtotal_venta; 
        total_ganancia_fact += ganancia_total;
        row += 1;
    }
    
    row += 1;
    sheet2.write_string_with_format(row, 7, "TOTAL FACTURABLE:", &header_format).ok();
    sheet2.write_number_with_format(row, 8, total_facturable, &header_format).ok();
    sheet2.write_string_with_format(row, 11, "GANANCIA FACT:", &header_format).ok();
    sheet2.write_number_with_format(row, 12, total_ganancia_fact, &header_format).ok();


    // Hoja 3: Devoluciones
    let sheet3 = workbook.add_worksheet();
    sheet3.set_name("Devoluciones").ok();
    let h3 = [
        "Ticket ID", "Folio Orig.", "Fecha Devolución", "Producto", "Cant. Devuelta", "Motivo", "Usuario"
    ];
    for (i, h) in h3.iter().enumerate() { sheet3.write_string_with_format(0, i as u16, *h, &header_format).ok(); }

    row = 1;
    for d in &devoluciones {
        sheet3.write_number(row, 0, d.0 as f64).ok();
        sheet3.write_string(row, 1, &d.1).ok();
        sheet3.write_string(row, 2, &d.2).ok();
        sheet3.write_string(row, 3, &d.3).ok();
        sheet3.write_number(row, 4, d.4 as f64).ok();
        sheet3.write_string(row, 5, d.5.as_deref().unwrap_or("")).ok();
        sheet3.write_string(row, 6, d.6.as_deref().unwrap_or("")).ok();
        row += 1;
    }

    if let Err(e) = workbook.save(&file_path) {
        return ApiResponse::error(&format!("Error al guardar reporte financiero: {}", e));
    }

    ApiResponse::success(
        &format!("Reporte generado exitosamente en: {}", file_path.display()),
        file_path.to_string_lossy().to_string()
    )
}


// ==================== REPORTES ====================

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
    let mut stmt = conn.prepare(
        r#"SELECT DATE(fecha) as fecha, SUM(total) as total_ventas
           FROM ticket
           WHERE fecha >= datetime('now', '-7 days')
           GROUP BY DATE(fecha)"#
    ).unwrap();
    
    let _ = stmt.query_map([], |row| {
        let fecha: String = row.get(0)?;
        let total: f64 = row.get(1)?;
        if let Some(v) = ventas_data.get_mut(&fecha) {
            *v = total;
        }
        Ok(())
    }).unwrap().count();
    
    // Convertir a array ordenado
    let ventas: Vec<f64> = (0..7).rev().map(|i| {
        let fecha = (hoy - Duration::days(i)).format("%Y-%m-%d").to_string();
        *ventas_data.get(&fecha).unwrap_or(&0.0)
    }).collect();
    
    ApiResponse::success("Ventas diarias", VentasDiarias { labels, ventas })
}

/// Obtener ventas semanales (últimas 4 semanas)
#[tauri::command]
pub fn reporte_ventas_semanales(state: State<AppState>) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();
    
    let mut labels = Vec::new();
    let mut ventas = Vec::new();
    
    for i in (0..4).rev() {
        let inicio = Local::now().date_naive() - Duration::weeks(i + 1);
        let fin = Local::now().date_naive() - Duration::weeks(i);
        
        labels.push(format!("Semana {}", 4 - i));
        
        let total: f64 = conn.query_row(
            r#"SELECT COALESCE(SUM(total), 0) FROM ticket 
               WHERE DATE(fecha) BETWEEN ? AND ?"#,
            params![inicio.format("%Y-%m-%d").to_string(), fin.format("%Y-%m-%d").to_string()],
            |row| row.get(0)
        ).unwrap_or(0.0);
        
        ventas.push(total);
    }
    
    ApiResponse::success("Ventas semanales", VentasDiarias { labels, ventas })
}

/// Obtener ventas mensuales (últimos 12 meses)
#[tauri::command]
pub fn reporte_ventas_mensuales(state: State<AppState>) -> ApiResponse<VentasDiarias> {
    let conn = state.db.conn.lock().unwrap();
    
    let meses_es = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    let mut labels = Vec::new();
    let mut ventas = Vec::new();
    
    let hoy = Local::now().date_naive();
    
    for i in (0..12).rev() {
        let fecha = hoy - Duration::days(i * 30);
        let mes = fecha.month() as usize - 1;
        let año = fecha.year();
        
        labels.push(format!("{} {}", meses_es[mes], año));
        
        let total: f64 = conn.query_row(
            r#"SELECT COALESCE(SUM(total), 0) FROM ticket 
               WHERE strftime('%Y-%m', fecha) = ?"#,
            params![fecha.format("%Y-%m").to_string()],
            |row| row.get(0)
        ).unwrap_or(0.0);
        
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
        
        let total: f64 = conn.query_row(
            r#"SELECT COALESCE(SUM(total), 0) FROM ticket 
               WHERE strftime('%Y', fecha) = ?"#,
            params![año.to_string()],
            |row| row.get(0)
        ).unwrap_or(0.0);
        
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
    let ventas_hoy: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total), 0) FROM ticket WHERE DATE(fecha) = ?",
        params![&fecha_hoy],
        |row| row.get(0)
    ).unwrap_or(0.0);
    
    // Tickets de hoy
    let tickets_hoy: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ticket WHERE DATE(fecha) = ?",
        params![&fecha_hoy],
        |row| row.get(0)
    ).unwrap_or(0);
    
    // Productos vendidos hoy (suma de cantidades en ticket_producto de hoy)
    let productos_vendidos_hoy: f64 = conn.query_row(
        r#"SELECT COALESCE(SUM(tp.cantidad), 0) 
           FROM ticket_producto tp
           JOIN ticket t ON tp.ticket_id = t.id
           WHERE DATE(t.fecha) = ?"#,
        params![&fecha_hoy],
        |row| row.get(0)
    ).unwrap_or(0.0);
    
    // Productos con stock bajo (< 10)
    let stock_bajo: i64 = conn.query_row(
        "SELECT COUNT(*) FROM producto WHERE stock < 10",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    // Devoluciones de hoy
    let devoluciones_hoy: i64 = conn.query_row(
        "SELECT COUNT(*) FROM devolucion WHERE DATE(fecha) = ?",
        params![&fecha_hoy],
        |row| row.get(0)
    ).unwrap_or(0);
    
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
