mod commands;
mod db;
mod models;

use commands::AppState;
use db::Database;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Obtener ruta de la base de datos
    let db_path = get_database_path();
    
    println!("Ruta de base de datos: {:?}", db_path);
    
    // Crear o abrir base de datos
    let database = Database::new(db_path)
        .expect("Error al abrir la base de datos");
    
    // Inicializar tablas
    database.init_tables()
        .expect("Error al inicializar tablas");
    
    // Crear estado de la aplicación
    let app_state = AppState {
        db: Arc::new(database),
        current_user: Mutex::new(None),
    };
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Autenticación
            commands::login,
            commands::logout,
            commands::get_current_user,
            
            // Productos
            commands::buscar_producto,
            commands::consultar_productos,
            commands::obtener_producto,
            commands::ingresar_producto,
            commands::guardar_producto,
            commands::eliminar_producto,
            commands::importar_productos_truper,
            commands::rellenar_stock_masivo,
            commands::imprimir_ticket,
            commands::imprimir_corte,
            commands::listar_impresoras,
            
            // Categorías y catálogos
            commands::obtener_categorias,
            commands::crear_categoria,
            commands::obtener_marcas,
            commands::obtener_proveedores,
            
            // Ventas
            commands::generar_ticket,
            commands::buscar_ticket,
            commands::listar_tickets,
            
            // Devoluciones
            commands::realizar_devolucion,
            commands::listar_devoluciones,
            
            // Reportes
            commands::obtener_corte_caja,
            commands::exportar_corte_excel,
            commands::exportar_reporte_financiero,
            commands::reporte_ventas_diarias,
            commands::reporte_ventas_semanales,
            commands::reporte_ventas_mensuales,
            commands::reporte_ventas_anuales,
            commands::obtener_estadisticas,

            // Sistema
            commands::crear_respaldo,
            commands::restaurar_base_datos,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Obtiene el directorio HOME del usuario de forma multiplataforma.
/// - Linux / macOS: variable de entorno HOME  -> /home/usuario
/// - Windows:       variable de entorno USERPROFILE -> C:\Users\usuario
/// - Fallback:      directorio actual
#[allow(dead_code)] // Se usa solo en cfg(not(debug_assertions)) — release build
fn get_home_dir() -> PathBuf {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

/// Obtener la ruta de la base de datos
fn get_database_path() -> PathBuf {
    // En desarrollo, usar la carpeta db del proyecto
    #[cfg(debug_assertions)]
    {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
            .unwrap_or_else(|_| ".".to_string());
        let db_path = PathBuf::from(&manifest_dir)
            .parent()
            .map(|p| p.join("db").join("torrefuerte.db"))
            .unwrap_or_else(|| PathBuf::from("torrefuerte.db"));
        
        // Crear directorio si no existe
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        
        return db_path;
    }
    
    // En producción, usar ~/.torrefuerte_data/ (funciona en Windows y Linux)
    #[cfg(not(debug_assertions))]
    {
        let home = get_home_dir();
        let db_path = home
            .join(".torrefuerte_data")
            .join("torrefuerte.db");
        
        // Crear directorio si no existe
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        
        db_path
    }
}
