import { Producto } from "../../../api/tauri";

export type { Producto };

export type MetodoPago = "Efectivo" | "Tarjeta" | "Transferencia";

export interface CarritoItem {
    id: number;
    producto: Producto;
    cantidad: number;
}
