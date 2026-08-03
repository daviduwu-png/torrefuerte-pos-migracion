use crate::commands::AppState;
use crate::models::{ApiResponse, Usuario};
use bcrypt::{hash, DEFAULT_COST};
use rusqlite::params;
use serde::Deserialize;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct UsuarioInput {
    pub id: Option<i64>,
    pub nombre: String,
    pub email: String,
    pub password: Option<String>,
    pub rol: String,
}

#[tauri::command]
pub fn listar_usuarios(state: State<AppState>) -> ApiResponse<Vec<Usuario>> {
    let conn = state.db.conn.lock().unwrap();

    let mut stmt = match conn.prepare("SELECT id, nombre, email, rol FROM usuario ORDER BY nombre") {
        Ok(s) => s,
        Err(e) => return ApiResponse::error(&format!("Error preparando consulta: {}", e)),
    };

    let mapped_rows = match stmt.query_map(params![], |row| {
        Ok(Usuario {
            id: row.get(0)?,
            nombre: row.get(1)?,
            email: row.get(2)?,
            rol: row.get(3)?,
        })
    }) {
        Ok(iter) => iter,
        Err(e) => return ApiResponse::error(&format!("Error en consulta: {}", e)),
    };


    let usuarios: Vec<Usuario> = mapped_rows
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success("Usuarios obtenidos", usuarios)
}

#[tauri::command]
pub fn guardar_usuario(usuario: UsuarioInput, state: State<AppState>) -> ApiResponse<i64> {
    let conn = state.db.conn.lock().unwrap();

    let nombre = usuario.nombre.trim();
    let email = usuario.email.trim();
    let rol = usuario.rol.trim();

    if nombre.is_empty() || email.is_empty() {
        return ApiResponse::error("Nombre y email son obligatorios");
    }

    if let Some(id) = usuario.id {
        // Actualizar
        if let Some(ref pwd) = usuario.password {
            if !pwd.is_empty() {
                let hashed = match hash(pwd, DEFAULT_COST) {
                    Ok(h) => h,
                    Err(_) => return ApiResponse::error("Error encriptando contraseña"),
                };
                let res = conn.execute(
                    "UPDATE usuario SET nombre = ?, email = ?, contraseña = ?, rol = ? WHERE id = ?",
                    params![nombre, email, hashed, rol, id],
                );
                match res {
                    Ok(_) => return ApiResponse::success("Usuario actualizado con contraseña", id),
                    Err(e) => {
                        if e.to_string().contains("UNIQUE") {
                            return ApiResponse::error("El email ya está registrado");
                        }
                        return ApiResponse::error(&format!("Error al actualizar: {}", e));
                    }
                }
            }
        }

        // Actualizar sin contraseña
        let res = conn.execute(
            "UPDATE usuario SET nombre = ?, email = ?, rol = ? WHERE id = ?",
            params![nombre, email, rol, id],
        );
        match res {
            Ok(_) => ApiResponse::success("Usuario actualizado", id),
            Err(e) => {
                if e.to_string().contains("UNIQUE") {
                    ApiResponse::error("El email ya está registrado")
                } else {
                    ApiResponse::error(&format!("Error al actualizar: {}", e))
                }
            }
        }
    } else {
        // Crear
        let pwd = match usuario.password {
            Some(p) if !p.is_empty() => p,
            _ => return ApiResponse::error("Contraseña obligatoria para nuevo usuario"),
        };
        let hashed = match hash(pwd, DEFAULT_COST) {
            Ok(h) => h,
            Err(_) => return ApiResponse::error("Error encriptando contraseña"),
        };

        let res = conn.execute(
            "INSERT INTO usuario (nombre, email, contraseña, rol) VALUES (?, ?, ?, ?)",
            params![nombre, email, hashed, rol],
        );
        match res {
            Ok(_) => ApiResponse::success("Usuario creado", conn.last_insert_rowid()),
            Err(e) => {
                if e.to_string().contains("UNIQUE") {
                    ApiResponse::error("El email ya está registrado")
                } else {
                    ApiResponse::error(&format!("Error al crear usuario: {}", e))
                }
            }
        }
    }
}

#[tauri::command]
pub fn eliminar_usuario(id: i64, state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();

    let tickets: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ticket WHERE usuario_id = ?",
        params![id],
        |row| row.get(0)
    ).unwrap_or(0);

    if tickets > 0 {
        return ApiResponse::error("No se puede eliminar: el usuario tiene ventas asociadas");
    }

    let res = conn.execute("DELETE FROM usuario WHERE id = ?", params![id]);
    match res {
        Ok(_) => ApiResponse::success("Usuario eliminado", ()),
        Err(e) => ApiResponse::error(&format!("Error al eliminar usuario: {}", e)),
    }
}
