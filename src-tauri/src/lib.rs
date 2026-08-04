mod commands;
mod db;
mod models;
mod cloud;
// Aliases for Tauri's generate_handler! — it needs the exact module path
// where each #[command] function (and its __cmd__* helper) lives.
use commands::impresion::ticket::imprimir_ticket;
use commands::impresion::corte::imprimir_corte;
use commands::impresion::test_page::imprimir_test;
use commands::impresion::diagnostico::{listar_impresoras, registrar_impresora_cups};
use commands::impresion::barcode::imprimir_codigos_barras;
use commands::impresion::barcode::asignar_codigo_barras;

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
            imprimir_ticket,
            imprimir_corte,
            imprimir_test,
            listar_impresoras,
            registrar_impresora_cups,
            imprimir_codigos_barras,
            asignar_codigo_barras,
            
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
            commands::obtener_configuracion,
            commands::guardar_configuracion,
            commands::probar_conexion_r2,

            // Clientes — Directorio
            commands::listar_clientes,
            commands::obtener_cliente,
            commands::guardar_cliente,
            commands::eliminar_cliente,

            // Usuarios
            commands::listar_usuarios,
            commands::guardar_usuario,
            commands::eliminar_usuario,

            // Cotizaciones
            commands::guardar_cotizacion,
            commands::listar_cotizaciones,
            commands::obtener_cotizacion,
            commands::cambiar_estado_cotizacion,
            commands::eliminar_cotizacion,

            // Pedidos a proveedor
            commands::guardar_pedido,
            commands::listar_pedidos,
            commands::obtener_pedido,
            commands::recibir_pedido,
            commands::cambiar_estado_pedido,

            // Apartados
            commands::crear_apartado,
            commands::listar_apartados,
            commands::obtener_apartado,
            commands::abonar_apartado,
            commands::liquidar_apartado,
            commands::cancelar_apartado,

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
