use crate::commands::productos::AppState;
use crate::models::*;
use chrono::Local;
use rusqlite::params;
use tauri::State;

// ==================== DIRECTORIO DE CLIENTES ====================

/// Listar / buscar clientes activos
#[tauri::command]
pub fn listar_clientes(
    query: Option<String>,
    state: State<AppState>,
) -> ApiResponse<Vec<Cliente>> {
    let conn = state.db.conn.lock().unwrap();

    let sql = r#"
        SELECT id, nombre, telefono, email, direccion, rfc, notas, activo, fecha_alta
        FROM cliente
        WHERE activo = 1
          AND (?1 IS NULL OR nombre LIKE ?1 OR telefono LIKE ?1)
        ORDER BY nombre ASC
        LIMIT 200
    "#;

    let pattern = query.map(|q| format!("%{}%", q));
    let mut stmt = conn.prepare(sql).unwrap();

    let clientes: Vec<Cliente> = stmt
        .query_map(params![pattern], |row| parse_cliente_row(row))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success(
        &format!("{} clientes encontrados", clientes.len()),
        clientes,
    )
}

/// Obtener un cliente por ID
#[tauri::command]
pub fn obtener_cliente(id: i64, state: State<AppState>) -> ApiResponse<Cliente> {
    let conn = state.db.conn.lock().unwrap();

    let result = conn.query_row(
        "SELECT id, nombre, telefono, email, direccion, rfc, notas, activo, fecha_alta
         FROM cliente WHERE id = ?",
        params![id],
        |row| parse_cliente_row(row),
    );

    match result {
        Ok(cliente) => ApiResponse::success("Cliente encontrado", cliente),
        Err(_) => ApiResponse::error("Cliente no encontrado"),
    }
}

/// Crear o actualizar un cliente (upsert por id)
#[tauri::command]
pub fn guardar_cliente(
    cliente: ClienteInput,
    state: State<AppState>,
) -> ApiResponse<i64> {
    let conn = state.db.conn.lock().unwrap();

    if cliente.nombre.trim().is_empty() {
        return ApiResponse::error("El nombre del cliente es requerido");
    }

    match cliente.id {
        // --- UPDATE ---
        Some(id) => {
            let result = conn.execute(
                r#"UPDATE cliente SET
                       nombre = ?1, telefono = ?2, email = ?3,
                       direccion = ?4, rfc = ?5, notas = ?6
                   WHERE id = ?7"#,
                params![
                    cliente.nombre.trim(),
                    cliente.telefono,
                    cliente.email,
                    cliente.direccion,
                    cliente.rfc,
                    cliente.notas,
                    id
                ],
            );
            match result {
                Ok(_) => ApiResponse::success("Cliente actualizado", id),
                Err(e) => ApiResponse::error(&format!("Error al actualizar: {}", e)),
            }
        }
        // --- INSERT ---
        None => {
            let fecha_local = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            let result = conn.execute(
                r#"INSERT INTO cliente (nombre, telefono, email, direccion, rfc, notas, fecha_alta)
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#,
                params![
                    cliente.nombre.trim(),
                    cliente.telefono,
                    cliente.email,
                    cliente.direccion,
                    cliente.rfc,
                    cliente.notas,
                    fecha_local,
                ],
            );
            match result {
                Ok(_) => ApiResponse::success("Cliente creado", conn.last_insert_rowid()),
                Err(e) => ApiResponse::error(&format!("Error al crear cliente: {}", e)),
            }
        }
    }
}

/// Soft-delete: marca al cliente como inactivo (activo = 0)
#[tauri::command]
pub fn eliminar_cliente(id: i64, state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();

    // Verificar que existe
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM cliente WHERE id = ? AND activo = 1",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if exists == 0 {
        return ApiResponse::error("El cliente no existe o ya fue eliminado");
    }

    match conn.execute(
        "UPDATE cliente SET activo = 0 WHERE id = ?",
        params![id],
    ) {
        Ok(_) => ApiResponse::success("Cliente eliminado", ()),
        Err(e) => ApiResponse::error(&format!("Error al eliminar: {}", e)),
    }
}

// ---- Helper ----
fn parse_cliente_row(row: &rusqlite::Row) -> rusqlite::Result<Cliente> {
    Ok(Cliente {
        id: row.get(0)?,
        nombre: row.get(1)?,
        telefono: row.get(2)?,
        email: row.get(3)?,
        direccion: row.get(4)?,
        rfc: row.get(5)?,
        notas: row.get(6)?,
        activo: row.get::<_, i64>(7)? == 1,
        fecha_alta: row.get(8)?,
    })
}
