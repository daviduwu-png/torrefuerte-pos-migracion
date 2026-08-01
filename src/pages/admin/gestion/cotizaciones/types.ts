import { Producto } from "../../../../api/tauri";
export type { Producto };

export interface ItemCotizacion {
  id: number;          // = producto.id
  producto: Producto;
  cantidad: number;
  precioUnitario: number; // puede ser editado (precio preferencial)
}
