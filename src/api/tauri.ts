import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type {
  // Autenticación & Usuarios
  Usuario,
  UsuarioInput,
  LoginResponse,
  // Genérico
  ApiResponse,
  // Catálogo
  Categoria,
  Producto,
  ProductoInput,
  ProductoFiltros,
  // Ventas
  TicketInput,
  Ticket,
  TicketConProductos,
  // Devoluciones
  DevolucionInput,
  Devolucion,
  // Reportes
  CorteCaja,
  VentasDiarias,
  ItemEtiqueta,
  // Clientes
  Cliente,
  ClienteInput,
  // CXC
  CuentaPorCobrar,
  CuentaInput,
  AbonoInput,
  ResumenDeudas,
  // Cotizaciones
  Cotizacion,
  CotizacionInput,
  CotizacionConProductos,
  // Pedidos
  PedidoProveedor,
  PedidoInput,
  PedidoConProductos,
  RecepcionItem,
  // Apartados
  Apartado,
  ApartadoInput,
  ApartadoConProductos,
  AbonoApartadoInput,
} from "./types";

export type {
  Usuario,
  UsuarioInput,
  LoginResponse,
  ApiResponse,
  Categoria,
  Producto,
  ProductoInput,
  ProductoFiltros,
  ItemCarrito,
  TicketInput,
  Ticket,
  TicketConProductos,
  DevolucionInput,
  Devolucion,
  CorteCaja,
  VentasDiarias,
  ItemEtiqueta,
  Cliente,
  ClienteInput,
  CuentaPorCobrar,
  CuentaInput,
  AbonoInput,
  ResumenDeudas,
  Cotizacion,
  CotizacionInput,
  CotizacionConProductos,
  PedidoProveedor,
  PedidoInput,
  PedidoConProductos,
  RecepcionItem,
  Apartado,
  ApartadoInput,
  ApartadoConProductos,
  ApartadoProducto,
  AbonoApartadoInput,
} from "./types";

const invoke = async <T>(cmd: string, args?: any): Promise<T> => {
  const isTauri =
    typeof window !== "undefined" &&
    (window as any).__TAURI_INTERNALS__ !== undefined;

  if (!isTauri) {
    console.warn(
      `[Tauri] Attempted to invoke '${cmd}' outside of Tauri context.`,
    );
    throw new Error(
      "Tauri API no detectada. Asegúrate de estar ejecutando la aplicación con 'npm run tauri dev'.",
    );
  }

  try {
    return await tauriInvoke(cmd, args);
  } catch (error) {
    console.error(`[Tauri] Error invoking '${cmd}':`, error);
    throw error;
  }
};

export const api = {
  login: async (username: string, password: string): Promise<LoginResponse> =>
    invoke("login", { username, password }),

  logout: async (): Promise<ApiResponse<void>> => invoke("logout"),

  getCurrentUser: async (): Promise<Usuario | null> =>
    invoke("get_current_user"),

  // ── Usuarios ─────────────────────────────────────────────
  listarUsuarios: async (): Promise<ApiResponse<Usuario[]>> =>
    invoke("listar_usuarios"),

  guardarUsuario: async (usuario: UsuarioInput): Promise<ApiResponse<number>> =>
    invoke("guardar_usuario", { usuario }),

  eliminarUsuario: async (id: number): Promise<ApiResponse<void>> =>
    invoke("eliminar_usuario", { id }),

  // ── Productos ────────────────────────────────────────────
  buscarProducto: async (query: string): Promise<ApiResponse<Producto[]>> =>
    invoke("buscar_producto", { query }),

  consultarProductos: async (
    filtros?: ProductoFiltros,
  ): Promise<ApiResponse<Producto[]>> =>
    invoke("consultar_productos", { filtros }),

  obtenerProducto: async (id: number): Promise<ApiResponse<Producto>> =>
    invoke("obtener_producto", { id }),

  ingresarProducto: async (
    producto: ProductoInput,
  ): Promise<ApiResponse<number>> => invoke("ingresar_producto", { producto }),

  guardarProducto: async (
    producto: ProductoInput,
  ): Promise<ApiResponse<void>> => invoke("guardar_producto", { producto }),

  eliminarProducto: async (id: number): Promise<ApiResponse<void>> =>
    invoke("eliminar_producto", { id }),

  // ── Categorías y catálogos ───────────────────────────────
  obtenerCategorias: async (): Promise<ApiResponse<Categoria[]>> =>
    invoke("obtener_categorias"),

  crearCategoria: async (nombre: string): Promise<ApiResponse<number>> =>
    invoke("crear_categoria", { nombre }),

  obtenerMarcas: async (): Promise<ApiResponse<string[]>> =>
    invoke("obtener_marcas"),

  obtenerProveedores: async (): Promise<ApiResponse<string[]>> =>
    invoke("obtener_proveedores"),

  // ── Ventas ───────────────────────────────────────────────
  generarTicket: async (
    ticketInput: TicketInput,
  ): Promise<ApiResponse<Ticket>> => invoke("generar_ticket", { ticketInput }),

  buscarTicket: async (
    query: string,
  ): Promise<ApiResponse<TicketConProductos[]>> =>
    invoke("buscar_ticket", { query }),

  listarTickets: async (
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<ApiResponse<TicketConProductos[]>> =>
    invoke("listar_tickets", { fechaInicio, fechaFin }),

  // ── Devoluciones ─────────────────────────────────────────
  realizarDevolucion: async (
    devolucion: DevolucionInput,
  ): Promise<ApiResponse<void>> =>
    invoke("realizar_devolucion", { devolucion }),

  listarDevoluciones: async (
    inicio?: string,
    fin?: string,
  ): Promise<ApiResponse<Devolucion[]>> =>
    invoke("listar_devoluciones", { inicio, fin }),

  // ── Reportes ─────────────────────────────────────────────
  obtenerCorteCaja: async (fecha?: string): Promise<ApiResponse<CorteCaja>> =>
    invoke("obtener_corte_caja", { fecha: fecha ?? null }),

  exportarCorteExcel: async (fecha?: string): Promise<ApiResponse<string>> =>
    invoke("exportar_corte_excel", { fecha: fecha ?? null }),

  exportarReporteFinanciero: async (
    fechaInicio: string,
    fechaFin: string,
  ): Promise<ApiResponse<string>> =>
    invoke("exportar_reporte_financiero", { fechaInicio, fechaFin }),

  reporteVentasDiarias: async (): Promise<ApiResponse<VentasDiarias>> =>
    invoke("reporte_ventas_diarias"),

  reporteVentasSemanales: async (): Promise<ApiResponse<VentasDiarias>> =>
    invoke("reporte_ventas_semanales"),

  reporteVentasMensuales: async (): Promise<ApiResponse<VentasDiarias>> =>
    invoke("reporte_ventas_mensuales"),

  reporteVentasAnuales: async (): Promise<ApiResponse<VentasDiarias>> =>
    invoke("reporte_ventas_anuales"),

  obtenerEstadisticas: async (): Promise<ApiResponse<any>> =>
    invoke("obtener_estadisticas"),

  // ── Sistema / Backups ────────────────────────────────────
  crearRespaldo: async (
    tipo: "auto" | "manual",
  ): Promise<ApiResponse<string>> => invoke("crear_respaldo", { tipo }),

  restaurarBaseDatos: async (contenido: string): Promise<ApiResponse<void>> =>
    invoke("restaurar_base_datos", { contenido }),

  rellenarStockMasivo: async (): Promise<ApiResponse<string>> =>
    invoke("rellenar_stock_masivo", {}),

  obtenerConfiguracion: async (): Promise<ApiResponse<Record<string, string>>> =>
    invoke("obtener_configuracion"),

  guardarConfiguracion: async (config: Record<string, string>): Promise<ApiResponse<void>> =>
    invoke("guardar_configuracion", { config }),

  probarConexionR2: async (
    accessKey: string,
    secretKey: string,
    endpoint: string,
    bucketName: string,
  ): Promise<ApiResponse<string>> =>
    invoke("probar_conexion_r2", { accessKey, secretKey, endpoint, bucketName }),

  // ── Importación ──────────────────────────────────────────
  importarProductosTruper: async (
    productos: ProductoInput[],
  ): Promise<ApiResponse<string>> =>
    invoke("importar_productos_truper", { productos }),

  // ── Impresión ────────────────────────────────────────────
  listarImpresoras: async (): Promise<ApiResponse<string>> =>
    invoke("listar_impresoras"),

  registrarImpresoraCups: async (nombre: string, uri: string): Promise<ApiResponse<void>> =>
    invoke("registrar_impresora_cups", { nombre, uri }),

  imprimirTicket: async (
    ticketId: number,
    impresora?: string,
  ): Promise<ApiResponse<void>> => {
    const target = impresora ?? localStorage.getItem("printer_tickets") ?? undefined;
    return invoke("imprimir_ticket", { ticketId, impresora: target === "auto" ? undefined : target });
  },

  imprimirCorte: async (
    corte: CorteCaja,
    impresora?: string,
  ): Promise<ApiResponse<void>> => {
    const target = impresora ?? localStorage.getItem("printer_tickets") ?? undefined;
    return invoke("imprimir_corte", { corte, impresora: target === "auto" ? undefined : target });
  },

  imprimirTest: async (impresora?: string): Promise<ApiResponse<void>> => {
    return invoke("imprimir_test", { impresora: impresora === "auto" ? undefined : impresora });
  },

  imprimirCodigosBarras: async (
    items: ItemEtiqueta[],
    impresora?: string,
  ): Promise<ApiResponse<void>> => {
    const target = impresora ?? localStorage.getItem("printer_etiquetas") ?? undefined;
    return invoke("imprimir_codigos_barras", { items, impresora: target === "auto" ? undefined : target });
  },

  asignarCodigoBarras: async (
    productoId: number,
    codigoBarras: string,
  ): Promise<ApiResponse<string>> =>
    invoke("asignar_codigo_barras", { productoId, codigoBarras }),

  // ── Clientes — Directorio ────────────────────────────────
  listarClientes: async (query?: string): Promise<ApiResponse<Cliente[]>> =>
    invoke("listar_clientes", { query: query ?? null }),

  obtenerCliente: async (id: number): Promise<ApiResponse<Cliente>> =>
    invoke("obtener_cliente", { id }),

  guardarCliente: async (cliente: ClienteInput): Promise<ApiResponse<number>> =>
    invoke("guardar_cliente", { cliente }),

  eliminarCliente: async (id: number): Promise<ApiResponse<void>> =>
    invoke("eliminar_cliente", { id }),

  // ── Clientes — Cuentas por cobrar ────────────────────────
  listarCuentas: async (
    clienteId?: number,
    estado?: string,
  ): Promise<ApiResponse<CuentaPorCobrar[]>> =>
    invoke("listar_cuentas", {
      clienteId: clienteId ?? null,
      estado: estado ?? null,
    }),

  crearCuenta: async (cuenta: CuentaInput): Promise<ApiResponse<number>> =>
    invoke("crear_cuenta", { cuenta }),

  registrarAbono: async (abono: AbonoInput): Promise<ApiResponse<void>> =>
    invoke("registrar_abono", { abono }),

  obtenerResumenDeudas: async (): Promise<ApiResponse<ResumenDeudas>> =>
    invoke("obtener_resumen_deudas"),

  // ── Cotizaciones ─────────────────────────────────────────
  guardarCotizacion: async (
    cotizacion: CotizacionInput,
  ): Promise<ApiResponse<number>> =>
    invoke("guardar_cotizacion", { cotizacion }),

  listarCotizaciones: async (
    clienteId?: number,
    estado?: string,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<ApiResponse<Cotizacion[]>> =>
    invoke("listar_cotizaciones", {
      clienteId: clienteId ?? null,
      estado: estado ?? null,
      fechaInicio: fechaInicio ?? null,
      fechaFin: fechaFin ?? null,
    }),

  obtenerCotizacion: async (
    id: number,
  ): Promise<ApiResponse<CotizacionConProductos>> =>
    invoke("obtener_cotizacion", { id }),

  cambiarEstadoCotizacion: async (
    id: number,
    nuevoEstado: string,
  ): Promise<ApiResponse<void>> =>
    invoke("cambiar_estado_cotizacion", { id, nuevoEstado }),

  eliminarCotizacion: async (id: number): Promise<ApiResponse<void>> =>
    invoke("eliminar_cotizacion", { id }),

  // ── Pedidos a proveedor ──────────────────────────────────
  guardarPedido: async (pedido: PedidoInput): Promise<ApiResponse<number>> =>
    invoke("guardar_pedido", { pedido }),

  listarPedidos: async (
    proveedor?: string,
    estado?: string,
  ): Promise<ApiResponse<PedidoProveedor[]>> =>
    invoke("listar_pedidos", {
      proveedor: proveedor ?? null,
      estado: estado ?? null,
    }),

  obtenerPedido: async (id: number): Promise<ApiResponse<PedidoConProductos>> =>
    invoke("obtener_pedido", { id }),

  recibirPedido: async (
    pedidoId: number,
    items: RecepcionItem[],
  ): Promise<ApiResponse<void>> =>
    invoke("recibir_pedido", { pedidoId, items }),

  cambiarEstadoPedido: async (
    id: number,
    nuevoEstado: string,
  ): Promise<ApiResponse<void>> =>
    invoke("cambiar_estado_pedido", { id, nuevoEstado }),

  // ── Apartados ────────────────────────────────────────────
  crearApartado: async (
    apartado: ApartadoInput,
  ): Promise<ApiResponse<number>> => invoke("crear_apartado", { apartado }),

  listarApartados: async (
    estado?: string,
    clienteId?: number,
  ): Promise<ApiResponse<Apartado[]>> =>
    invoke("listar_apartados", {
      estado: estado ?? null,
      clienteId: clienteId ?? null,
    }),

  obtenerApartado: async (
    id: number,
  ): Promise<ApiResponse<ApartadoConProductos>> =>
    invoke("obtener_apartado", { id }),

  abonarApartado: async (
    abono: AbonoApartadoInput,
  ): Promise<ApiResponse<void>> => invoke("abonar_apartado", { abono }),

  liquidarApartado: async (
    apartadoId: number,
    metodoPago: string,
  ): Promise<ApiResponse<number>> =>
    invoke("liquidar_apartado", { apartadoId, metodoPago }),

  cancelarApartado: async (apartadoId: number): Promise<ApiResponse<void>> =>
    invoke("cancelar_apartado", { apartadoId }),
};
