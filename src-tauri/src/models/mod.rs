use serde::{Deserialize, Serialize};

/// Usuario del sistema
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Usuario {
    pub id: i64,
    pub nombre: String,
    pub email: String,
    pub rol: String, // 'admin' | 'normal'
}

/// Credenciales de login
#[derive(Debug, Deserialize)]
pub struct LoginCredentials {
    pub username: String,
    pub password: String,
}

/// Respuesta de login
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub message: String,
    pub user: Option<Usuario>,
}

/// Categoría de productos
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Categoria {
    pub id: i64,
    pub nombre: String,
}

/// Tipos de medida válidos
pub const TIPOS_MEDIDA: &[&str] = &[
    "UNIDAD", "ROLLO", "METRO", "KILO", "JUEGO", "SET", "LITRO", "GALON", "CAJA", "TRAMO"
];

/// Producto
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Producto {
    pub id: i64,
    pub codigo_barras: Option<String>,
    pub codigo_interno: Option<String>,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub marca: Option<String>,
    pub proveedor: String,
    pub tipo_medida: String, // UNIDAD, ROLLO, METRO, KILO, JUEGO, SET, LITRO, GALON, CAJA, TRAMO
    pub categoria_id: i64,
    pub precio_compra: f64,
    pub precio_venta: f64,
    pub precio_mayoreo: Option<f64>,
    pub precio_distribuidor: Option<f64>,
    pub facturable: bool,
    pub stock: f64,
}

/// Datos para crear/actualizar producto
#[derive(Debug, Deserialize)]
pub struct ProductoInput {
    pub id: Option<i64>,
    pub codigo_barras: Option<String>,
    pub codigo_interno: Option<String>,
    pub nombre: String,
    pub descripcion: Option<String>,
    pub marca: Option<String>,
    pub proveedor: Option<String>,
    pub tipo_medida: String,
    pub categoria_id: i64,
    pub precio_compra: f64,
    pub precio_venta: f64,
    pub precio_mayoreo: Option<f64>,
    pub precio_distribuidor: Option<f64>,
    pub facturable: bool,
    pub stock: f64,
}

/// Filtros para buscar productos
#[derive(Debug, Deserialize, Default)]
pub struct ProductoFiltros {
    pub categoria: Option<String>,
    pub marca: Option<String>,
    pub proveedor: Option<String>,
    pub limit: Option<i64>,
}

/// Item en el carrito de compras
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ItemCarrito {
    pub id: i64,
    pub cantidad: f64,
    pub precio_venta: f64,
}

/// Datos para generar un ticket
#[derive(Debug, Deserialize)]
pub struct TicketInput {
    pub productos: Vec<ItemCarrito>,
    pub total: f64,
    pub metodo_pago: String,
    pub dinero_recibido: f64,
    pub cambio: f64,
}

/// Ticket generado
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ticket {
    pub id: i64,
    pub folio_fiscal: String,
    pub metodo_pago: String,
    pub total: f64,
    pub direccion_local: String,
    pub nombre_local: String,
    pub dinero_recibido: f64,
    pub cambio: f64,
    pub usuario_id: Option<i64>,
    pub fecha: String,
}

/// Producto dentro de un ticket
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TicketProducto {
    pub producto_id: i64,
    pub nombre: String,
    pub cantidad: f64,
    pub devuelto: f64, // Cantidad devuelta
    pub precio_unitario: f64,
    pub subtotal: f64,
}

/// Ticket con productos
#[derive(Debug, Serialize, Deserialize)]
pub struct TicketConProductos {
    pub ticket: Ticket,
    pub productos: Vec<TicketProducto>,
}

/// Datos para realizar devolución
#[derive(Debug, Deserialize)]
pub struct DevolucionInput {
    pub ticket_id: i64,
    pub producto_id: i64,
    pub cantidad: f64,
    pub motivo: Option<String>,
}

/// Devolución registrada
#[derive(Debug, Serialize)]
pub struct Devolucion {
    pub id: i64,
    pub ticket_id: i64,
    pub folio_fiscal: String,
    pub producto: String,
    pub codigo_interno: Option<String>,
    pub cantidad: f64,
    pub motivo: Option<String>,
    pub usuario: Option<String>,
    pub fecha: String,
}

/// Resumen de corte de caja
#[derive(Debug, Serialize, Deserialize)]
pub struct CorteCaja {
    pub total_tickets: i64,
    pub total_venta: f64,
    pub total_efectivo: f64,
    pub total_tarjeta: f64,
    pub total_transferencia: f64,
    pub ticket_inicial: Option<i64>,
    pub ticket_final: Option<i64>,
    pub fecha: String,
}

/// Respuesta genérica de la API
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn success(message: &str, data: T) -> Self {
        Self {
            success: true,
            message: message.to_string(),
            data: Some(data),
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            message: message.to_string(),
            data: None,
        }
    }
}

/// Datos de ventas para reportes
#[derive(Debug, Serialize)]
pub struct VentasDiarias {
    pub labels: Vec<String>,
    pub ventas: Vec<f64>,
}

/// Estadísticas del dashboard
#[derive(Debug, Serialize)]
pub struct Estadisticas {
    pub ventas_hoy: f64,
    pub tickets_hoy: i64,
    pub total_productos: i64,
    pub stock_bajo: i64,
    pub devoluciones_hoy: i64,
    pub ticket_promedio: f64,
}
