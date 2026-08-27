use crate::commands::productos::AppState;
use crate::models::*;
use rusqlite::params;
use rust_xlsxwriter::{Format, Workbook};
use tauri::State;

use super::utils::get_home_dir;

/// Generar Reporte Financiero completo (Ventas Totales, Facturables, Devoluciones)
#[tauri::command]
pub fn exportar_reporte_financiero(
    fecha_inicio: String,
    fecha_fin: String,
    state: State<AppState>,
) -> ApiResponse<String> {
    let conn = state.db.conn.lock().unwrap();

    // 1. Preparar datos de Ventas Totales
    // Se extrae explícitamente:
    // - tp.precio_unitario AS precio_venta_ticket (Precio histórico de venta)
    // - tp.costo_historico AS costo_historico (Costo histórico guardado)
    // - p.precio_compra AS precio_compra_actual (Costo actual referencia)
    let mut stmt = conn
        .prepare(
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
        ORDER BY t.fecha DESC"#,
        )
        .unwrap();

    let ventas_totales: Vec<(
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
        .query_map(params![fecha_inicio, fecha_fin], |row| {
            Ok((
                row.get(0)?,  // id
                row.get(1)?,  // folio
                row.get(2)?,  // fecha
                row.get(3)?,  // metodo
                row.get(4)?,  // total
                row.get(5)?,  // usuario
                row.get(6)?,  // prod_id
                row.get(7)?,  // prod_nombre
                row.get(8)?,  // precio_compra_actual
                row.get(9)?,  // cantidad
                row.get(10)?, // precio_venta_ticket
                row.get(11)?, // subtotal
                row.get(12)?, // costo_historico
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    // 2. Preparar datos de Facturables
    let mut stmt_fact = conn
        .prepare(
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
        WHERE DATE(t.fecha) BETWEEN ? AND ? AND p.facturable = 1"#,
        )
        .unwrap();

    let facturables: Vec<(
        i64,
        String,
        String,
        String,
        i64,
        String,
        f64,
        f64,
        f64,
        f64,
        f64,
    )> = stmt_fact
        .query_map(params![fecha_inicio, fecha_fin], |row| {
            Ok((
                row.get(0)?,  // id
                row.get(1)?,  // folio
                row.get(2)?,  // fecha
                row.get(3)?,  // metodo
                row.get(4)?,  // prod_id
                row.get(5)?,  // prod_nombre
                row.get(6)?,  // precio_compra_actual
                row.get(7)?,  // cantidad
                row.get(8)?,  // precio_venta_ticket
                row.get(9)?,  // subtotal
                row.get(10)?, // costo_historico
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    // 3. Preparar datos de Devoluciones
    let mut stmt_dev = conn
        .prepare(
            r#"SELECT 
            d.ticket_id, t.folio_fiscal, d.fecha, p.nombre,
            d.cantidad, d.motivo, u.nombre
        FROM devolucion d
        JOIN ticket t ON d.ticket_id = t.id
        JOIN producto p ON d.producto_id = p.id
        LEFT JOIN usuario u ON d.usuario_id = u.id
        WHERE DATE(d.fecha) BETWEEN ? AND ?
        ORDER BY d.fecha DESC"#,
        )
        .unwrap();

    let devoluciones: Vec<(
        i64,
        String,
        String,
        String,
        i64,
        Option<String>,
        Option<String>,
    )> = stmt_dev
        .query_map(params![fecha_inicio, fecha_fin], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    // --- Generación Excel ---
    // Directorio de reportes multiplataforma: ~/TorreFuerte/Reportes/
    let reportes_dir = get_home_dir().join("TorreFuerte").join("Reportes");
    std::fs::create_dir_all(&reportes_dir).ok();

    let file_name = format!(
        "Reporte_Financiero_Del_{}_al_{}.xlsx",
        fecha_inicio, fecha_fin
    );
    let file_path = reportes_dir.join(&file_name);

    let mut workbook = Workbook::new();
    let header_format = Format::new().set_bold();

    // Hoja 1: Ventas Totales
    let sheet1 = workbook.add_worksheet();
    sheet1.set_name("Ventas Totales").ok();
    let h1 = [
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
        "Ganancia Unit.",
        "Costo Total",
        "Ganancia Total",
    ];
    for (i, h) in h1.iter().enumerate() {
        sheet1
            .write_string_with_format(0, i as u16, *h, &header_format)
            .ok();
    }

    let mut row = 1u32;
    let mut total_periodo = 0.0;
    let mut total_ganancia_global = 0.0;
    let mut current_ticket_id = -1i64;

    for v in &ventas_totales {
        let precio_venta_ticket = v.10; // Precio real de venta (Ticket)
        let precio_compra_actual = v.8; // Costo actual (BD)
        let costo_historico = v.12;     // Costo guardado al momento de venta

        // Priorizar costo histórico si existe (> 0), si no usar actual
        let costo_final = if costo_historico > 0.0 {
            costo_historico
        } else {
            precio_compra_actual
        };

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
        sheet1
            .write_string(row, 5, v.5.as_deref().unwrap_or(""))
            .ok();
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
    sheet1
        .write_string_with_format(row, 3, "TOTAL VENTAS:", &header_format)
        .ok();
    sheet1
        .write_number_with_format(row, 4, total_periodo, &header_format)
        .ok();
    sheet1
        .write_string_with_format(row, 13, "TOTAL GANANCIA:", &header_format)
        .ok();
    sheet1
        .write_number_with_format(row, 14, total_ganancia_global, &header_format)
        .ok();

    // Hoja 2: Solo Facturables
    let sheet2 = workbook.add_worksheet();
    sheet2.set_name("Solo Facturables").ok();
    let h2 = [
        "Ticket ID",
        "Folio",
        "Fecha",
        "Método",
        "ID Prod",
        "Producto",
        "Cant",
        "Precio Venta",
        "Subtotal",
        "Costo Unit. (Hist/Act)",
        "Ganancia Unit.",
        "Costo Total",
        "Ganancia Total",
    ];
    for (i, h) in h2.iter().enumerate() {
        sheet2
            .write_string_with_format(0, i as u16, *h, &header_format)
            .ok();
    }

    row = 1;
    let mut total_facturable = 0.0;
    let mut total_ganancia_fact = 0.0;

    for f in &facturables {
        let precio_venta_ticket = f.8;
        let precio_compra_actual = f.6;
        let costo_historico = f.10;

        let costo_final = if costo_historico > 0.0 {
            costo_historico
        } else {
            precio_compra_actual
        };

        let cantidad = f.7;
        let subtotal_venta = f.9;

        let ganancia_unitaria = precio_venta_ticket - costo_final;
        let costo_total = cantidad * costo_final;
        let ganancia_total = subtotal_venta - costo_total;

        sheet2.write_number(row, 0, f.0 as f64).ok(); // Ticket ID
        sheet2.write_string(row, 1, &f.1).ok();        // Folio
        sheet2.write_string(row, 2, &f.2).ok();        // Fecha
        sheet2.write_string(row, 3, &f.3).ok();        // Metodo
        sheet2.write_number(row, 4, f.4 as f64).ok();  // ID Prod
        sheet2.write_string(row, 5, &f.5).ok();        // Producto
        sheet2.write_number(row, 6, cantidad).ok();
        sheet2.write_number(row, 7, precio_venta_ticket).ok();
        sheet2.write_number(row, 8, subtotal_venta).ok();
        sheet2.write_number(row, 9, costo_final).ok();         // Costo Unit (Hist/Act)
        sheet2.write_number(row, 10, ganancia_unitaria).ok();
        sheet2.write_number(row, 11, costo_total).ok();
        sheet2.write_number(row, 12, ganancia_total).ok();

        total_facturable += subtotal_venta;
        total_ganancia_fact += ganancia_total;
        row += 1;
    }

    row += 1;
    sheet2
        .write_string_with_format(row, 7, "TOTAL FACTURABLE:", &header_format)
        .ok();
    sheet2
        .write_number_with_format(row, 8, total_facturable, &header_format)
        .ok();
    sheet2
        .write_string_with_format(row, 11, "GANANCIA FACT:", &header_format)
        .ok();
    sheet2
        .write_number_with_format(row, 12, total_ganancia_fact, &header_format)
        .ok();

    // Hoja 3: Devoluciones
    let sheet3 = workbook.add_worksheet();
    sheet3.set_name("Devoluciones").ok();
    let h3 = [
        "Ticket ID",
        "Folio Orig.",
        "Fecha Devolución",
        "Producto",
        "Cant. Devuelta",
        "Motivo",
        "Usuario",
    ];
    for (i, h) in h3.iter().enumerate() {
        sheet3
            .write_string_with_format(0, i as u16, *h, &header_format)
            .ok();
    }

    row = 1;
    for d in &devoluciones {
        sheet3.write_number(row, 0, d.0 as f64).ok();
        sheet3.write_string(row, 1, &d.1).ok();
        sheet3.write_string(row, 2, &d.2).ok();
        sheet3.write_string(row, 3, &d.3).ok();
        sheet3.write_number(row, 4, d.4 as f64).ok();
        sheet3
            .write_string(row, 5, d.5.as_deref().unwrap_or(""))
            .ok();
        sheet3
            .write_string(row, 6, d.6.as_deref().unwrap_or(""))
            .ok();
        row += 1;
    }

    if let Err(e) = workbook.save(&file_path) {
        return ApiResponse::error(&format!("Error al guardar reporte financiero: {}", e));
    }

    ApiResponse::success(
        &format!("Reporte generado exitosamente en: {}", file_path.display()),
        file_path.to_string_lossy().to_string(),
    )
}
