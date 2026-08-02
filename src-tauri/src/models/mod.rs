#![allow(dead_code)] // Structs son usados por serde (deserialización de Tauri), no por construcción explícita.
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
#[allow(dead_code)]
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
    "UNIDAD", "ROLLO", "METRO", "KILO", "JUEGO", "SET", "LITRO", "GALON", "CAJA", "TRAMO",
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
    pub tipo_medida: String,
    pub categoria_id: i64,
    pub precio_compra: f64,
    pub precio_venta: f64,
    pub precio_mayoreo: Option<f64>,
    pub precio_distribuidor: Option<f64>,
    pub facturable: bool,
    pub stock: f64,
    pub precio_compra_incluye_iva: bool,
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
    #[serde(default)]
    pub precio_compra_incluye_iva: bool,
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
    pub codigo_interno: Option<String>, 
    pub cantidad: f64,
    pub devuelto: f64, 
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
#[allow(dead_code)] // Reservada para el endpoint obtener_estadisticas
#[derive(Debug, Serialize)]
pub struct Estadisticas {
    pub ventas_hoy: f64,
    pub tickets_hoy: i64,
    pub total_productos: i64,
    pub stock_bajo: i64,
    pub devoluciones_hoy: i64,
    pub ticket_promedio: f64,
}

// ============================================================
// MÓDULO CLIENTES
// ============================================================

/// Cliente del directorio
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cliente {
    pub id: i64,
    pub nombre: String,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub direccion: Option<String>,
    pub rfc: Option<String>,
    pub notas: Option<String>,
    pub activo: bool,
    pub fecha_alta: String,
}

/// Datos para crear / actualizar un cliente
#[derive(Debug, Deserialize)]
pub struct ClienteInput {
    pub id: Option<i64>,
    pub nombre: String,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub direccion: Option<String>,
    pub rfc: Option<String>,
    pub notas: Option<String>,
}

/// Cuenta por cobrar
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CuentaPorCobrar {
    pub id: i64,
    pub cliente_id: i64,
    pub cliente_nombre: String,
    pub ticket_id: Option<i64>,
    pub concepto: String,
    pub monto_original: f64,
    pub monto_pendiente: f64,
    pub fecha: String,
    pub estado: String,
}

/// Datos para registrar una deuda
#[derive(Debug, Deserialize)]
pub struct CuentaInput {
    pub cliente_id: i64,
    pub ticket_id: Option<i64>,
    pub concepto: String,
    pub monto: f64,
}

/// Abono aplicado a una cuenta por cobrar
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Abono {
    pub id: i64,
    pub cuenta_id: i64,
    pub monto: f64,
    pub metodo_pago: String,
    pub fecha: String,
    pub notas: Option<String>,
}

/// Datos para registrar un abono
#[derive(Debug, Deserialize)]
pub struct AbonoInput {
    pub cuenta_id: i64,
    pub monto: f64,
    pub metodo_pago: String,
    pub notas: Option<String>,
}

/// Resumen total de deudas del sistema
#[derive(Debug, Serialize)]
pub struct ResumenDeudas {
    pub total_pendiente: f64,
    pub total_cuentas: i64,
    pub cuentas_saldadas_hoy: i64,
}

// ============================================================
// MÓDULO COTIZACIONES
// ============================================================

/// Cabecera de una cotización persistida
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cotizacion {
    pub id: i64,
    pub cliente_id: Option<i64>,
    pub cliente_ref: Option<String>,
    pub total: f64,
    pub notas: Option<String>,
    pub estado: String,
    pub usuario_id: Option<i64>,
    pub fecha: String,
}

/// Item individual al crear una cotización
#[derive(Debug, Deserialize)]
pub struct ItemCotizacionInput {
    pub producto_id: i64,
    pub cantidad: f64,
    pub precio_unitario: f64,
}

/// Datos para crear una cotización
#[derive(Debug, Deserialize)]
pub struct CotizacionInput {
    pub cliente_id: Option<i64>,
    pub cliente_ref: Option<String>,
    pub items: Vec<ItemCotizacionInput>,
    pub notas: Option<String>,
}

/// Producto dentro de una cotización (para respuesta)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CotizacionProducto {
    pub producto_id: i64,
    pub nombre: String,
    pub codigo_interno: Option<String>,
    pub cantidad: f64,
    pub precio_unitario: f64,
    pub subtotal: f64,
}

/// Cotización con su detalle de productos
#[derive(Debug, Serialize)]
pub struct CotizacionConProductos {
    pub cotizacion: Cotizacion,
    pub productos: Vec<CotizacionProducto>,
}

// ============================================================
// MÓDULO PEDIDOS A PROVEEDOR
// ============================================================

/// Cabecera de un pedido a proveedor
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PedidoProveedor {
    pub id: i64,
    pub proveedor: String,
    pub marca: Option<String>,
    pub notas: Option<String>,
    pub estado: String,
    pub usuario_id: Option<i64>,
    pub fecha: String,
    pub total_items: i64,
}

/// Item al crear un pedido
#[derive(Debug, Deserialize)]
pub struct ItemPedidoInput {
    pub producto_id: i64,
    pub cantidad_pedida: f64,
    pub precio_estimado: Option<f64>,
}

/// Datos para crear un pedido
#[derive(Debug, Deserialize)]
pub struct PedidoInput {
    pub proveedor: String,
    pub marca: Option<String>,
    pub items: Vec<ItemPedidoInput>,
    pub notas: Option<String>,
}

/// Item para recepción parcial/total
#[derive(Debug, Deserialize)]
pub struct RecepcionItem {
    pub producto_id: i64,
    pub cantidad_recibida: f64,
}

/// Producto dentro de un pedido (para respuesta)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PedidoProducto {
    pub producto_id: i64,
    pub nombre: String,
    pub codigo_interno: Option<String>,
    pub cantidad_pedida: f64,
    pub cantidad_recibida: f64,
    pub precio_estimado: Option<f64>,
}

/// Pedido con su detalle de productos
#[derive(Debug, Serialize)]
pub struct PedidoConProductos {
    pub pedido: PedidoProveedor,
    pub productos: Vec<PedidoProducto>,
}

// ============================================================
// APARTADOS
// ============================================================

/// Producto dentro del input de un apartado
#[derive(Debug, Deserialize)]
pub struct ItemApartadoInput {
    pub producto_id: i64,
    pub cantidad: f64,
    pub precio_unitario: f64,
}

/// Input para crear un apartado nuevo
#[derive(Debug, Deserialize)]
pub struct ApartadoInput {
    pub cliente_id: i64,
    pub items: Vec<ItemApartadoInput>,
    pub notas: Option<String>,
}

/// Un apartado tal como se lista (resumen)
#[derive(Debug, Serialize)]
pub struct Apartado {
    pub id: i64,
    pub cliente_id: i64,
    pub cliente_nombre: String,
    pub total: f64,
    pub monto_pagado: f64,
    pub monto_pendiente: f64,
    pub notas: Option<String>,
    pub estado: String,   // "activo" | "cancelado" | "liquidado"
    pub fecha: String,
    pub fecha_liquidado: Option<String>,
    pub ticket_id: Option<i64>,
    pub total_productos: i64,
}

/// Un producto dentro de un apartado (detalle)
#[derive(Debug, Serialize)]
pub struct ApartadoProducto {
    pub producto_id: i64,
    pub nombre: String,
    pub codigo_interno: Option<String>,
    pub cantidad: f64,
    pub precio_unitario: f64,
    pub subtotal: f64,
}

/// Apartado con su detalle de productos
#[derive(Debug, Serialize)]
pub struct ApartadoConProductos {
    pub apartado: Apartado,
    pub productos: Vec<ApartadoProducto>,
    pub abonos: Vec<Abono>,
}

/// Input para registrar un abono a un apartado
#[derive(Debug, Deserialize)]
pub struct AbonoApartadoInput {
    pub apartado_id: i64,
    pub monto: f64,
    pub metodo_pago: String,
    pub notas: Option<String>,
}
