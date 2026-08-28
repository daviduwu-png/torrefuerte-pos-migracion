use crate::commands::AppState;
use crate::models::*;
use rusqlite::params;
use tauri::State;

/// Obtener todas las categorías
#[tauri::command]
pub fn obtener_categorias(state: State<AppState>) -> ApiResponse<Vec<Categoria>> {
    let conn = state.db.conn.lock().unwrap();

    let mut stmt = conn
        .prepare("SELECT id, nombre FROM categoria ORDER BY nombre")
        .unwrap();

    let categorias: Vec<Categoria> = stmt
        .query_map([], |row| {
            Ok(Categoria {
                id: row.get(0)?,
                nombre: row.get(1)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success("Categorías obtenidas", categorias)
}

/// Crear nueva categoría
#[tauri::command]
pub fn crear_categoria(nombre: String, state: State<AppState>) -> ApiResponse<i64> {
    let conn = state.db.conn.lock().unwrap();

    let nombre_upper = nombre.to_uppercase();

    let result = conn.execute(
        "INSERT INTO categoria (nombre) VALUES (?)",
        params![nombre_upper],
    );

    match result {
        Ok(_) => {
            let id = conn.last_insert_rowid();
            ApiResponse::success("Categoría creada", id)
        }
        Err(e) => {
            if e.to_string().contains("UNIQUE") {
                ApiResponse::error("La categoría ya existe")
            } else {
                ApiResponse::error(&format!("Error al crear categoría: {}", e))
            }
        }
    }
}

/// Obtener marcas únicas
#[tauri::command]
pub fn obtener_marcas(state: State<AppState>) -> ApiResponse<Vec<String>> {
    let conn = state.db.conn.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT DISTINCT marca FROM producto WHERE marca IS NOT NULL AND marca != '' ORDER BY marca"
    ).unwrap();

    let marcas: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success("Marcas obtenidas", marcas)
}

/// Obtener proveedores únicos
#[tauri::command]
pub fn obtener_proveedores(state: State<AppState>) -> ApiResponse<Vec<String>> {
    let conn = state.db.conn.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT DISTINCT proveedor FROM producto WHERE proveedor IS NOT NULL AND proveedor != '' ORDER BY proveedor"
    ).unwrap();

    let proveedores: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success("Proveedores obtenidos", proveedores)
}
