use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::region::Region;
use std::fs;
use std::path::Path;

pub async fn upload_backup_to_r2(
    file_path: &Path,
    tipo: &str,          // "auto" | "corte" | "manual"
    access_key: &str,
    secret_key: &str,
    endpoint: &str,
    bucket_name: &str,
) -> Result<(), String> {
    // Leer archivo a subir
    let file_data = fs::read(file_path)
        .map_err(|e| format!("Error al leer el archivo de backup: {}", e))?;

    let file_name = file_path
        .file_name()
        .unwrap_or_default()
        .to_str()
        .unwrap_or("backup.db");

    // Extraer el Account ID del endpoint provisto por el usuario
    let account_id = endpoint
        .replace("https://", "")
        .replace("http://", "")
        .replace(".r2.cloudflarestorage.com", "")
        .trim_end_matches('/')
        .to_string();

    // rust-s3 tiene soporte nativo para Cloudflare R2
    let region = Region::R2 {
        account_id,
    };

    let credentials = Credentials::new(
        Some(access_key),
        Some(secret_key),
        None,
        None,
        None,
    ).map_err(|e| format!("Error en credenciales R2: {}", e))?;

    let bucket = Bucket::new(
        bucket_name,
        region,
        credentials,
    ).map_err(|e| format!("Error al configurar Bucket R2: {}", e))?
    .with_path_style();

    // Subir archivo organizado en carpetas por tipo dentro del bucket
    // Ejemplo: /auto/auto_backup_2026-08-09_08-00-00.db
    let key = format!("/{}/{}", tipo, file_name);
    let response = bucket
        .put_object(&key, &file_data)
        .await
        .map_err(|e| format!("Error de red al subir a R2: {}", e))?;

    let code = response.status_code();

    if code == 200 || code == 201 {
        Ok(())
    } else {
        Err(format!("R2 respondió con código HTTP: {}", code))
    }
}

pub async fn delete_object_from_r2(
    key: &str,
    access_key: &str,
    secret_key: &str,
    endpoint: &str,
    bucket_name: &str,
) -> Result<(), String> {
    let account_id = endpoint
        .replace("https://", "")
        .replace("http://", "")
        .replace(".r2.cloudflarestorage.com", "")
        .trim_end_matches('/')
        .to_string();

    let region = Region::R2 { account_id };

    let credentials = Credentials::new(
        Some(access_key),
        Some(secret_key),
        None,
        None,
        None,
    ).map_err(|e| format!("Error en credenciales R2: {}", e))?;

    let bucket = Bucket::new(bucket_name, region, credentials)
        .map_err(|e| format!("Error al configurar Bucket R2: {}", e))?
        .with_path_style();

    let response = bucket
        .delete_object(key)
        .await
        .map_err(|e| format!("Error al eliminar objeto de R2: {}", e))?;

    let code = response.status_code();
    if code == 200 || code == 204 {
        Ok(())
    } else {
        Err(format!("R2 respondió con código {} al eliminar", code))
    }
}
