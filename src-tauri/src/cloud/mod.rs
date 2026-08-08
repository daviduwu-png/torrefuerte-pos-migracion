use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::region::Region;
use std::fs;
use std::path::Path;

pub async fn upload_backup_to_r2(
    file_path: &Path,
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

    // Subir archivo
    let response = bucket
        .put_object(format!("/{}", file_name), &file_data)
        .await
        .map_err(|e| format!("Error de red al subir a R2: {}", e))?;

    let code = response.status_code();

    if code == 200 || code == 201 {
        Ok(())
    } else {
        Err(format!("R2 respondió con código HTTP: {}", code))
    }
}
