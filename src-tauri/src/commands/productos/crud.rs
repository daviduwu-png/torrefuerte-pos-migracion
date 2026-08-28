use crate::commands::AppState;
use crate::models::*;
use rusqlite::params;
use tauri::State;

/// Crear nuevo producto
#[tauri::command]
pub fn ingresar_producto(producto: ProductoInput, state: State<AppState>) -> ApiResponse<i64> {
    let conn = state.db.conn.lock().unwrap();

    // Validar tipo_medida
    if !TIPOS_MEDIDA.contains(&producto.tipo_medida.as_str()) {
        return ApiResponse::error(&format!(
            "Tipo de medida inválido. Valores válidos: {}",
            TIPOS_MEDIDA.join(", ")
        ));
    }

    // Verificar código de barras único
    if let Some(ref codigo) = producto.codigo_barras {
        if !codigo.is_empty() {
            let exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM producto WHERE codigo_barras = ?",
                    params![codigo],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            if exists > 0 {
                return ApiResponse::error("El código de barras ya existe");
            }
        }
    }

    // Verificar código interno único
    if let Some(ref codigo) = producto.codigo_interno {
        if !codigo.is_empty() {
            let exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM producto WHERE codigo_interno = ?",
                    params![codigo],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            if exists > 0 {
                return ApiResponse::error("El código interno ya existe");
            }
        }
    }

    let marca = producto.marca.map(|m| m.to_uppercase());
    let proveedor = producto
        .proveedor
        .map(|p| p.to_uppercase())
        .unwrap_or_else(|| "MANUAL".to_string());

    let result = conn.execute(
        r#"INSERT INTO producto (codigo_barras, codigo_interno, nombre, descripcion, marca, 
                                  proveedor, tipo_medida, categoria_id, precio_compra, precio_venta, 
                                  precio_mayoreo, precio_distribuidor, facturable, stock,
                                  precio_compra_incluye_iva)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        params![
            producto.codigo_barras,
            producto.codigo_interno,
            producto.nombre,
            producto.descripcion,
            marca,
            proveedor,
            producto.tipo_medida,
            producto.categoria_id,
            producto.precio_compra,
            producto.precio_venta,
            producto.precio_mayoreo,
            producto.precio_distribuidor,
            if producto.facturable { 1 } else { 0 },
            producto.stock,
            if producto.precio_compra_incluye_iva { 1 } else { 0 }
        ]
    );

    match result {
        Ok(_) => {
            let id = conn.last_insert_rowid();
            ApiResponse::success("Producto ingresado exitosamente", id)
        }
        Err(e) => ApiResponse::error(&format!("Error al ingresar producto: {}", e)),
    }
}

/// Actualizar producto existente
#[tauri::command]
pub fn guardar_producto(producto: ProductoInput, state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();

    let id = match producto.id {
        Some(id) => id,
        None => return ApiResponse::error("ID de producto requerido"),
    };

    // Validar tipo_medida
    if !TIPOS_MEDIDA.contains(&producto.tipo_medida.as_str()) {
        return ApiResponse::error(&format!(
            "Tipo de medida inválido. Valores válidos: {}",
            TIPOS_MEDIDA.join(", ")
        ));
    }

    // Verificar código de barras único (excluyendo el actual)
    if let Some(ref codigo) = producto.codigo_barras {
        if !codigo.is_empty() {
            let exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM producto WHERE codigo_barras = ? AND id != ?",
                    params![codigo, id],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            if exists > 0 {
                return ApiResponse::error("El código de barras ya está asignado a otro producto");
            }
        }
    }

    let marca = producto.marca.map(|m| m.to_uppercase());
    let proveedor = producto
        .proveedor
        .map(|p| p.to_uppercase())
        .unwrap_or_else(|| "MANUAL".to_string());

    let result = conn.execute(
        r#"UPDATE producto SET 
               codigo_barras = ?, codigo_interno = ?, nombre = ?, descripcion = ?, 
               marca = ?, proveedor = ?, tipo_medida = ?, categoria_id = ?, 
               precio_compra = ?, precio_venta = ?, precio_mayoreo = ?, 
               precio_distribuidor = ?, facturable = ?, stock = ?,
               precio_compra_incluye_iva = ?
           WHERE id = ?"#,
        params![
            producto.codigo_barras,
            producto.codigo_interno,
            producto.nombre,
            producto.descripcion,
            marca,
            proveedor,
            producto.tipo_medida,
            producto.categoria_id,
            producto.precio_compra,
            producto.precio_venta,
            producto.precio_mayoreo,
            producto.precio_distribuidor,
            if producto.facturable { 1 } else { 0 },
            producto.stock,
            if producto.precio_compra_incluye_iva { 1 } else { 0 },
            id
        ],
    );

    match result {
        Ok(_) => ApiResponse::success("Producto actualizado correctamente", ()),
        Err(e) => ApiResponse::error(&format!("Error al actualizar: {}", e)),
    }
}

/// Eliminar producto
#[tauri::command]
pub fn eliminar_producto(id: i64, state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();

    // Verificar que el producto existe
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM producto WHERE id = ?",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if exists == 0 {
        return ApiResponse::error("El producto no existe");
    }

    // Verificar que no tenga ventas asociadas
    let ventas: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM ticket_producto WHERE producto_id = ?",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if ventas > 0 {
        return ApiResponse::error("No se puede eliminar: el producto tiene ventas asociadas");
    }

    let result = conn.execute("DELETE FROM producto WHERE id = ?", params![id]);

    match result {
        Ok(_) => ApiResponse::success("Producto eliminado correctamente", ()),
        Err(e) => ApiResponse::error(&format!("Error al eliminar: {}", e)),
    }
}

/// Actualizar solo el campo `facturable` de uno o varios productos (batch)
#[tauri::command]
pub fn actualizar_facturable_producto(
    cambios: Vec<ActualizarFacturableInput>,
    state: State<AppState>,
) -> ApiResponse<i64> {
    let mut conn = state.db.conn.lock().unwrap();
    let tx = match conn.transaction() {
        Ok(tx) => tx,
        Err(e) => return ApiResponse::error(&format!("Error al iniciar transacción: {}", e)),
    };

    let mut actualizados = 0i64;
    for cambio in &cambios {
        let res = tx.execute(
            "UPDATE producto SET facturable = ? WHERE id = ?",
            params![if cambio.facturable { 1 } else { 0 }, cambio.id],
        );
        match res {
            Ok(n) => actualizados += n as i64,
            Err(e) => {
                return ApiResponse::error(&format!(
                    "Error actualizando producto {}: {}",
                    cambio.id, e
                ))
            }
        }
    }

    match tx.commit() {
        Ok(_) => ApiResponse::success(
            &format!("{} productos actualizados", actualizados),
            actualizados,
        ),
        Err(e) => ApiResponse::error(&format!("Error al confirmar cambios: {}", e)),
    }
}
