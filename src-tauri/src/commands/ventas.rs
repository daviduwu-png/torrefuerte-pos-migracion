use crate::commands::productos::AppState;
use crate::models::*;
use chrono::Local;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

// ==================== VENTAS / TICKETS ====================

/// Generar un nuevo ticket de venta
#[tauri::command]
pub fn generar_ticket(
    ticket_input: TicketInput,
    state: State<AppState>,
) -> ApiResponse<Ticket> {
    let conn = state.db.conn.lock().unwrap();
    
    // Obtener usuario actual
    let usuario_id = state.current_user.lock().unwrap()
        .as_ref()
        .map(|u| u.id);
    
    // Generar folio fiscal único
    let folio_fiscal = format!("TF-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let fecha = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Iniciar transacción
    if let Err(e) = conn.execute("BEGIN TRANSACTION", []) {
        return ApiResponse::error(&format!("Error al iniciar transacción: {}", e));
    }
    
    // Insertar ticket
    let result = conn.execute(
        r#"INSERT INTO ticket (folio_fiscal, metodo_pago, total, direccion_local, nombre_local, 
                               dinero_recibido, cambio, usuario_id, fecha)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        params![
            folio_fiscal,
            ticket_input.metodo_pago,
            ticket_input.total,
            "9 Poniente #907",  // Dirección por defecto
            "TORRE FUERTE",
            ticket_input.dinero_recibido,
            ticket_input.cambio,
            usuario_id,
            fecha
        ]
    );
    
    if let Err(e) = result {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al crear ticket: {}", e));
    }
    
    let ticket_id = conn.last_insert_rowid();
    
    // Insertar productos del ticket y actualizar stock
    for prod in &ticket_input.productos {
        let subtotal = prod.precio_venta * prod.cantidad;
        
        // 1. Obtener costo actual para historial (Evitar futuros errores en reportes)
        let costo_actual: f64 = conn.query_row(
            "SELECT precio_compra FROM producto WHERE id = ?",
            params![prod.id],
            |row| row.get(0)
        ).unwrap_or(0.0);
        
        // Insertar relación ticket-producto con COSTO HISTÓRICO
        let insert_result = conn.execute(
            "INSERT INTO ticket_producto (ticket_id, producto_id, cantidad, precio_unitario, costo_historico, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
            params![ticket_id, prod.id, prod.cantidad, prod.precio_venta, costo_actual, subtotal]
        );
        
        if let Err(e) = insert_result {
            conn.execute("ROLLBACK", []).ok();
            return ApiResponse::error(&format!("Error al registrar producto: {}", e));
        }
        
        // Actualizar stock
        let stock_result = conn.execute(
            "UPDATE producto SET stock = stock - ? WHERE id = ? AND stock >= ?",
            params![prod.cantidad, prod.id, prod.cantidad]
        );
        
        match stock_result {
            Ok(rows) if rows == 0 => {
                conn.execute("ROLLBACK", []).ok();
                return ApiResponse::error(&format!("Stock insuficiente para producto ID: {}", prod.id));
            }
            Err(e) => {
                conn.execute("ROLLBACK", []).ok();
                return ApiResponse::error(&format!("Error al actualizar stock: {}", e));
            }
            _ => {}
        }
    }
    
    // Confirmar transacción
    if let Err(e) = conn.execute("COMMIT", []) {
        return ApiResponse::error(&format!("Error al confirmar transacción: {}", e));
    }
    
    let ticket = Ticket {
        id: ticket_id,
        folio_fiscal,
        metodo_pago: ticket_input.metodo_pago,
        total: ticket_input.total,
        direccion_local: "Av. Principal #123".to_string(),
        nombre_local: "TORRE FUERTE".to_string(),
        dinero_recibido: ticket_input.dinero_recibido,
        cambio: ticket_input.cambio,
        usuario_id,
        fecha,
    };
    
    ApiResponse::success("Ticket generado correctamente", ticket)
}

/// Buscar ticket por ID o folio
#[tauri::command]
pub fn buscar_ticket(query: String, state: State<AppState>) -> ApiResponse<Vec<TicketConProductos>> {
    let conn = state.db.conn.lock().unwrap();
    let like_query = format!("%{}%", query);
    let id_query: i64 = query.parse().unwrap_or(0);
    
    let mut stmt = conn.prepare(
        r#"SELECT id, folio_fiscal, metodo_pago, total, direccion_local, nombre_local, 
                  dinero_recibido, cambio, usuario_id, fecha
           FROM ticket 
           WHERE id = ? OR folio_fiscal LIKE ?
           ORDER BY fecha DESC
           LIMIT 10"#
    ).unwrap();
    
    let tickets: Vec<Ticket> = stmt
        .query_map(params![id_query, &like_query], |row| {
            Ok(Ticket {
                id: row.get(0)?,
                folio_fiscal: row.get(1)?,
                metodo_pago: row.get(2)?,
                total: row.get(3)?,
                direccion_local: row.get(4)?,
                nombre_local: row.get(5)?,
                dinero_recibido: row.get::<_, Option<f64>>(6)?.unwrap_or(0.0),
                cambio: row.get::<_, Option<f64>>(7)?.unwrap_or(0.0),
                usuario_id: row.get(8)?,
                fecha: row.get(9)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();
    
    if tickets.is_empty() {
        return ApiResponse::error("No se encontraron tickets");
    }
    
    // Obtener productos de cada ticket
    let mut tickets_con_productos = Vec::new();
    
    for ticket in tickets {
        let mut prod_stmt = conn.prepare(
            r#"SELECT tp.producto_id, p.nombre, tp.cantidad, tp.precio_unitario, tp.subtotal,
               COALESCE((SELECT SUM(cantidad) FROM devolucion WHERE ticket_id = tp.ticket_id AND producto_id = tp.producto_id), 0) as devuelto
               FROM ticket_producto tp
               JOIN producto p ON tp.producto_id = p.id
               WHERE tp.ticket_id = ?"#
        ).unwrap();
        
        let productos: Vec<TicketProducto> = prod_stmt
            .query_map(params![ticket.id], |row| {
                Ok(TicketProducto {
                    producto_id: row.get(0)?,
                    nombre: row.get(1)?,
                    cantidad: row.get(2)?,
                    precio_unitario: row.get(3)?,
                    subtotal: row.get(4)?,
                    devuelto: row.get::<_, f64>(5).unwrap_or(0.0),
                })
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        
        tickets_con_productos.push(TicketConProductos { ticket, productos });
    }
    
    ApiResponse::success("Tickets encontrados", tickets_con_productos)
}

/// Listar tickets con filtro de fechas opcional
/// Si no se especifican fechas, devuelve los tickets del día actual
#[tauri::command]
pub fn listar_tickets(
    fecha_inicio: Option<String>,
    fecha_fin: Option<String>,
    state: State<AppState>
) -> ApiResponse<Vec<TicketConProductos>> {
    let conn = state.db.conn.lock().unwrap();
    
    // Si no hay fechas, usar fecha de hoy
    let (inicio, fin) = match (fecha_inicio, fecha_fin) {
        (Some(i), Some(f)) => (format!("{} 00:00:00", i), format!("{} 23:59:59", f)),
        _ => {
            let hoy = Local::now().format("%Y-%m-%d").to_string();
            (format!("{} 00:00:00", hoy), format!("{} 23:59:59", hoy))
        }
    };
    
    let mut stmt = conn.prepare(
        r#"SELECT id, folio_fiscal, metodo_pago, total, direccion_local, nombre_local,
                  dinero_recibido, cambio, usuario_id, fecha
           FROM ticket 
           WHERE fecha BETWEEN ?1 AND ?2
           ORDER BY fecha DESC"#
    ).unwrap();
    
    let tickets: Vec<Ticket> = stmt
        .query_map(params![inicio, fin], |row| {
            Ok(Ticket {
                id: row.get(0)?,
                folio_fiscal: row.get(1)?,
                metodo_pago: row.get(2)?,
                total: row.get(3)?,
                direccion_local: row.get(4)?,
                nombre_local: row.get(5)?,
                dinero_recibido: row.get::<_, Option<f64>>(6)?.unwrap_or(0.0),
                cambio: row.get::<_, Option<f64>>(7)?.unwrap_or(0.0),
                usuario_id: row.get(8)?,
                fecha: row.get(9)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();
    
    let mut tickets_con_productos = Vec::new();
    
    for ticket in tickets {
        let mut prod_stmt = conn.prepare(
            r#"SELECT tp.producto_id, p.nombre, tp.cantidad, tp.precio_unitario, tp.subtotal,
               COALESCE((SELECT SUM(cantidad) FROM devolucion WHERE ticket_id = tp.ticket_id AND producto_id = tp.producto_id), 0) as devuelto
               FROM ticket_producto tp
               JOIN producto p ON tp.producto_id = p.id
               WHERE tp.ticket_id = ?"#
        ).unwrap();
        
        let productos: Vec<TicketProducto> = prod_stmt
            .query_map(params![ticket.id], |row| {
                Ok(TicketProducto {
                    producto_id: row.get(0)?,
                    nombre: row.get(1)?,
                    cantidad: row.get(2)?,
                    precio_unitario: row.get(3)?,
                    subtotal: row.get(4)?,
                    devuelto: row.get::<_, f64>(5).unwrap_or(0.0),
                })
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        
        tickets_con_productos.push(TicketConProductos { ticket, productos });
    }
    
    ApiResponse::success(&format!("{} tickets encontrados", tickets_con_productos.len()), tickets_con_productos)
}

// ==================== DEVOLUCIONES ====================

/// Realizar una devolución
#[tauri::command]
pub fn realizar_devolucion(
    devolucion: DevolucionInput,
    state: State<AppState>,
) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();
    
    // Verificar usuario admin
    let current_user = state.current_user.lock().unwrap();
    let usuario_id = match current_user.as_ref() {
        Some(u) if u.rol == "admin" => u.id,
        Some(_) => return ApiResponse::error("Solo administradores pueden realizar devoluciones"),
        None => return ApiResponse::error("Usuario no autenticado"),
    };
    drop(current_user);
    
    // Verificar que el producto existe en el ticket
    let item: Result<(f64, f64), _> = conn.query_row(
        "SELECT cantidad, precio_unitario FROM ticket_producto WHERE ticket_id = ? AND producto_id = ?",
        params![devolucion.ticket_id, devolucion.producto_id],
        |row| Ok((row.get(0)?, row.get(1)?))
    );
    
    let (cantidad_vendida, precio_unitario) = match item {
        Ok(data) => data,
        Err(_) => return ApiResponse::error("El producto no existe en el ticket"),
    };
    
    if devolucion.cantidad > cantidad_vendida {
        return ApiResponse::error(&format!(
            "No se puede devolver ({}) más de lo vendido ({})",
            devolucion.cantidad, cantidad_vendida
        ));
    }
    
    let monto_devolucion = devolucion.cantidad * precio_unitario;
    let fecha = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let motivo = devolucion.motivo.unwrap_or_else(|| "Devolución general".to_string());
    
    // Iniciar transacción
    if let Err(e) = conn.execute("BEGIN TRANSACTION", []) {
        return ApiResponse::error(&format!("Error al iniciar transacción: {}", e));
    }
    
    // Registrar devolución
    if let Err(e) = conn.execute(
        "INSERT INTO devolucion (ticket_id, producto_id, cantidad, motivo, usuario_id, fecha) VALUES (?, ?, ?, ?, ?, ?)",
        params![devolucion.ticket_id, devolucion.producto_id, devolucion.cantidad, motivo, usuario_id, fecha]
    ) {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al registrar devolución: {}", e));
    }
    
    // Regresar stock
    if let Err(e) = conn.execute(
        "UPDATE producto SET stock = stock + ? WHERE id = ?",
        params![devolucion.cantidad, devolucion.producto_id]
    ) {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al actualizar stock: {}", e));
    }
    
    // Actualizar ticket_producto
    if let Err(e) = conn.execute(
        "UPDATE ticket_producto SET cantidad = cantidad - ?, subtotal = subtotal - ? WHERE ticket_id = ? AND producto_id = ?",
        params![devolucion.cantidad, monto_devolucion, devolucion.ticket_id, devolucion.producto_id]
    ) {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al actualizar detalle: {}", e));
    }
    
    // Actualizar total del ticket
    if let Err(e) = conn.execute(
        "UPDATE ticket SET total = total - ? WHERE id = ?",
        params![monto_devolucion, devolucion.ticket_id]
    ) {
        conn.execute("ROLLBACK", []).ok();
        return ApiResponse::error(&format!("Error al actualizar ticket: {}", e));
    }
    
    if let Err(e) = conn.execute("COMMIT", []) {
        return ApiResponse::error(&format!("Error al confirmar transacción: {}", e));
    }
    
    ApiResponse::success("Devolución realizada con éxito", ())
}

/// Listar devoluciones por rango de fechas
#[tauri::command]
pub fn listar_devoluciones(
    inicio: Option<String>,
    fin: Option<String>,
    state: State<AppState>,
) -> ApiResponse<Vec<Devolucion>> {
    let conn = state.db.conn.lock().unwrap();
    
    let fecha_inicio = inicio.unwrap_or_else(|| Local::now().format("%Y-%m-%d").to_string());
    let fecha_fin = fin.unwrap_or_else(|| Local::now().format("%Y-%m-%d").to_string());
    
    let mut stmt = conn.prepare(
        r#"SELECT d.id, d.ticket_id, t.folio_fiscal, p.nombre, p.codigo_interno, 
                  d.cantidad, d.motivo, u.nombre, d.fecha
           FROM devolucion d
           JOIN ticket t ON d.ticket_id = t.id
           JOIN producto p ON d.producto_id = p.id
           LEFT JOIN usuario u ON d.usuario_id = u.id
           WHERE DATE(d.fecha) BETWEEN ? AND ?
           ORDER BY d.fecha DESC"#
    ).unwrap();
    
    let devoluciones: Vec<Devolucion> = stmt
        .query_map(params![fecha_inicio, fecha_fin], |row| {
            Ok(Devolucion {
                id: row.get(0)?,
                ticket_id: row.get(1)?,
                folio_fiscal: row.get(2)?,
                producto: row.get(3)?,
                codigo_interno: row.get(4)?,
                cantidad: row.get(5)?,
                motivo: row.get(6)?,
                usuario: row.get(7)?,
                fecha: row.get(8)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success(&format!("{} devoluciones encontradas", devoluciones.len()), devoluciones)
}
