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
    let prefix = if tipo == "auto" { "auto_backup_" } else { "backup_" };
    let filename = format!("{}{}.db", prefix, fecha);
    let backup_path = backup_dir.join(&filename);
    let backup_path_str = backup_path.to_string_lossy().to_string();

    // 3. Verificar intervalo para backups automáticos (24h)
    if tipo == "auto" {
        if let Some(last_time) = get_last_backup_timestamp() {
            let now = Local::now().timestamp();
            // 86400 segundos = 24 horas
            if now - last_time < 86400 {
                return ApiResponse::success("Respaldo automático al día (omitido)", "SKIPPED".to_string());
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
            
            ApiResponse::success(
                "Respaldo creado exitosamente", 
                backup_path_str
            )
        },
        Err(e) => ApiResponse::error(&format!("Error al generar respaldo base de datos: {}", e))
    }
}

use base64::{Engine as _, engine::general_purpose};

/// Restaurar base de datos desde archivo subido (Base64)
#[tauri::command]
pub fn restaurar_base_datos(
    contenido: String, // Recibimos Base64
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
        Err(e) => return ApiResponse::error(&format!("Error al decodificar archivo de respaldo: {}", e)),
    };

    if let Err(e) = fs::write(&temp_restore_path, &decoded) {
        return ApiResponse::error(&format!("Error al escribir archivo temporal: {}", e));
    }

    // 3. Crear respaldo de seguridad PREVIO (PreRestauracion) de la BD actual
    let pre_restore_dir = root_dir.join("PreRestauracion");
    fs::create_dir_all(&pre_restore_dir).ok();
    
    let fecha = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let pre_restore_path = pre_restore_dir.join(format!("pre_restore_{}.db", fecha));
    
    // Intentar forzar un checkpoint para que los datos del WAL pasen al DB principal antes de copiar
    {
        if let Ok(conn) = state.db.conn.lock() {
             let _ = conn.execute("PRAGMA wal_checkpoint(TRUNCATE);", []);
        }
    }

    // Intentamos hacer copia de seguridad de lo actual
    let _ = fs::copy(&db_path, &pre_restore_path);

    // Limpieza de backups antiguos en PreRestauracion (guardar últimos 5)
    limpiar_backups_antiguos(&pre_restore_dir, 5);

    // 4. Intentar Reemplazar la base de datos con el archivo temporal
    // Importante: Eliminar archivos auxiliares WAL y SHM para evitar inconsistencias
    let wal_path = db_path.with_extension("db-wal");
    let shm_path = db_path.with_extension("db-shm");
    
    // Intentar renombrar el archivo actual en lugar de sobrescribirlo directamente (truco para Windows)
    let old_db_renamed = db_path.with_file_name(format!("old_{}.db.tmp", fecha));
    
    // Paso crítico: Rename -> Copy -> Delete Old
    match fs::rename(&db_path, &old_db_renamed) {
        Ok(_) => {
            // Si pudimos renombrar, el archivo original "ya no existe" en esa ruta, copiamos el nuevo
             match fs::copy(&temp_restore_path, &db_path) {
                Ok(_) => {
                    // Limpieza exitosa
                    let _ = fs::remove_file(&temp_restore_path);
                    let _ = fs::remove_file(&wal_path); // Borrar WAL viejo
                    let _ = fs::remove_file(&shm_path); // Borrar SHM viejo
                    let _ = fs::remove_file(&old_db_renamed); // Borrar el viejo renombrado si se puede (si no, no importa, es tmp)
                    
                    ApiResponse::success(
                        "Base de datos restaurada. EL SISTEMA SE REINICIARÁ.", 
                        ()
                    )
                },
                Err(e) => {
                    // Si falla la copia, intentamos restaurar el original renombrado
                    let _ = fs::rename(&old_db_renamed, &db_path);
                     ApiResponse::error(&format!("Error al copiar nueva base de datos: {}", e))
                }
             }
        },
        Err(e) => {
            // Si falló el renombrado, intentamos copy normal (fallback)
             match fs::copy(&temp_restore_path, &db_path) {
                Ok(_) => {
                     let _ = fs::remove_file(&temp_restore_path);
                     let _ = fs::remove_file(&wal_path);
                     let _ = fs::remove_file(&shm_path);
                     ApiResponse::success("Base de datos restaurada (Método directo).", ())
                },
                Err(copy_err) => {
                     ApiResponse::error(&format!(
                        "No se pudo reemplazar el archivo (Bloqueado por sistema). Error: {}. \
                        Intenta cerrar todas las ventanas y reintentar.", 
                        copy_err
                    ))
                }
             }
        }
    }
}

// ==================== HELPERS ====================

fn get_db_path() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
        let path = PathBuf::from(manifest_dir).parent().unwrap().join("db").join("torrefuerte.db");
        // Asegurar que el directorio existe
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }
        path
    }
    #[cfg(not(debug_assertions))]
    {
        let user_profile = std::env::var("USERPROFILE").unwrap_or_default();
        let path = PathBuf::from(user_profile).join("Documents").join("TorreFuerte").join("torrefuerte.db");
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }
        path
    }
}

fn get_backup_root_dir() -> PathBuf {
    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(user_profile).join("Documents").join("Respaldos_TorreFuerte")
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

fn get_last_backup_timestamp() -> Option<i64> {
    let file = get_timestamp_file();
    if file.exists() {
        if let Ok(content) = fs::read_to_string(&file) {
            return content.trim().parse::<i64>().ok();
        }
    }
    None
}

fn update_last_backup_timestamp() {
    let file = get_timestamp_file();
    let now = Local::now().timestamp();
    let _ = fs::write(file, now.to_string());
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
