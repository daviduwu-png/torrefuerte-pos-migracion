use crate::commands::AppState;
use crate::models::*;
use rusqlite::params;
use tauri::State;

/// Importar productos masivos (Específico para catálogo TRUPER)
#[tauri::command]
pub fn importar_productos_truper(
    productos: Vec<ProductoInput>,
    state: State<AppState>,
) -> ApiResponse<String> {
    let mut conn = state.db.conn.lock().unwrap();

    // Iniciar transacción para mejorar rendimiento y consistencia
    let tx = match conn.transaction() {
        Ok(tx) => tx,
        Err(e) => return ApiResponse::error(&format!("Error al iniciar transacción: {}", e)),
    };

    let mut inserted = 0;
    let mut updated = 0;
    let mut skipped = 0;

    {
        // Preparar statements
        let mut check_stmt = tx
            .prepare("SELECT id, proveedor FROM producto WHERE codigo_interno = ?")
            .unwrap();

        // Nota: Asumimos que los parametros coinciden con los del execute
        let mut insert_stmt = tx
            .prepare(
                r#"INSERT INTO producto (
                codigo_barras, codigo_interno, nombre, descripcion, marca, 
                proveedor, tipo_medida, categoria_id, precio_compra, precio_venta, 
                precio_mayoreo, precio_distribuidor, facturable, stock
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
            )
            .unwrap();

        let mut update_stmt = tx
            .prepare(
                r#"UPDATE producto SET 
                codigo_barras = ?, nombre = ?, descripcion = ?, marca = ?, 
                tipo_medida = ?, precio_compra = ?, precio_venta = ?, 
                precio_mayoreo = ?, precio_distribuidor = ?
               WHERE id = ?"#,
            )
            .unwrap();

        for p in productos {
            let codigo_interno = match &p.codigo_interno {
                Some(c) if !c.is_empty() => c,
                _ => continue,
            };

            // Verificar si existe
            let existing: Option<(i64, String)> = check_stmt
                .query_row(params![codigo_interno], |row| {
                    Ok((row.get(0)?, row.get(1)?))
                })
                .ok();

            if let Some((id, proveedor)) = existing {
                if proveedor.to_uppercase() == "TRUPER" {
                    let marca = p.marca.as_ref().map(|m| m.to_uppercase());

                    update_stmt
                        .execute(params![
                            p.codigo_barras,
                            p.nombre,
                            p.descripcion,
                            marca,
                            p.tipo_medida,
                            p.precio_compra,
                            p.precio_venta,
                            p.precio_mayoreo,
                            p.precio_distribuidor,
                            id
                        ])
                        .unwrap_or_default();
                    updated += 1;
                } else {
                    skipped += 1;
                }
            } else {
                let marca = p.marca.as_ref().map(|m| m.to_uppercase());
                let proveedor = p
                    .proveedor
                    .clone()
                    .unwrap_or_else(|| "TRUPER".to_string())
                    .to_uppercase();

                insert_stmt
                    .execute(params![
                        p.codigo_barras,
                        p.codigo_interno,
                        p.nombre,
                        p.descripcion,
                        marca,
                        proveedor,
                        p.tipo_medida,
                        p.categoria_id,
                        p.precio_compra,
                        p.precio_venta,
                        p.precio_mayoreo,
                        p.precio_distribuidor,
                        if p.facturable { 1 } else { 0 },
                        p.stock
                    ])
                    .unwrap_or_default();
                inserted += 1;
            }
        }
    }

    match tx.commit() {
        Ok(_) => ApiResponse::success(
            &format!("Importación completada: {} insertados, {} actualizados, {} omitidos (no son Truper)", inserted, updated, skipped),
            format!("Insertados: {}, Actualizados: {}", inserted, updated)
        ),
        Err(e) => ApiResponse::error(&format!("Error al confirmar transacción: {}", e)),
    }
}
