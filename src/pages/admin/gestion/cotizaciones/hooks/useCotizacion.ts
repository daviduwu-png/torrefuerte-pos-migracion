import { useState, useCallback, useRef } from "react";
import { api } from "../../../../../api/tauri";
import { Producto, ItemCotizacion } from "../types";
import { StyledSwal as Swal } from "../../../../../utils/swal";

export function esUnidadDecimal(tipoMedida?: string): boolean {
  if (!tipoMedida) return false;
  const t = tipoMedida.toUpperCase();
  return (
    t === "METRO" ||
    t === "KILO" ||
    t === "LITRO" ||
    t === "GALON" ||
    t === "GRANEL" ||
    t === "PESO"
  );
}

interface UseCotizacionReturn {
  items: ItemCotizacion[];
  busqueda: string;
  resultados: Producto[];
  buscando: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  setBusqueda: (q: string) => void;
  agregarProducto: (producto: Producto) => void;
  actualizarCantidad: (id: number, delta: number) => void;
  editarPrecio: (id: number, precioActual: number) => Promise<void>;
  eliminar: (id: number) => void;
  vaciar: () => void;
  cargarCotizacion: (items: ItemCotizacion[]) => void;
  total: number;
}

export function useCotizacion(): UseCotizacionReturn {
  const [items, setItems] = useState<ItemCotizacion[]>([]);
  const [busqueda, setBusquedaRaw] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const setBusqueda = useCallback((query: string) => {
    setBusquedaRaw(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.buscarProducto(query);
        setResultados(res.success && res.data ? res.data.slice(0, 15) : []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 250);
  }, []);

  const agregarProducto = useCallback((producto: Producto) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === producto.id);
      const step = esUnidadDecimal(producto.tipo_medida) ? 0.25 : 1;
      if (existing) {
        return prev.map((i) =>
          i.id === producto.id
            ? { ...i, cantidad: Number((i.cantidad + step).toFixed(4)) }
            : i
        );
      }
      return [
        ...prev,
        {
          id: producto.id,
          producto: { ...producto },
          cantidad: esUnidadDecimal(producto.tipo_medida) ? 0.25 : 1,
          precioUnitario: producto.precio_venta,
        },
      ];
    });
    setBusquedaRaw("");
    setResultados([]);
    searchInputRef.current?.focus();
  }, []);

  const actualizarCantidad = useCallback((id: number, delta: number) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const min = esUnidadDecimal(item.producto.tipo_medida) ? 0.25 : 1;
      const next = Number((item.cantidad + delta).toFixed(4));
      if (next < min) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? { ...i, cantidad: next } : i));
    });
  }, []);

  const editarPrecio = useCallback(async (id: number, precioActual: number) => {
    const { value } = await Swal.fire({
      title: "Precio Preferencial",
      input: "number",
      inputLabel: "Ingresa el nuevo precio unitario",
      inputValue: precioActual,
      showCancelButton: true,
      confirmButtonText: "Aplicar",
      cancelButtonText: "Cancelar",
      inputValidator: (v: string) => {
        if (!v || parseFloat(v) < 0) return "El precio no puede ser negativo";
        return null;
      },
    });
    if (value) {
      const precio = parseFloat(value);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, precioUnitario: precio } : i
        )
      );
      await Swal.fire({
        icon: "success",
        title: "Precio Actualizado",
        html: `<div style="background:#ffffff10;padding:15px;border-radius:10px;margin-top:10px;">
                 <p style="color:#94a3b8;font-size:.9em;margin:0">Nuevo precio:</p>
                 <p style="color:#34d399;font-size:1.5em;font-weight:bold;margin:0">$${precio.toFixed(2)}</p>
               </div>`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }, []);

  const eliminar = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const cargarCotizacion = useCallback((itemsCargados: ItemCotizacion[]) => {
    setItems(itemsCargados);
  }, []);

  const total = items.reduce(
    (sum, i) => sum + i.precioUnitario * i.cantidad,
    0
  );

  return {
    items,
    busqueda,
    resultados,
    buscando,
    searchInputRef,
    setBusqueda,
    agregarProducto,
    actualizarCantidad,
    editarPrecio,
    eliminar,
    vaciar,
    cargarCotizacion,
    total,
  };
}
