import { invoke as tauriInvoke } from "@tauri-apps/api/core";

// Wrapper function to handle Tauri invoke calls safely
// This prevents crashes when running in a strict browser environment (not Tauri app)
const invoke = async <T>(cmd: string, args?: any): Promise<T> => {
  // Check if we are in a Tauri environment
  // In Tauri v2, the internals are exposed via window.__TAURI_INTERNALS__
  const isTauri =
    typeof window !== "undefined" &&
    (window as any).__TAURI_INTERNALS__ !== undefined;

  if (!isTauri) {
    console.warn(
      `[Tauri] Attempted to invoke '${cmd}' outside of Tauri context.`,
    );
    // You can uncomment this to mock specific commands in dev mode
    // if (cmd === 'login') return { success: true, user: { ... } };

    throw new Error(
      "Tauri API no detectada. Asegúrate de estar ejecutando la aplicación con 'npm run tauri dev' o dentro de la ventana de Tauri.",
    );
  }

  try {
    return await tauriInvoke(cmd, args);
  } catch (error) {
    console.error(`[Tauri] Error invoking '${cmd}':`, error);
    throw error;
  }
};

// ==================== INTERFACES ====================

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
}

export interface ProductoFiltros {
  categoria?: string;
  marca?: string;
  proveedor?: string;
  limit?: number;
}

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
  cantidad: number;
  devuelto?: number; // Optional because legacy API calls might not return it immediately if not updated
  precio_unitario: number;
  subtotal: number;
}

export interface TicketConProductos {
  ticket: Ticket;
  productos: TicketProducto[];
}

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

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// ==================== API SERVICE ====================

export const api = {
  // --- Autenticación ---
  login: async (username: string, password: string): Promise<LoginResponse> => {
    return await invoke("login", { username, password });
  },

  logout: async (): Promise<ApiResponse<void>> => {
    return await invoke("logout");
  },

  getCurrentUser: async (): Promise<Usuario | null> => {
    return await invoke("get_current_user");
  },

  // --- Productos ---
  buscarProducto: async (query: string): Promise<ApiResponse<Producto[]>> => {
    return await invoke("buscar_producto", { query });
  },

  consultarProductos: async (
    filtros?: ProductoFiltros,
  ): Promise<ApiResponse<Producto[]>> => {
    return await invoke("consultar_productos", { filtros });
  },

  obtenerProducto: async (id: number): Promise<ApiResponse<Producto>> => {
    return await invoke("obtener_producto", { id });
  },

  ingresarProducto: async (
    producto: ProductoInput,
  ): Promise<ApiResponse<number>> => {
    return await invoke("ingresar_producto", { producto });
  },

  guardarProducto: async (
    producto: ProductoInput,
  ): Promise<ApiResponse<void>> => {
    return await invoke("guardar_producto", { producto });
  },

  eliminarProducto: async (id: number): Promise<ApiResponse<void>> => {
    return await invoke("eliminar_producto", { id });
  },

  // --- Categorías y Catálogos ---
  obtenerCategorias: async (): Promise<ApiResponse<Categoria[]>> => {
    return await invoke("obtener_categorias");
  },

  crearCategoria: async (nombre: string): Promise<ApiResponse<number>> => {
    return await invoke("crear_categoria", { nombre });
  },

  obtenerMarcas: async (): Promise<ApiResponse<string[]>> => {
    return await invoke("obtener_marcas");
  },

  obtenerProveedores: async (): Promise<ApiResponse<string[]>> => {
    return await invoke("obtener_proveedores");
  },

  // --- Ventas ---
  generarTicket: async (
    ticketInput: TicketInput,
  ): Promise<ApiResponse<Ticket>> => {
    return await invoke("generar_ticket", { ticketInput });
  },

  buscarTicket: async (
    query: string,
  ): Promise<ApiResponse<TicketConProductos[]>> => {
    return await invoke("buscar_ticket", { query });
  },

  listarTickets: async (
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<ApiResponse<TicketConProductos[]>> => {
    return await invoke("listar_tickets", { fechaInicio, fechaFin });
  },

  // --- Devoluciones ---
  realizarDevolucion: async (
    devolucion: DevolucionInput,
  ): Promise<ApiResponse<void>> => {
    return await invoke("realizar_devolucion", { devolucion });
  },

  listarDevoluciones: async (
    inicio?: string,
    fin?: string,
  ): Promise<ApiResponse<Devolucion[]>> => {
    return await invoke("listar_devoluciones", { inicio, fin });
  },

  // --- Reportes ---
  obtenerCorteCaja: async (): Promise<ApiResponse<CorteCaja>> => {
    return await invoke("obtener_corte_caja");
  },

  exportarCorteExcel: async (): Promise<ApiResponse<string>> => {
    return await invoke("exportar_corte_excel");
  },

  exportarReporteFinanciero: async (
    fechaInicio: string,
    fechaFin: string,
  ): Promise<ApiResponse<string>> => {
    return await invoke("exportar_reporte_financiero", {
      fechaInicio,
      fechaFin,
    });
  },

  reporteVentasDiarias: async (): Promise<ApiResponse<VentasDiarias>> => {
    return await invoke("reporte_ventas_diarias");
  },

  reporteVentasSemanales: async (): Promise<ApiResponse<VentasDiarias>> => {
    return await invoke("reporte_ventas_semanales");
  },

  reporteVentasMensuales: async (): Promise<ApiResponse<VentasDiarias>> => {
    return await invoke("reporte_ventas_mensuales");
  },

  reporteVentasAnuales: async (): Promise<ApiResponse<VentasDiarias>> => {
    return await invoke("reporte_ventas_anuales");
  },

  obtenerEstadisticas: async (): Promise<ApiResponse<any>> => {
    return await invoke("obtener_estadisticas");
  },

  // --- Sistema (Backups) ---
  crearRespaldo: async (
    tipo: "auto" | "manual",
  ): Promise<ApiResponse<string>> => {
    return await invoke("crear_respaldo", { tipo });
  },

  restaurarBaseDatos: async (contenido: string): Promise<ApiResponse<void>> => {
    return await invoke("restaurar_base_datos", { contenido });
  },

  // --- Importación ---
  importarProductosTruper: async (
    productos: ProductoInput[],
  ): Promise<ApiResponse<string>> => {
    return await invoke("importar_productos_truper", { productos });
  },

  // --- Sistema ---
  rellenarStockMasivo: async (): Promise<ApiResponse<string>> => {
    return await invoke("rellenar_stock_masivo", {});
  },

  // --- Impresión ---
  imprimirTicket: async (ticketId: number): Promise<ApiResponse<void>> => {
    return await invoke("imprimir_ticket", { ticketId: ticketId });
  },

  imprimirCorte: async (corte: CorteCaja): Promise<ApiResponse<void>> => {
    return await invoke("imprimir_corte", { corte });
  },
};
