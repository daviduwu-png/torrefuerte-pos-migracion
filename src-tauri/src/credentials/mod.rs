//! Almacenamiento seguro de credenciales R2.
//!
//! Las credenciales (`r2_access`, `r2_secret`) se cifran con AES-256-GCM
//! usando una clave derivada del `/etc/machine-id` del sistema operativo.
//!
//! El archivo cifrado se guarda en `~/.torrefuerte_data/.r2_credentials`
//! con permisos 600 (solo lectura del usuario propietario).
//!
//! Esto garantiza que:
//!  - Las claves nunca tocan el archivo `.db` en texto plano.
//!  - El archivo cifrado es inútil en otra máquina (la clave depende del machine-id).
//!  - Un backup de Timeshift o Déjà Dup que incluya el archivo cifrado no filtra nada.

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;


// ──────────────────────────────────────────────────────────────────────────────
// Rutas
// ──────────────────────────────────────────────────────────────────────────────

fn get_credentials_path() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));

    let dir = home.join(".torrefuerte_data");
    let _ = fs::create_dir_all(&dir);
    dir.join(".r2_credentials")
}

// ──────────────────────────────────────────────────────────────────────────────
// Derivación de clave desde machine-id
// ──────────────────────────────────────────────────────────────────────────────

/// Lee el machine-id del sistema operativo.
/// - Linux / macOS: `/etc/machine-id`
/// - Windows:       clave de registro MachineGuid (fallback a un valor fijo)
fn get_machine_id() -> String {
    // Linux y macOS
    if let Ok(id) = fs::read_to_string("/etc/machine-id") {
        return id.trim().to_string();
    }
    // macOS alternativo
    if let Ok(id) = fs::read_to_string("/var/lib/dbus/machine-id") {
        return id.trim().to_string();
    }
    // Windows: leer desde registro (simplificado — en producción usar winreg)
    // Fallback: usar el nombre del host como entropía mínima
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "torrefuerte-fallback-key-2026".to_string())
}

/// Deriva una clave AES-256 (32 bytes) haciendo SHA-256 del machine-id
/// concatenado con un salt de aplicación fijo.
fn derive_key() -> [u8; 32] {
    let machine_id = get_machine_id();
    let input = format!("torrefuerte-pos-r2-key:{}", machine_id);
    let hash = Sha256::digest(input.as_bytes());
    hash.into()
}

// ──────────────────────────────────────────────────────────────────────────────
// Cifrado / descifrado
// ──────────────────────────────────────────────────────────────────────────────

/// Cifra un string con AES-256-GCM.
/// Retorna `[nonce (12 bytes) || ciphertext]` como Vec<u8>.
fn encrypt(plaintext: &str, key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(key.into());
    // generate_nonce usa OsRng para generar 12 bytes aleatorios (API oficial aes-gcm 0.10)
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| format!("Error al cifrar credenciales: {}", e))?;

    // Formato: nonce (12 bytes) + ciphertext
    let mut result = nonce.to_vec();
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

/// Descifra datos con AES-256-GCM.
/// Espera `[nonce (12 bytes) || ciphertext]`.
fn decrypt(data: &[u8], key: &[u8; 32]) -> Result<String, String> {
    if data.len() < 13 {
        return Err("Archivo de credenciales corrupto (muy corto)".to_string());
    }

    let (nonce_bytes, ciphertext) = data.split_at(12);
    let cipher = Aes256Gcm::new(key.into());
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Error al descifrar credenciales — máquina incorrecta o archivo corrupto".to_string())?;

    String::from_utf8(plaintext)
        .map_err(|e| format!("Error al decodificar credenciales: {}", e))
}

// ──────────────────────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────────────────────

/// Guarda las credenciales R2 cifradas en disco.
/// El archivo se crea con permisos 600 en sistemas Unix.
pub fn save_r2_credentials(access: &str, secret: &str) -> Result<(), String> {
    let key = derive_key();
    // Serializamos como JSON simple para poder agregar campos en el futuro
    let payload = format!(
        "{{\"access\":{},\"secret\":{}}}",
        serde_json::to_string(access).unwrap_or_default(),
        serde_json::to_string(secret).unwrap_or_default(),
    );

    let encrypted = encrypt(&payload, &key)?;
    let path = get_credentials_path();

    fs::write(&path, &encrypted)
        .map_err(|e| format!("Error al escribir archivo de credenciales: {}", e))?;

    // Restringir permisos a solo el usuario propietario (Unix)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&path)
            .map_err(|e| format!("Error al leer metadatos: {}", e))?
            .permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&path, perms)
            .map_err(|e| format!("Error al establecer permisos: {}", e))?;
    }

    Ok(())
}

/// Carga las credenciales R2 descifradas desde disco.
/// Retorna `(access_key, secret_key)`.
/// Si el archivo no existe o falla el descifrado, retorna strings vacíos.
pub fn load_r2_credentials() -> (String, String) {
    let path = get_credentials_path();

    if !path.exists() {
        return (String::new(), String::new());
    }

    let data = match fs::read(&path) {
        Ok(d) => d,
        Err(_) => return (String::new(), String::new()),
    };

    let key = derive_key();
    let json = match decrypt(&data, &key) {
        Ok(j) => j,
        Err(e) => {
            eprintln!("[credentials] {}", e);
            return (String::new(), String::new());
        }
    };

    let parsed: serde_json::Value = match serde_json::from_str(&json) {
        Ok(v) => v,
        Err(_) => return (String::new(), String::new()),
    };

    let access = parsed["access"].as_str().unwrap_or("").to_string();
    let secret = parsed["secret"].as_str().unwrap_or("").to_string();
    (access, secret)
}

/// Borra el archivo de credenciales del disco (p.ej. al deshabilitar R2).
pub fn clear_r2_credentials() {
    let path = get_credentials_path();
    let _ = fs::remove_file(path);
}
