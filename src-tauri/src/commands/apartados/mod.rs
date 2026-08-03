use tauri::State;
use rusqlite::params;
use crate::AppState;
use crate::models::{
    Apartado, ApartadoProducto, ApartadoConProductos,
    ApartadoInput, AbonoApartadoInput, Abono,
};

// ─── Respuesta genérica ───────────────────────────────────────────────────────
#[derive(serde::Serialize)]
pub struct ApiResponse<T: serde::Serialize> {
    pub success: bool,
    pub message: String,
    pub data: Option<T>,
}

fn ok<T: serde::Serialize>(data: T, msg: &str) -> ApiResponse<T> {
    ApiResponse { success: true, message: msg.to_string(), data: Some(data) }
}
fn ok_empty(msg: &str) -> ApiResponse<()> {
    ApiResponse { success: true, message: msg.to_string(), data: None }
}
fn err<T: serde::Serialize>(msg: &str) -> ApiResponse<T> {
    ApiResponse { success: false, message: msg.to_string(), data: None }
}

// ─── 1. Crear apartado ────────────────────────────────────────────────────────
/// Crea el apartado y reserva el stock de cada producto.
/// El stock VISIBLE baja (stock -= cantidad), stock_reservado += cantidad.
#[tauri::command]
pub async fn crear_apartado(
    state: State<'_, AppState>,
    apartado: ApartadoInput,
) -> Result<ApiResponse<i64>, String> {
    let conn = state.db.conn.lock().unwrap();

    if apartado.items.is_empty() {
        return Ok(err("El apartado debe tener al menos un producto."));
    }

    // Calcular total
    let total: f64 = apartado.items.iter().map(|i| i.cantidad * i.precio_unitario).sum();

    conn.execute_batch("BEGIN;").map_err(|e| e.to_string())?;

    let fecha_local = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Insertar cabecera del apartado
    let insert_result = conn.execute(
        "INSERT INTO apartado (cliente_id, total, monto_pendiente, notas, estado, fecha)
         VALUES (?1, ?2, ?2, ?3, 'activo', ?4)",
        params![apartado.cliente_id, total, apartado.notas, fecha_local],
    );

    if let Err(e) = insert_result {
        conn.execute_batch("ROLLBACK;").map_err(|e| e.to_string())?;
        return Ok(err(&format!("Error al crear apartado: {}", e)));
    }

    let apartado_id = conn.last_insert_rowid();

    // Crear cuenta por cobrar 
    conn.execute(
        "INSERT INTO cuenta_por_cobrar (cliente_id, concepto, monto_original, monto_pendiente, estado, fecha)
         VALUES (?1, ?2, ?3, ?3, 'pendiente', ?4)",
        params![apartado.cliente_id, format!("Apartado #{}", apartado_id), total, fecha_local],
    ).map_err(|e| e.to_string())?;

    // Insertar productos y actualizar stock
    for item in &apartado.items {
        // Verificar stock suficiente (stock real)
        let stock_disponible: f64 = conn.query_row(
            "SELECT stock FROM producto WHERE id = ?1",
            params![item.producto_id],
            |r: &rusqlite::Row| r.get(0),
        ).unwrap_or(0.0);

        if stock_disponible < item.cantidad {
            conn.execute_batch("ROLLBACK;").map_err(|e| e.to_string())?;
            return Ok(err(&format!(
                "Stock insuficiente para el producto ID {}. Disponible: {:.2}",
                item.producto_id, stock_disponible
            )));
        }

        // Insertar en apartado_producto
        conn.execute(
            "INSERT INTO apartado_producto (apartado_id, producto_id, cantidad, precio_unitario, subtotal)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                apartado_id,
                item.producto_id,
                item.cantidad,
                item.precio_unitario,
                item.cantidad * item.precio_unitario
            ],
        ).map_err(|e| e.to_string())?;

        // Descontar stock real inmediatamente (el cliente se lleva la mercancía a crédito)
        conn.execute(
            "UPDATE producto SET stock = stock - ?1 WHERE id = ?2",
            params![item.cantidad, item.producto_id],
        ).map_err(|e| e.to_string())?;
    }

    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

    Ok(ok(apartado_id, &format!("Crédito/Apartado #{} creado. Stock descontado correctamente.", apartado_id)))
}

// ─── 2. Listar apartados ──────────────────────────────────────────────────────
#[tauri::command]
pub async fn listar_apartados(
    state: State<'_, AppState>,
    estado: Option<String>,
    cliente_id: Option<i64>,
) -> Result<ApiResponse<Vec<Apartado>>, String> {
    let conn = state.db.conn.lock().unwrap();

    let mut sql = String::from(
        "SELECT a.id, a.cliente_id, c.nombre AS cliente_nombre,
                a.total, a.monto_pagado, a.monto_pendiente,
                a.notas, a.estado, a.fecha, a.fecha_liquidado, a.ticket_id,
                (SELECT COUNT(*) FROM apartado_producto ap WHERE ap.apartado_id = a.id) AS total_productos
         FROM apartado a
         JOIN cliente c ON c.id = a.cliente_id
         WHERE 1=1"
    );

    if estado.is_some()     { sql.push_str(" AND a.estado = ?"); }
    if cliente_id.is_some() { sql.push_str(" AND a.cliente_id = ?"); }
    sql.push_str(" ORDER BY a.fecha DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = match (estado.as_deref(), cliente_id) {
        (Some(e), Some(c)) => stmt.query(params![e, c]).map_err(|e| e.to_string())?,
        (Some(e), None)    => stmt.query(params![e]).map_err(|e| e.to_string())?,
        (None, Some(c))    => stmt.query(params![c]).map_err(|e| e.to_string())?,
        _                  => stmt.query([]).map_err(|e| e.to_string())?,
    };

    let mut lista: Vec<Apartado> = Vec::new();
    let mut rows = rows;
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        lista.push(Apartado {
            id:               row.get(0).map_err(|e| e.to_string())?,
            cliente_id:       row.get(1).map_err(|e| e.to_string())?,
            cliente_nombre:   row.get(2).map_err(|e| e.to_string())?,
            total:            row.get(3).map_err(|e| e.to_string())?,
            monto_pagado:     row.get(4).map_err(|e| e.to_string())?,
            monto_pendiente:  row.get(5).map_err(|e| e.to_string())?,
            notas:            row.get(6).map_err(|e| e.to_string())?,
            estado:           row.get(7).map_err(|e| e.to_string())?,
            fecha:            row.get(8).map_err(|e| e.to_string())?,
            fecha_liquidado:  row.get(9).map_err(|e| e.to_string())?,
            ticket_id:        row.get(10).map_err(|e| e.to_string())?,
            total_productos:  row.get(11).map_err(|e| e.to_string())?,
        });
    }

    Ok(ok(lista, "OK"))
}

// ─── 3. Obtener detalle de un apartado ───────────────────────────────────────
#[tauri::command]
pub async fn obtener_apartado(
    state: State<'_, AppState>,
    id: i64,
) -> Result<ApiResponse<ApartadoConProductos>, String> {
    let conn = state.db.conn.lock().unwrap();

    let apartado = conn.query_row(
        "SELECT a.id, a.cliente_id, c.nombre, a.total, a.monto_pagado, a.monto_pendiente,
                a.notas, a.estado, a.fecha, a.fecha_liquidado, a.ticket_id,
                (SELECT COUNT(*) FROM apartado_producto ap WHERE ap.apartado_id = a.id)
         FROM apartado a
         JOIN cliente c ON c.id = a.cliente_id
         WHERE a.id = ?1",
        params![id],
        |r: &rusqlite::Row| Ok(Apartado {
            id:               r.get(0)?,
            cliente_id:       r.get(1)?,
            cliente_nombre:   r.get(2)?,
            total:            r.get(3)?,
            monto_pagado:     r.get(4)?,
            monto_pendiente:  r.get(5)?,
            notas:            r.get(6)?,
            estado:           r.get(7)?,
            fecha:            r.get(8)?,
            fecha_liquidado:  r.get(9)?,
            ticket_id:        r.get(10)?,
            total_productos:  r.get(11)?,
        }),
    );

    let apartado = match apartado {
        Ok(a) => a,
        Err(_) => return Ok(err(&format!("Apartado #{} no encontrado.", id))),
    };

    let mut stmt = conn.prepare(
        "SELECT ap.producto_id, p.nombre, p.codigo_interno,
                ap.cantidad, ap.precio_unitario, ap.subtotal
         FROM apartado_producto ap
         JOIN producto p ON p.id = ap.producto_id
         WHERE ap.apartado_id = ?1",
    ).map_err(|e| e.to_string())?;
    
    let productos: Vec<ApartadoProducto> = stmt.query_map(params![id], |r: &rusqlite::Row| {
        Ok(ApartadoProducto {
            producto_id:     r.get(0)?,
            nombre:          r.get(1)?,
            codigo_interno:  r.get(2)?,
            cantidad:        r.get(3)?,
            precio_unitario: r.get(4)?,
            subtotal:        r.get(5)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r: Result<ApartadoProducto, _>| r.ok()).collect();

    let mut stmt_abonos = conn.prepare(
        "SELECT id, cuenta_id, monto, metodo_pago, fecha, notas
         FROM abono
         WHERE cuenta_id = (
             SELECT MIN(id) FROM cuenta_por_cobrar
             WHERE concepto LIKE '%Apartado #' || ?1 || '%'
         )
         ORDER BY fecha ASC"
    ).map_err(|e| e.to_string())?;

    let abonos: Vec<Abono> = stmt_abonos.query_map(params![id], |r: &rusqlite::Row| {
        Ok(Abono {
            id:          r.get(0)?,
            cuenta_id:   r.get(1)?,
            monto:       r.get(2)?,
            metodo_pago: r.get(3)?,
            fecha:       r.get(4)?,
            notas:       r.get(5)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r: Result<Abono, _>| r.ok()).collect();

    Ok(ok(ApartadoConProductos { apartado, productos, abonos }, "OK"))
}

// ─── 4. Abonar a un apartado ─────────────────────────────────────────────────
/// Registra un pago parcial. NO genera ticket ni libera stock todavía.
#[tauri::command]
pub async fn abonar_apartado(
    state: State<'_, AppState>,
    abono: AbonoApartadoInput,
) -> Result<ApiResponse<()>, String> {
    let conn = state.db.conn.lock().unwrap();

    // Leer estado actual del apartado
    let (pendiente, estado): (f64, String) = conn.query_row(
        "SELECT monto_pendiente, estado FROM apartado WHERE id = ?1",
        params![abono.apartado_id],
        |r: &rusqlite::Row| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| format!("Apartado #{} no encontrado.", abono.apartado_id))?;

    if estado != "activo" {
        return Ok(err(&format!("El apartado está '{}' y no acepta abonos.", estado)));
    }
    if abono.monto <= 0.0 {
        return Ok(err("El monto del abono debe ser mayor a $0.00."));
    }
    if abono.monto > pendiente + 0.001 {
        return Ok(err(&format!(
            "El abono (${:.2}) supera el saldo pendiente (${:.2}).",
            abono.monto, pendiente
        )));
    }

    conn.execute_batch("BEGIN;").map_err(|e| e.to_string())?;

    let fecha_local = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Registrar el abono en la tabla de historial
    conn.execute(
        "INSERT INTO abono (cuenta_id, monto, metodo_pago, notas, fecha)
         SELECT cpc.id, ?1, ?2, ?3, ?5
         FROM cuenta_por_cobrar cpc
         WHERE cpc.id = (
             SELECT MIN(id) FROM cuenta_por_cobrar
             WHERE concepto LIKE '%Apartado #' || ?4 || '%' AND estado != 'saldado'
         )",
        params![abono.monto, abono.metodo_pago, abono.notas, abono.apartado_id, fecha_local],
    ).ok(); // Opcional: puede no existir CXC vinculada, no bloqueamos

    // Calcular nuevo pendiente
    let nuevo_pendiente = (pendiente - abono.monto).max(0.0);

    // Actualizar el apartado
    conn.execute(
        "UPDATE apartado
         SET monto_pagado    = monto_pagado + ?1,
             monto_pendiente = ?2
         WHERE id = ?3",
        params![abono.monto, nuevo_pendiente, abono.apartado_id],
    ).map_err(|e| e.to_string())?;

    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

    let msg: String;
    if nuevo_pendiente <= 0.001 {
        msg = "Abono registrado. ¡Apartado completamente pagado! Ya puedes liquidarlo.".to_string();
    } else {
        msg = format!(
            "Abono de ${:.2} registrado. Resta: ${:.2}",
            abono.monto, nuevo_pendiente
        );
    }

    Ok(ok_empty(msg.as_str()))
}

// ─── 5. Liquidar apartado ─────────────────────────────────────────────────────
/// El cliente terminó de pagar. Se genera el ticket real, el stock_reservado
/// baja y el stock real también, cerrando el ciclo de forma atómica.
#[tauri::command]
pub async fn liquidar_apartado(
    state: State<'_, AppState>,
    apartado_id: i64,
    metodo_pago: String,
) -> Result<ApiResponse<i64>, String> {
    let conn = state.db.conn.lock().unwrap();

    // Verificar que el apartado esté activo y pagado
    let (total, pendiente, _cliente_id, estado): (f64, f64, i64, String) = conn.query_row(
        "SELECT total, monto_pendiente, cliente_id, estado FROM apartado WHERE id = ?1",
        params![apartado_id],
        |r: &rusqlite::Row| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    ).map_err(|_| format!("Apartado #{} no encontrado.", apartado_id))?;

    if estado != "activo" {
        return Ok(err(&format!("El apartado está '{}', no se puede liquidar.", estado)));
    }
    if pendiente > 0.01 {
        return Ok(err(&format!("Aún hay ${:.2} pendientes de pago.", pendiente)));
    }

    // Obtener productos del apartado
    let mut stmt = conn.prepare(
        "SELECT producto_id, cantidad, precio_unitario
         FROM apartado_producto
         WHERE apartado_id = ?1",
    ).map_err(|e| e.to_string())?;
    
    let items: Vec<(i64, f64, f64)> = stmt.query_map(params![apartado_id], |r: &rusqlite::Row| {
        Ok((r.get(0)?, r.get(1)?, r.get(2)?))
    }).map_err(|e| e.to_string())?.filter_map(|r: Result<(i64, f64, f64), _>| r.ok()).collect();

    if items.is_empty() {
        return Ok(err("El apartado no tiene productos."));
    }

    conn.execute_batch("BEGIN;").map_err(|e| e.to_string())?;

    // Obtener info del local para el ticket
    let (nombre_local, direccion_local): (String, String) = conn.query_row(
        "SELECT nombre, direccion FROM configuracion LIMIT 1",
        [],
        |r: &rusqlite::Row| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap_or_else(|_| ("TorreFuerte".to_string(), "".to_string()));

    // Generar folio fiscal único
    let folio = format!("APT-{}-{}", apartado_id, chrono::Local::now().format("%Y%m%d%H%M%S"));

    let fecha_local = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Crear el ticket
    conn.execute(
        "INSERT INTO ticket (folio_fiscal, metodo_pago, total, nombre_local, direccion_local, dinero_recibido, cambio, fecha)
         VALUES (?1, ?2, ?3, ?4, ?5, ?3, 0.0, ?6)",
        params![folio, metodo_pago, total, nombre_local, direccion_local, fecha_local],
    ).map_err(|e| e.to_string())?;
    
    let ticket_id = conn.last_insert_rowid();

    // Insertar ticket_producto y descontar stock real + reservado
    for (producto_id, cantidad, precio_unitario) in &items {
        // Obtener costo histórico del producto
        let costo: f64 = conn.query_row(
            "SELECT precio_compra FROM producto WHERE id = ?1",
            params![producto_id],
            |r: &rusqlite::Row| r.get(0),
        ).unwrap_or(0.0);

        conn.execute(
            "INSERT INTO ticket_producto (ticket_id, producto_id, cantidad, precio_unitario, subtotal, costo_historico)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                ticket_id,
                producto_id,
                cantidad,
                precio_unitario,
                cantidad * precio_unitario,
                costo
            ],
        ).map_err(|e| e.to_string())?;

        // NOTA: El stock real YA se descontó al crear el crédito. No descontamos de nuevo.
    }

    let fecha_local = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Cerrar el apartado
    conn.execute(
        "UPDATE apartado
         SET estado = 'liquidado',
             ticket_id = ?1,
             fecha_liquidado = ?3
         WHERE id = ?2",
        params![ticket_id, apartado_id, fecha_local],
    ).map_err(|e| e.to_string())?;

    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

    Ok(ok(
        ticket_id,
        &format!(
            "Apartado #{} liquidado. Ticket #{} generado. Stock actualizado.",
            apartado_id, ticket_id
        )
    ))
}

// ─── 6. Cancelar apartado ─────────────────────────────────────────────────────
/// Devuelve el stock reservado y cierra el apartado sin generar ticket.
#[tauri::command]
pub async fn cancelar_apartado(
    state: State<'_, AppState>,
    apartado_id: i64,
) -> Result<ApiResponse<()>, String> {
    let conn = state.db.conn.lock().unwrap();

    let estado: String = conn.query_row(
        "SELECT estado FROM apartado WHERE id = ?1",
        params![apartado_id],
        |r: &rusqlite::Row| r.get(0),
    ).map_err(|_| format!("Apartado #{} no encontrado.", apartado_id))?;

    if estado != "activo" {
        return Ok(err(&format!("El apartado está '{}', no se puede cancelar.", estado)));
    }

    // Obtener productos para devolver stock
    let mut stmt = conn.prepare(
        "SELECT producto_id, cantidad FROM apartado_producto WHERE apartado_id = ?1",
    ).map_err(|e| e.to_string())?;
    
    let items: Vec<(i64, f64)> = stmt.query_map(params![apartado_id], |r: &rusqlite::Row| {
        Ok((r.get(0)?, r.get(1)?))
    }).map_err(|e| e.to_string())?.filter_map(|r: Result<(i64, f64), _>| r.ok()).collect();

    conn.execute_batch("BEGIN;").map_err(|e| e.to_string())?;

    for (producto_id, cantidad) in &items {
        // Devolver los productos al stock real ya que el crédito fue cancelado
        conn.execute(
            "UPDATE producto SET stock = stock + ?1 WHERE id = ?2",
            params![cantidad, producto_id],
        ).map_err(|e| e.to_string())?;
    }

    conn.execute(
        "UPDATE apartado SET estado = 'cancelado' WHERE id = ?1",
        params![apartado_id],
    ).map_err(|e| e.to_string())?;

    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

    Ok(ok_empty(&format!(
        "Apartado #{} cancelado. Stock de {} productos liberado.",
        apartado_id, items.len()
    )))
}
