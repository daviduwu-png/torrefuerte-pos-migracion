use crate::commands::AppState;
use crate::models::*;
use bcrypt::verify;
use rusqlite::params;
use tauri::State;

/// Login de usuario (busca por nombre o email)
#[tauri::command]
pub fn login(username: String, password: String, state: State<AppState>) -> LoginResponse {
    let conn = state.db.conn.lock().unwrap();

    let result = conn.query_row(
        "SELECT id, nombre, email, contraseña, rol FROM usuario WHERE nombre = ? OR email = ?",
        params![&username, &username],
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        },
    );

    match result {
        Ok((id, nombre, email, hash_password, rol)) => {
            // Verificar contraseña con bcrypt
            match verify(&password, &hash_password) {
                Ok(true) => {
                    let user = Usuario {
                        id,
                        nombre: nombre.clone(),
                        email,
                        rol: rol.clone(),
                    };

                    // Guardar usuario en estado
                    *state.current_user.lock().unwrap() = Some(user.clone());

                    LoginResponse {
                        success: true,
                        message: "Inicio de sesión exitoso.".to_string(),
                        user: Some(user),
                    }
                }
                _ => LoginResponse {
                    success: false,
                    message: "Contraseña incorrecta.".to_string(),
                    user: None,
                },
            }
        }
        Err(_) => LoginResponse {
            success: false,
            message: "Usuario no encontrado.".to_string(),
            user: None,
        },
    }
}

/// Logout de usuario
#[tauri::command]
pub fn logout(state: State<AppState>) -> ApiResponse<()> {
    *state.current_user.lock().unwrap() = None;
    ApiResponse::success("Sesión cerrada correctamente.", ())
}

/// Obtener usuario actual
#[tauri::command]
pub fn get_current_user(state: State<AppState>) -> Option<Usuario> {
    state.current_user.lock().unwrap().clone()
}
