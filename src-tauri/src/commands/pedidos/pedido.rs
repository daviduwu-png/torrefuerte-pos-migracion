use crate::commands::productos::AppState;
use crate::models::*;
use chrono::Local;
use rusqlite::params;
use tauri::State;

// ==================== PEDIDOS A PROVEEDOR ====================

/// Crear y persistir un pedido a proveedor con sus items
#[tauri::command]
pub fn guardar_pedido(
    pedido: PedidoInput,
    state: State<AppState>,
) -> ApiResponse<i64> {
    let conn = state.db.conn.lock().unwrap();

    if pedido.proveedor.trim().is_empty() {
        return ApiResponse::error("El proveedor es requerido");
    }
    if pedido.items.is_empty() {
        return ApiResponse::error("El pedido debe tener al menos un producto");
    }

    let usuario_id = state.current_user.lock().unwrap()
        .as_ref()
        .map(|u| u.id);
    let fecha = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if let Err(e) = conn.execute("BEGIN TRANSACTION", []) {
        return ApiResponse::error(&format!("Error al iniciar transacción: {}", e));
    }

    // Insertar cabecera del pedido
    let insert_result = conn.execute(
        r#"INSERT INTO pedido_proveedor (proveedor, marca, notas, estado, usuario_id, fecha)
           VALUES (?1, ?2, ?3, 'pendiente', ?4, ?5)"#,
        params![
            pedido.proveedor.trim().to_uppercase(),
            pedido.marca,
            pedido.notas,
            usuario_id,
            fecha,
        ],
    );

    if let Err(e) = insert_result {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al crear pedido: {}", e));
    }

    let pedido_id = conn.last_insert_rowid();

    // Insertar items
    for item in &pedido.items {
        if item.cantidad_pedida <= 0.0 {
            conn.execute("ROLLBACK", []).ok();
            return ApiResponse::error("La cantidad pedida debe ser mayor a 0");
        }

        if let Err(e) = conn.execute(
            r#"INSERT INTO pedido_producto
                   (pedido_id, producto_id, cantidad_pedida, cantidad_recibida, precio_estimado)
               VALUES (?1, ?2, ?3, 0, ?4)"#,
            params![
                pedido_id,
                item.producto_id,
                item.cantidad_pedida,
                item.precio_estimado,
            ],
        ) {
            conn.execute("ROLLBACK", []).ok();
            return ApiResponse::error(&format!("Error al agregar producto al pedido: {}", e));
        }
    }

    if let Err(e) = conn.execute("COMMIT", []) {
        return ApiResponse::error(&format!("Error al confirmar: {}", e));
    }

    ApiResponse::success("Pedido guardado", pedido_id)
}

/// Listar pedidos con filtros opcionales
#[tauri::command]
pub fn listar_pedidos(
    proveedor: Option<String>,
    estado: Option<String>,
    state: State<AppState>,
) -> ApiResponse<Vec<PedidoProveedor>> {
    let conn = state.db.conn.lock().unwrap();

    let proveedor_pattern = proveedor.map(|p| format!("%{}%", p.to_uppercase()));

    let sql = r#"
        SELECT p.id, p.proveedor, p.marca, p.notas, p.estado, p.usuario_id, p.fecha,
               COUNT(pp.producto_id) as total_items
        FROM pedido_proveedor p
        LEFT JOIN pedido_producto pp ON p.id = pp.pedido_id
        WHERE (?1 IS NULL OR p.proveedor LIKE ?1)
          AND (?2 IS NULL OR p.estado = ?2)
        GROUP BY p.id
        ORDER BY p.fecha DESC
        LIMIT 500
    "#;

    let mut stmt = conn.prepare(sql).unwrap();

    let pedidos: Vec<PedidoProveedor> = stmt
        .query_map(params![proveedor_pattern, estado], |row| {
            Ok(PedidoProveedor {
                id: row.get(0)?,
                proveedor: row.get(1)?,
                marca: row.get(2)?,
                notas: row.get(3)?,
                estado: row.get(4)?,
                usuario_id: row.get(5)?,
                fecha: row.get(6)?,
                total_items: row.get(7)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success(
        &format!("{} pedidos encontrados", pedidos.len()),
        pedidos,
    )
}

/// Obtener pedido con su detalle completo de productos
#[tauri::command]
pub fn obtener_pedido(
    id: i64,
    state: State<AppState>,
) -> ApiResponse<PedidoConProductos> {
    let conn = state.db.conn.lock().unwrap();

    let pedido = match conn.query_row(
        r#"SELECT p.id, p.proveedor, p.marca, p.notas, p.estado, p.usuario_id, p.fecha,
                  COUNT(pp.producto_id)
           FROM pedido_proveedor p
           LEFT JOIN pedido_producto pp ON p.id = pp.pedido_id
           WHERE p.id = ?
           GROUP BY p.id"#,
        params![id],
        |row| {
            Ok(PedidoProveedor {
                id: row.get(0)?,
                proveedor: row.get(1)?,
                marca: row.get(2)?,
                notas: row.get(3)?,
                estado: row.get(4)?,
                usuario_id: row.get(5)?,
                fecha: row.get(6)?,
                total_items: row.get(7)?,
            })
        },
    ) {
        Ok(p) => p,
        Err(_) => return ApiResponse::error("Pedido no encontrado"),
    };

    let mut prod_stmt = conn
        .prepare(
            r#"SELECT pp.producto_id, p.nombre, p.codigo_interno,
                      pp.cantidad_pedida, pp.cantidad_recibida, pp.precio_estimado
               FROM pedido_producto pp
               JOIN producto p ON pp.producto_id = p.id
               WHERE pp.pedido_id = ?
               ORDER BY p.nombre"#,
        )
        .unwrap();

    let productos: Vec<PedidoProducto> = prod_stmt
        .query_map(params![id], |row| {
            Ok(PedidoProducto {
                producto_id: row.get(0)?,
                nombre: row.get(1)?,
                codigo_interno: row.get(2)?,
                cantidad_pedida: row.get(3)?,
                cantidad_recibida: row.get(4)?,
                precio_estimado: row.get(5)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success("Pedido encontrado", PedidoConProductos { pedido, productos })
}

/// Registrar recepción de mercancía (actualiza stock de los productos)
///
/// # Seguridad
/// - Solo procesa pedidos en estado `pendiente` o `enviado`
/// - Usa transacción — si falla cualquier item, revierte todo
/// - El stock se incrementa con la `cantidad_recibida`, no con la `cantidad_pedida`
#[tauri::command]
pub fn recibir_pedido(
    pedido_id: i64,
    items: Vec<RecepcionItem>,
    state: State<AppState>,
) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();

    // Verificar estado del pedido
    let estado_actual: String = match conn.query_row(
        "SELECT estado FROM pedido_proveedor WHERE id = ?",
        params![pedido_id],
        |row| row.get(0),
    ) {
        Ok(s) => s,
        Err(_) => return ApiResponse::error("Pedido no encontrado"),
    };

    if estado_actual == "recibido" {
        return ApiResponse::error("Este pedido ya fue recibido anteriormente");
    }
    if estado_actual == "cancelado" {
        return ApiResponse::error("No se puede recibir un pedido cancelado");
    }

    if let Err(e) = conn.execute("BEGIN TRANSACTION", []) {
        return ApiResponse::error(&format!("Error al iniciar transacción: {}", e));
    }

    // Procesar cada item recibido
    for item in &items {
        if item.cantidad_recibida < 0.0 {
            conn.execute("ROLLBACK", []).ok();
            return ApiResponse::error("La cantidad recibida no puede ser negativa");
        }

        // Verificar que el item pertenece al pedido
        let cantidad_pedida: Option<f64> = conn
            .query_row(
                "SELECT cantidad_pedida FROM pedido_producto WHERE pedido_id = ? AND producto_id = ?",
                params![pedido_id, item.producto_id],
                |row| row.get(0),
            )
            .ok();

        if cantidad_pedida.is_none() {
            conn.execute("ROLLBACK", []).ok();
            return ApiResponse::error(&format!(
                "El producto ID {} no pertenece a este pedido",
                item.producto_id
            ));
        }

        // Actualizar cantidad_recibida en pedido_producto
        if let Err(e) = conn.execute(
            "UPDATE pedido_producto SET cantidad_recibida = ?1 WHERE pedido_id = ?2 AND producto_id = ?3",
            params![item.cantidad_recibida, pedido_id, item.producto_id],
        ) {
            conn.execute("ROLLBACK", []).ok();
            return ApiResponse::error(&format!("Error al actualizar item: {}", e));
        }

        // Incrementar stock del producto
        if item.cantidad_recibida > 0.0 {
            if let Err(e) = conn.execute(
                "UPDATE producto SET stock = stock + ?1 WHERE id = ?2",
                params![item.cantidad_recibida, item.producto_id],
            ) {
                conn.execute("ROLLBACK", []).ok();
                return ApiResponse::error(&format!("Error al actualizar stock: {}", e));
            }
        }
    }

    // Marcar pedido como recibido
    if let Err(e) = conn.execute(
        "UPDATE pedido_proveedor SET estado = 'recibido' WHERE id = ?",
        params![pedido_id],
    ) {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al actualizar pedido: {}", e));
    }

    match conn.execute("COMMIT", []) {
        Ok(_) => ApiResponse::success("Mercancía recibida — stock actualizado", ()),
        Err(e) => ApiResponse::error(&format!("Error al confirmar: {}", e)),
    }
}

/// Cambiar el estado de un pedido
#[tauri::command]
pub fn cambiar_estado_pedido(
    id: i64,
    nuevo_estado: String,
    state: State<AppState>,
) -> ApiResponse<()> {
    let estados_validos = ["pendiente", "enviado", "recibido", "cancelado"];
    if !estados_validos.contains(&nuevo_estado.as_str()) {
        return ApiResponse::error(&format!(
            "Estado inválido. Valores válidos: {}",
            estados_validos.join(", ")
        ));
    }

    let conn = state.db.conn.lock().unwrap();

    // No permitir revertir un pedido ya recibido
    let estado_actual: String = conn
        .query_row(
            "SELECT estado FROM pedido_proveedor WHERE id = ?",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or_default();

    if estado_actual == "recibido" && nuevo_estado != "recibido" {
        return ApiResponse::error(
            "No se puede cambiar el estado de un pedido que ya fue recibido",
        );
    }

    match conn.execute(
        "UPDATE pedido_proveedor SET estado = ?1 WHERE id = ?2",
        params![nuevo_estado, id],
    ) {
        Ok(rows) if rows == 0 => ApiResponse::error("Pedido no encontrado"),
        Ok(_) => ApiResponse::success("Estado actualizado", ()),
        Err(e) => ApiResponse::error(&format!("Error: {}", e)),
    }
}
