export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "normal";
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: Usuario;
}

// ── Genérico ──────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// ── Catálogo ──────────────────────────────────────────────
export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id: number;
  codigo_barras?: string;
  codigo_interno?: string;
  nombre: string;
  descripcion?: string;
  marca?: string;
  proveedor: string;
  tipo_medida: string;
  categoria_id: number;
  precio_compra: number;
  precio_venta: number;
  precio_mayoreo?: number;
  precio_distribuidor?: number;
  facturable: boolean;
  stock: number;
  precio_compra_incluye_iva: boolean;
}

export interface ProductoInput {
  id?: number;
  codigo_barras?: string;
  codigo_interno?: string;
  nombre: string;
  descripcion?: string;
  marca?: string;
  proveedor?: string;
  tipo_medida: string;
  categoria_id: number;
  precio_compra: number;
  precio_venta: number;
  precio_mayoreo?: number;
  precio_distribuidor?: number;
  facturable: boolean;
  stock: number;
  precio_compra_incluye_iva: boolean;
}

export interface ProductoFiltros {
  categoria?: string;
  marca?: string;
  proveedor?: string;
  limit?: number;
}

// ── Ventas / Tickets ──────────────────────────────────────
export interface ItemCarrito {
  id: number;
  cantidad: number;
  precio_venta: number;
}

export interface TicketInput {
  productos: ItemCarrito[];
  total: number;
  metodo_pago: string;
  dinero_recibido: number;
  cambio: number;
}

export interface Ticket {
  id: number;
  folio_fiscal: string;
  metodo_pago: string;
  total: number;
  direccion_local: string;
  nombre_local: string;
  dinero_recibido: number;
  cambio: number;
  usuario_id?: number;
  fecha: string;
}

export interface TicketProducto {
  producto_id: number;
  nombre: string;
  codigo_interno?: string;
  cantidad: number;
  devuelto?: number;
  precio_unitario: number;
  subtotal: number;
}

export interface TicketConProductos {
  ticket: Ticket;
  productos: TicketProducto[];
}

// ── Devoluciones ──────────────────────────────────────────
export interface DevolucionInput {
  ticket_id: number;
  producto_id: number;
  cantidad: number;
  motivo?: string;
}

export interface Devolucion {
  id: number;
  ticket_id: number;
  folio_fiscal: string;
  producto: string;
  codigo_interno?: string;
  cantidad: number;
  motivo?: string;
  usuario?: string;
  fecha: string;
}

// ── Reportes / Sistema ────────────────────────────────────
export interface CorteCaja {
  total_tickets: number;
  total_venta: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  ticket_inicial?: number;
  ticket_final?: number;
  fecha: string;
}

export interface VentasDiarias {
  labels: string[];
  ventas: number[];
}

export interface ItemEtiqueta {
  codigo: string;
  codigo_interno?: string | null;
  copias?: number;
}

// ── Clientes ──────────────────────────────────────────────
export interface Cliente {
  id: number;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  rfc?: string;
  notas?: string;
  activo: boolean;
  fecha_alta: string;
}

export interface ClienteInput {
  id?: number;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  rfc?: string;
  notas?: string;
}

// ── Cuentas por cobrar ────────────────────────────────────
export interface CuentaPorCobrar {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  ticket_id?: number;
  concepto: string;
  monto_original: number;
  monto_pendiente: number;
  fecha: string;
  estado: "pendiente" | "abonado" | "saldado";
}

export interface CuentaInput {
  cliente_id: number;
  ticket_id?: number;
  concepto: string;
  monto: number;
}

export interface AbonoInput {
  cuenta_id: number;
  monto: number;
  metodo_pago: string;
  notas?: string;
}

export interface ResumenDeudas {
  total_pendiente: number;
  total_cuentas: number;
  cuentas_saldadas_hoy: number;
}

// ── Cotizaciones ──────────────────────────────────────────
export interface Cotizacion {
  id: number;
  cliente_id?: number;
  cliente_ref?: string;
  total: number;
  notas?: string;
  estado: "vigente" | "enviada" | "aprobada" | "cancelada";
  usuario_id?: number;
  fecha: string;
}

export interface ItemCotizacionInput {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface CotizacionInput {
  cliente_id?: number;
  cliente_ref?: string;
  items: ItemCotizacionInput[];
  notas?: string;
}

export interface CotizacionProducto {
  producto_id: number;
  nombre: string;
  codigo_interno?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CotizacionConProductos {
  cotizacion: Cotizacion;
  productos: CotizacionProducto[];
}

// ── Pedidos a proveedor ───────────────────────────────────
export interface PedidoProveedor {
  id: number;
  proveedor: string;
  marca?: string;
  notas?: string;
  estado: "pendiente" | "enviado" | "recibido" | "cancelado";
  usuario_id?: number;
  fecha: string;
  total_items: number;
}

export interface ItemPedidoInput {
  producto_id: number;
  cantidad_pedida: number;
  precio_estimado?: number;
}

export interface PedidoInput {
  proveedor: string;
  marca?: string;
  items: ItemPedidoInput[];
  notas?: string;
}

export interface RecepcionItem {
  producto_id: number;
  cantidad_recibida: number;
}

export interface PedidoProducto {
  producto_id: number;
  nombre: string;
  codigo_interno?: string;
  cantidad_pedida: number;
  cantidad_recibida: number;
  precio_estimado?: number;
}

export interface PedidoConProductos {
  pedido: PedidoProveedor;
  productos: PedidoProducto[];
}

// ── Apartados ─────────────────────────────────────────────
export interface Apartado {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  total: number;
  monto_pagado: number;
  monto_pendiente: number;
  notas?: string;
  estado: "activo" | "cancelado" | "liquidado";
  fecha: string;
  fecha_liquidado?: string;
  ticket_id?: number;
  total_productos: number;
}

export interface ItemApartadoInput {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface ApartadoInput {
  cliente_id: number;
  items: ItemApartadoInput[];
  notas?: string;
}

export interface ApartadoProducto {
  producto_id: number;
  nombre: string;
  codigo_interno?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface ApartadoConProductos {
  apartado: Apartado;
  productos: ApartadoProducto[];
  abonos: Abono[];
}

export interface AbonoApartadoInput {
  apartado_id: number;
  monto: number;
  metodo_pago: string;
  notas?: string;
}
export interface Abono { id: number; cuenta_id: number; monto: number; metodo_pago: string; fecha: string; notas?: string; }
