use std::path::PathBuf;

/// Obtiene el directorio HOME del usuario de forma multiplataforma.
/// - Linux / macOS: variable de entorno HOME  -> /home/usuario
/// - Windows:       variable de entorno USERPROFILE -> C:\Users\usuario
/// - Fallback:      directorio actual
pub fn get_home_dir() -> PathBuf {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}
