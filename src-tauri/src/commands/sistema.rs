use crate::commands::AppState;
use crate::models::ApiResponse;
use chrono::Local;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;
use std::collections::HashMap;

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
    let prefix = match tipo.as_str() {
        "auto"  => "auto_backup_",
        "corte" => "corte_backup_",
        _       => "backup_",
    };
    let filename = format!("{}{}.db", prefix, fecha);
    let backup_path = backup_dir.join(&filename);
    let backup_path_str = backup_path.to_string_lossy().to_string();

    // 3. Verificar intervalo — "auto" y "corte" tienen límite de 1 por día cada uno
    //    "manual" siempre se genera sin restricción
    if tipo == "auto" || tipo == "corte" {
        let today = Local::now().format("%Y-%m-%d").to_string();
        if let Some(last_date) = get_last_backup_date_for(&tipo) {
            if last_date == today {
                return ApiResponse::success(
                    &format!("Respaldo '{}' al día (omitido)", tipo),
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
            // Actualizar timestamp si es auto o corte
            if tipo == "auto" || tipo == "corte" {
                update_last_backup_timestamp_for(&tipo);
            }

            // Limpieza de backups viejos por tipo
            let max = match tipo.as_str() {
                "auto"  => 7,
                "corte" => 7,
                _       => 10,
            };
            limpiar_backups_antiguos(&backup_dir, max);

            // INTENTO DE SUBIDA A CLOUDFLARE R2
            let mut r2_access = String::new();
            let mut r2_secret = String::new();
            let mut r2_endpoint = String::new();
            let mut r2_bucket = String::new();
            let mut r2_enabled = false;
            
            if let Ok(mut stmt) = conn.prepare("SELECT clave, valor FROM configuracion WHERE clave LIKE 'r2_%'") {
                let rows = stmt.query_map([], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                });
                if let Ok(iter) = rows {
                    for row in iter.flatten() {
                        match row.0.as_str() {
                            "r2_access" => r2_access = row.1,
                            "r2_secret" => r2_secret = row.1,
                            "r2_endpoint" => r2_endpoint = row.1,
                            "r2_bucket" => r2_bucket = row.1,
                            "r2_enabled" => r2_enabled = row.1 == "true",
                            _ => {}
                        }
                    }
                }
            }

            if r2_enabled && !r2_access.is_empty() && !r2_secret.is_empty() {
                let backup_path_clone = backup_path.clone();
                tauri::async_runtime::spawn(async move {
                    println!("Iniciando subida de backup a R2...");
                    if let Err(e) = crate::cloud::upload_backup_to_r2(
                        &backup_path_clone, 
                        &r2_access, 
                        &r2_secret, 
                        &r2_endpoint, 
                        &r2_bucket
                    ).await {
                        eprintln!("Error al subir backup a R2: {}", e);
                    } else {
                        println!("Backup subido exitosamente a R2");
                    }
                });
            }

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

            // Soltamos el lock antes de llamar a init_tables para evitar deadlock
            drop(db_conn);
            
            // Ejecutamos las migraciones sobre la base de datos recién restaurada
            if let Err(e) = state.db.init_tables() {
                return ApiResponse::error(&format!("Restaurada con éxito, pero falló la migración: {}", e));
            }

            ApiResponse::success("Base de datos restaurada y actualizada exitosamente.", ())
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

// ==================== CONFIGURACION ====================

#[tauri::command]
pub fn obtener_configuracion(state: State<AppState>) -> ApiResponse<HashMap<String, String>> {
    let conn = state.db.conn.lock().unwrap();
    let mut stmt = match conn.prepare("SELECT clave, valor FROM configuracion") {
        Ok(s) => s,
        Err(e) => return ApiResponse::error(&format!("Error preparando consulta: {}", e)),
    };
    
    let mut config = HashMap::new();
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    });
    
    match rows {
        Ok(iter) => {
            for row in iter {
                if let Ok((k, v)) = row {
                    config.insert(k, v);
                }
            }
            ApiResponse::success("Configuración obtenida", config)
        },
        Err(e) => ApiResponse::error(&format!("Error leyendo configuración: {}", e))
    }
}

#[tauri::command]
pub fn guardar_configuracion(
    config: HashMap<String, String>,
    state: State<AppState>
) -> ApiResponse<()> {
    let mut conn = state.db.conn.lock().unwrap();
    let tx = match conn.transaction() {
        Ok(t) => t,
        Err(e) => return ApiResponse::error(&format!("Error iniciando transacción: {}", e)),
    };
    
    for (k, v) in config {
        let _ = tx.execute(
            "INSERT INTO configuracion (clave, valor) VALUES (?1, ?2) 
             ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor",
            [&k, &v]
        );
    }
    
    match tx.commit() {
        Ok(_) => ApiResponse::success("Configuración guardada", ()),
        Err(e) => ApiResponse::error(&format!("Error guardando configuración: {}", e)),
    }
}

#[tauri::command]
pub fn actualizar_nombre_local_tickets(state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();
    // Obtener configuración
    let mut stmt = match conn.prepare("SELECT clave, valor FROM configuracion WHERE clave LIKE 'ticket_%'") {
        Ok(s) => s,
        Err(e) => return ApiResponse::error(&format!("Error preparando consulta: {}", e)),
    };
    
    let config_map: std::collections::HashMap<String, String> = match stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?))) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(_) => std::collections::HashMap::new(),
    };

    let nombre_local = config_map.get("ticket_nombre_local").cloned().unwrap_or_else(|| "NOMBRE DEL LOCAL".to_string());
    let rfc = config_map.get("ticket_rfc").cloned().unwrap_or_else(|| "".to_string());
    let direccion_local = config_map.get("ticket_direccion_1").cloned().unwrap_or_else(|| "".to_string());
    let direccion_local_2 = config_map.get("ticket_direccion_2").cloned().unwrap_or_else(|| "".to_string());
    let direccion_local_3 = config_map.get("ticket_direccion_3").cloned().unwrap_or_else(|| "".to_string());
    
    // update all tickets
    match conn.execute(
        "UPDATE ticket SET nombre_local = ?1, rfc = ?2, direccion_local = ?3, direccion_local_2 = ?4, direccion_local_3 = ?5", 
        [&nombre_local, &rfc, &direccion_local, &direccion_local_2, &direccion_local_3]
    ) {
        Ok(_) => ApiResponse::success("Tickets actualizados", ()),
        Err(e) => ApiResponse::error(&format!("Error actualizando tickets: {}", e)),
    }
}


#[tauri::command]
pub async fn probar_conexion_r2(
    access_key: String,
    secret_key: String,
    endpoint: String,
    bucket_name: String,
) -> ApiResponse<String> {
    use crate::cloud::upload_backup_to_r2;
    // archivo temporal pequeño
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join("test_r2_connection.txt");
    if let Err(_) = std::fs::write(&temp_file, b"test de conexion torrefuerte pos") {
        return ApiResponse::error("No se pudo crear archivo temporal para prueba");
    }
    match upload_backup_to_r2(&temp_file, &access_key, &secret_key, &endpoint, &bucket_name).await {
        Ok(_) => {
            let _ = std::fs::remove_file(&temp_file);
            ApiResponse::success("Conexión a R2 exitosa", "OK".to_string())
        },
        Err(e) => {
            let _ = std::fs::remove_file(&temp_file);
            ApiResponse::error(&format!("Falló la conexión a R2: {}", e))
        },
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
    match tipo {
        "auto"  => root.join("Automaticos"),
        "corte" => root.join("Corte"),
        _       => root.join("Manuales"),
    }
}

fn get_timestamp_file_for(tipo: &str) -> PathBuf {
    let db_path = get_db_path();
    let filename = match tipo {
        "corte" => "last_corte_backup.txt",
        _       => "last_auto_backup.txt",
    };
    db_path.parent().unwrap().join(filename)
}

// Mantener compatibilidad hacia atrás
fn get_timestamp_file() -> PathBuf {
    get_timestamp_file_for("auto")
}

fn get_last_backup_date_for(tipo: &str) -> Option<String> {
    let file = get_timestamp_file_for(tipo);
    if file.exists() {
        if let Ok(content) = fs::read_to_string(&file) {
            return Some(content.trim().to_string());
        }
    }
    None
}

fn get_last_backup_date() -> Option<String> {
    get_last_backup_date_for("auto")
}

fn update_last_backup_timestamp_for(tipo: &str) {
    let file = get_timestamp_file_for(tipo);
    let today = Local::now().format("%Y-%m-%d").to_string();
    let _ = fs::write(file, today);
}

fn update_last_backup_timestamp() {
    update_last_backup_timestamp_for("auto");
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
