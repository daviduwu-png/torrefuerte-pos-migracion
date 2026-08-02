use crate::commands::productos::AppState;
use crate::models::*;
use chrono::Local;
use rusqlite::params;
use tauri::State;

// ==================== COTIZACIONES ====================

/// Persistir una cotización con sus items
#[tauri::command]
pub fn guardar_cotizacion(
    cotizacion: CotizacionInput,
    state: State<AppState>,
) -> ApiResponse<i64> {
    let conn = state.db.conn.lock().unwrap();

    if cotizacion.items.is_empty() {
        return ApiResponse::error("La cotización debe tener al menos un producto");
    }

    // Calcular total
    let total: f64 = cotizacion.items
        .iter()
        .map(|i| i.cantidad * i.precio_unitario)
        .sum();

    let usuario_id = state.current_user.lock().unwrap()
        .as_ref()
        .map(|u| u.id);
    let fecha = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if let Err(e) = conn.execute("BEGIN TRANSACTION", []) {
        return ApiResponse::error(&format!("Error al iniciar transacción: {}", e));
    }

    // Insertar cabecera
    let insert_result = conn.execute(
        r#"INSERT INTO cotizacion (cliente_id, cliente_ref, total, notas, estado, usuario_id, fecha)
           VALUES (?1, ?2, ?3, ?4, 'vigente', ?5, ?6)"#,
        params![
            cotizacion.cliente_id,
            cotizacion.cliente_ref,
            total,
            cotizacion.notas,
            usuario_id,
            fecha,
        ],
    );

    if let Err(e) = insert_result {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al crear cotización: {}", e));
    }

    let cotizacion_id = conn.last_insert_rowid();

    // Insertar items
    for item in &cotizacion.items {
        let subtotal = item.cantidad * item.precio_unitario;
        if let Err(e) = conn.execute(
            r#"INSERT INTO cotizacion_producto
                   (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal)
               VALUES (?1, ?2, ?3, ?4, ?5)"#,
            params![
                cotizacion_id,
                item.producto_id,
                item.cantidad,
                item.precio_unitario,
                subtotal,
            ],
        ) {
            conn.execute("ROLLBACK", []).ok();
            return ApiResponse::error(&format!("Error al agregar producto: {}", e));
        }
    }

    if let Err(e) = conn.execute("COMMIT", []) {
        return ApiResponse::error(&format!("Error al confirmar: {}", e));
    }

    ApiResponse::success("Cotización guardada", cotizacion_id)
}

/// Listar cotizaciones con filtros opcionales
#[tauri::command]
pub fn listar_cotizaciones(
    cliente_id: Option<i64>,
    estado: Option<String>,
    fecha_inicio: Option<String>,
    fecha_fin: Option<String>,
    state: State<AppState>,
) -> ApiResponse<Vec<Cotizacion>> {
    let conn = state.db.conn.lock().unwrap();

    let (inicio, fin) = match (fecha_inicio, fecha_fin) {
        (Some(i), Some(f)) => (
            format!("{} 00:00:00", i),
            format!("{} 23:59:59", f),
        ),
        _ => {
            // Por defecto: últimos 30 días
            let fin = Local::now().format("%Y-%m-%d 23:59:59").to_string();
            let inicio = Local::now()
                .checked_sub_signed(chrono::Duration::days(30))
                .unwrap_or(Local::now())
                .format("%Y-%m-%d 00:00:00")
                .to_string();
            (inicio, fin)
        }
    };

    let sql = r#"
        SELECT id, cliente_id, cliente_ref, total, notas, estado, usuario_id, fecha
        FROM cotizacion
        WHERE (?1 IS NULL OR cliente_id = ?1)
          AND (?2 IS NULL OR estado = ?2)
          AND fecha BETWEEN ?3 AND ?4
        ORDER BY fecha DESC
        LIMIT 500
    "#;

    let mut stmt = conn.prepare(sql).unwrap();

    let cotizaciones: Vec<Cotizacion> = stmt
        .query_map(params![cliente_id, estado, inicio, fin], |row| {
            Ok(Cotizacion {
                id: row.get(0)?,
                cliente_id: row.get(1)?,
                cliente_ref: row.get(2)?,
                total: row.get(3)?,
                notas: row.get(4)?,
                estado: row.get(5)?,
                usuario_id: row.get(6)?,
                fecha: row.get(7)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success(
        &format!("{} cotizaciones encontradas", cotizaciones.len()),
        cotizaciones,
    )
}

/// Obtener cotización con su detalle de productos
#[tauri::command]
pub fn obtener_cotizacion(
    id: i64,
    state: State<AppState>,
) -> ApiResponse<CotizacionConProductos> {
    let conn = state.db.conn.lock().unwrap();

    let cotizacion = match conn.query_row(
        "SELECT id, cliente_id, cliente_ref, total, notas, estado, usuario_id, fecha
         FROM cotizacion WHERE id = ?",
        params![id],
        |row| {
            Ok(Cotizacion {
                id: row.get(0)?,
                cliente_id: row.get(1)?,
                cliente_ref: row.get(2)?,
                total: row.get(3)?,
                notas: row.get(4)?,
                estado: row.get(5)?,
                usuario_id: row.get(6)?,
                fecha: row.get(7)?,
            })
        },
    ) {
        Ok(c) => c,
        Err(_) => return ApiResponse::error("Cotización no encontrada"),
    };

    let mut prod_stmt = conn
        .prepare(
            r#"SELECT cp.producto_id, p.nombre, p.codigo_interno,
                      cp.cantidad, cp.precio_unitario, cp.subtotal
               FROM cotizacion_producto cp
               JOIN producto p ON cp.producto_id = p.id
               WHERE cp.cotizacion_id = ?
               ORDER BY p.nombre"#,
        )
        .unwrap();

    let productos: Vec<CotizacionProducto> = prod_stmt
        .query_map(params![id], |row| {
            Ok(CotizacionProducto {
                producto_id: row.get(0)?,
                nombre: row.get(1)?,
                codigo_interno: row.get(2)?,
                cantidad: row.get(3)?,
                precio_unitario: row.get(4)?,
                subtotal: row.get(5)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success(
        "Cotización encontrada",
        CotizacionConProductos { cotizacion, productos },
    )
}

/// Cambiar estado de una cotización
#[tauri::command]
pub fn cambiar_estado_cotizacion(
    id: i64,
    nuevo_estado: String,
    state: State<AppState>,
) -> ApiResponse<()> {
    let estados_validos = ["vigente", "enviada", "aprobada", "cancelada"];
    if !estados_validos.contains(&nuevo_estado.as_str()) {
        return ApiResponse::error(&format!(
            "Estado inválido. Valores válidos: {}",
            estados_validos.join(", ")
        ));
    }

    let conn = state.db.conn.lock().unwrap();

    match conn.execute(
        "UPDATE cotizacion SET estado = ?1 WHERE id = ?2",
        params![nuevo_estado, id],
    ) {
        Ok(rows) if rows == 0 => ApiResponse::error("Cotización no encontrada"),
        Ok(_) => ApiResponse::success("Estado actualizado", ()),
        Err(e) => ApiResponse::error(&format!("Error: {}", e)),
    }
}

/// Eliminar una cotización y sus items
#[tauri::command]
pub fn eliminar_cotizacion(
    id: i64,
    state: State<AppState>,
) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();

    if let Err(e) = conn.execute("BEGIN TRANSACTION", []) {
        return ApiResponse::error(&format!("Error: {}", e));
    }

    // Eliminar items primero (FK)
    if let Err(e) = conn.execute(
        "DELETE FROM cotizacion_producto WHERE cotizacion_id = ?",
        params![id],
    ) {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al eliminar items: {}", e));
    }

    let rows = conn
        .execute("DELETE FROM cotizacion WHERE id = ?", params![id])
        .unwrap_or(0);

    if rows == 0 {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error("Cotización no encontrada");
    }

    match conn.execute("COMMIT", []) {
        Ok(_) => ApiResponse::success("Cotización eliminada", ()),
        Err(e) => ApiResponse::error(&format!("Error al confirmar: {}", e)),
    }
}
