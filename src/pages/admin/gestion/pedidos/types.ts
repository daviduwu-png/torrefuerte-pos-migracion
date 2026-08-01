import { Producto } from "../../../../api/tauri";

export type PedidosSubTab = "stock_critico" | "sin_stock" | "mas_vendidos";

export interface ItemPedido {
  producto: Producto;
  cantidadSugerida: number;
  cantidadPedido: number;
}

export interface PedidoProveedor {
  proveedor: string;
  marca: string;
  items: ItemPedido[];
  notas: string;
  fecha: string;
}

export type { Producto };
