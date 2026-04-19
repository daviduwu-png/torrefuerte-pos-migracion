use crate::commands::AppState;
use crate::models::ApiResponse;
use chrono::Local;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

// ==================== SISTEMA / BACKUPS ====================

/// Crear un respaldo de la base de datos de manera segura (usando VACUUM INTO)
#[tauri::command]
pub fn crear_respaldo(
    tipo: String, // "auto" o "manual"
    state: State<AppState>,
) -> ApiResponse<String> {
    // 1. Definir carpeta de destino
    let backup_dir = get_backup_dir(&tipo);

    if let Err(e) = fs::create_dir_all(&backup_dir) {
        return ApiResponse::error(&format!("No se pudo crear carpeta de respaldos: {}", e));
    }

    // 2. Generar nombre de archivo
    let fecha = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let prefix = if tipo == "auto" {
        "auto_backup_"
    } else {
        "backup_"
    };
    let filename = format!("{}{}.db", prefix, fecha);
    let backup_path = backup_dir.join(&filename);
    let backup_path_str = backup_path.to_string_lossy().to_string();

    // 3. Verificar intervalo para backups automáticos (1 por día)
    if tipo == "auto" {
        let today = Local::now().format("%Y-%m-%d").to_string();
        if let Some(last_date) = get_last_backup_date() {
            if last_date == today {
                return ApiResponse::success(
                    "Respaldo automático al día (omitido)",
                    "SKIPPED".to_string(),
                );
            }
        }
    }

    // 4. Ejecutar VACUUM INTO para respaldo seguro en caliente
    let conn = state.db.conn.lock().unwrap();
    // VACUUM INTO crea una copia consistente de la BD incluso si está en uso
    let sql = format!("VACUUM INTO '{}'", backup_path_str.replace("'", "''"));

    match conn.execute(&sql, []) {
        Ok(_) => {
            // Actualizar timestamp si es auto
            if tipo == "auto" {
                update_last_backup_timestamp();
            }

            // Limpieza de backups viejos
            limpiar_backups_antiguos(&backup_dir, if tipo == "auto" { 7 } else { 10 });

            ApiResponse::success("Respaldo creado exitosamente", backup_path_str)
        }
        Err(e) => ApiResponse::error(&format!("Error al generar respaldo base de datos: {}", e)),
    }
}

use base64::{engine::general_purpose, Engine as _};

/// Restaurar base de datos desde archivo subido (Base64)
#[tauri::command]
pub fn restaurar_base_datos(
    contenido: String,      // Recibimos Base64
    state: State<AppState>, // Necesitamos state para intentar cerrar la conexión si es posible (aunque en SQLite con r2d2 es difícil, intentaremos un checkpoint)
) -> ApiResponse<()> {
    // 1. Calcular rutas y crear directorios
    let db_path = get_db_path();
    let root_dir = get_backup_root_dir();
    let temp_dir = root_dir.join("Temp");
    fs::create_dir_all(&temp_dir).ok();

    let temp_restore_path = temp_dir.join("restore_temp.db");

    // 2. Decodificar Base64 a archivo temporal
    let decoded = match general_purpose::STANDARD.decode(&contenido) {
        Ok(d) => d,
        Err(e) => {
            return ApiResponse::error(&format!("Error al decodificar archivo de respaldo: {}", e))
        }
    };

    if let Err(e) = fs::write(&temp_restore_path, &decoded) {
        return ApiResponse::error(&format!("Error al escribir archivo temporal: {}", e));
    }

    // 3. Crear respaldo de seguridad PREVIO (PreRestauracion) de la BD actual
    let pre_restore_dir = root_dir.join("PreRestauracion");
    fs::create_dir_all(&pre_restore_dir).ok();

    let fecha = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let pre_restore_path = pre_restore_dir.join(format!("pre_restore_{}.db", fecha));

    // Bloquear conexión durante todo el proceso y forzar sincronización de WAL
    let mut db_conn = match state.db.conn.lock() {
        Ok(c) => c,
        Err(_) => return ApiResponse::error("No se pudo obtener acceso a la base de datos"),
    };

    let _ = db_conn.execute("PRAGMA wal_checkpoint(TRUNCATE);", []);

   
    // Esto asegura que SQLite libera el archivo .db y elimina el .db-wal antes de copiar
    let temp_conn = rusqlite::Connection::open_in_memory().unwrap();
    let old_conn = std::mem::replace(&mut *db_conn, temp_conn);
    drop(old_conn);

    // Intentamos hacer copia de seguridad del archivo ya liberado
    let _ = fs::copy(&db_path, &pre_restore_path);
    limpiar_backups_antiguos(&pre_restore_dir, 5);

    // 4. Reemplazar la base de datos con el archivo temporal
    let wal_path = db_path.with_extension("db-wal");
    let shm_path = db_path.with_extension("db-shm");

    // Borramos los archivos viejos (ahora que SQLite dejó de usarlos no habrá error de sistema)
    let _ = fs::remove_file(&db_path);
    let _ = fs::remove_file(&wal_path);
    let _ = fs::remove_file(&shm_path);

    // Copiar la nueva base de datos
    match fs::copy(&temp_restore_path, &db_path) {
        Ok(_) => {
            let _ = fs::remove_file(&temp_restore_path);

            // Reabrir conexión a la NUEVA base de datos y vincularla al Backend
            if let Ok(new_conn) = rusqlite::Connection::open(&db_path) {
                // Configurar SQLite como en la original
                let _ = new_conn.execute_batch(
                    "PRAGMA foreign_keys = ON;
                     PRAGMA journal_mode = WAL;
                     PRAGMA synchronous = NORMAL;",
                );
                let _ = std::mem::replace(&mut *db_conn, new_conn);
            }

            ApiResponse::success("Base de datos restaurada exitosamente.", ())
        }
        Err(e) => {
            // Si la copia falla, restauramos la copia de seguridad previa de emergencia
            let _ = fs::copy(&pre_restore_path, &db_path);
            if let Ok(restored_conn) = rusqlite::Connection::open(&db_path) {
                let _ = restored_conn.execute_batch(
                    "PRAGMA foreign_keys = ON;
                     PRAGMA journal_mode = WAL;
                     PRAGMA synchronous = NORMAL;",
                );
                let _ = std::mem::replace(&mut *db_conn, restored_conn);
            }
            ApiResponse::error(&format!("Error al copiar nueva base de datos: {}", e))
        }
    }
}

// ==================== HELPERS ====================

/// Obtiene el directorio HOME del usuario de forma multiplataforma.
/// - Linux / macOS: lee la variable de entorno HOME (/home/usuario)
/// - Windows:       lee la variable de entorno USERPROFILE (C:\Users\usuario)
/// - Fallback:      directorio actual (".")
fn get_home_dir() -> PathBuf {
    // HOME existe en Linux y macOS
    // USERPROFILE existe en Windows
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn get_db_path() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
        let path = PathBuf::from(manifest_dir)
            .parent()
            .unwrap()
            .join("db")
            .join("torrefuerte.db");
        // Asegurar que el directorio existe
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }
        path
    }
    #[cfg(not(debug_assertions))]
    {
        let home = get_home_dir();
        // Usar carpeta oculta para la BD principal para evitar borrados accidentales
        // y problemas de bloqueo/corrupción con servicios como Google Drive.
        let path = home.join(".torrefuerte_data").join("torrefuerte.db");
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }
        path
    }
}

fn get_backup_root_dir() -> PathBuf {
    let home = get_home_dir();
    home.join("TorreFuerte").join("Respaldos")
}

fn get_backup_dir(tipo: &str) -> PathBuf {
    let root = get_backup_root_dir();
    if tipo == "auto" {
        root.join("Automaticos")
    } else {
        root.join("Manuales")
    }
}

fn get_timestamp_file() -> PathBuf {
    let db_path = get_db_path();
    db_path.parent().unwrap().join("last_auto_backup.txt")
}

fn get_last_backup_date() -> Option<String> {
    let file = get_timestamp_file();
    if file.exists() {
        if let Ok(content) = fs::read_to_string(&file) {
            return Some(content.trim().to_string());
        }
    }
    None
}

fn update_last_backup_timestamp() {
    let file = get_timestamp_file();
    let today = Local::now().format("%Y-%m-%d").to_string();
    let _ = fs::write(file, today);
}

fn limpiar_backups_antiguos(dir: &Path, max_files: usize) {
    if let Ok(entries) = fs::read_dir(dir) {
        let mut files: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "db"))
            .collect();

        // Ordenar por fecha de modificación (más antiguo primero)
        files.sort_by_key(|e| e.metadata().and_then(|m| m.modified()).ok());

        // Borrar excedentes
        if files.len() > max_files {
            let to_delete = files.len() - max_files;
            for entry in files.iter().take(to_delete) {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
}
