import { Producto, ProductoInput } from "../../../api/tauri";

export type { Producto, ProductoInput };

export const EMPTY_FORM: ProductoInput = {
    nombre: "",
    tipo_medida: "UNIDAD",
    categoria_id: 1,
    precio_compra: 0,
    precio_venta: 0,
    facturable: true,
    stock: 0,
};

export const UNIDADES_MEDIDA = [
    "UNIDAD",
    "METRO",
    "KILO",
    "ROLLO",
    "JUEGO",
    "SET",
    "LITRO",
    "GALON",
    "CAJA",
    "TRAMO",
] as const;
