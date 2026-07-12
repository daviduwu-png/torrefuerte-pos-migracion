import { useState, useCallback } from "react";
import { Producto } from "../types";
import { CarritoItem } from "../types";
import { StyledSwal as Swal } from "../../../../utils/swal";

interface UseCarritoReturn {
  carrito: CarritoItem[];
  agregarAlCarrito: (producto: Producto) => void;
  eliminarDelCarrito: (id: number) => void;
  actualizarCantidad: (id: number, delta: number) => void;
  editarPrecio: (id: number, precioActual: number) => Promise<void>;
  calcularTotal: () => number;
  vaciarCarrito: () => void;
}

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

export function useCarrito(): UseCarritoReturn {
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);

  const agregarAlCarrito = useCallback((producto: Producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === producto.id);
      const step = esUnidadDecimal(producto.tipo_medida) ? 0.25 : 1;
      if (existente) {
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: Number((item.cantidad + step).toFixed(4)) }
            : item,
        );
      }
      // Decimales arrancan en 0.25, enteros en 1
      const cantidadInicial = esUnidadDecimal(producto.tipo_medida) ? 0.25 : 1;
      return [
        ...prev,
        {
          id: producto.id,
          producto: { ...producto },
          cantidad: cantidadInicial,
        },
      ];
    });
  }, []);

  const eliminarDelCarrito = useCallback((id: number) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const actualizarCantidad = useCallback((id: number, delta: number) => {
    setCarrito((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;

      const esDecimal = esUnidadDecimal(item.producto.tipo_medida);
      const minCantidad = esDecimal ? 0.25 : 1;
      const nuevaCantidad = Number((item.cantidad + delta).toFixed(4));

      if (nuevaCantidad < minCantidad) {
        return prev.filter((i) => i.id !== id);
      }

      return prev.map((i) =>
        i.id === id ? { ...i, cantidad: nuevaCantidad } : i,
      );
    });
  }, []);

  const editarPrecio = useCallback(async (id: number, precioActual: number) => {
    const { value: nuevoPrecio } = await Swal.fire({
      title: "Precio Preferencial",
      input: "number",
      inputLabel: "Ingrese el nuevo precio unitario",
      inputValue: precioActual,
      showCancelButton: true,
      confirmButtonText: "Aplicar",
      cancelButtonText: "Cancelar",
      background: "#0f172a",
      color: "#fff",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#64748b",
      customClass: {
        input: "bg-slate-700 text-white border-slate-600 focus:ring-blue-500",
      },
      inputValidator: (value) => {
        if (!value || parseFloat(value) < 0) {
          return "El precio no puede ser negativo";
        }
        return null;
      },
    });

    if (nuevoPrecio) {
      const precioFinal = parseFloat(nuevoPrecio);
      setCarrito((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                producto: { ...item.producto, precio_venta: precioFinal },
              }
            : item,
        ),
      );

      await Swal.fire({
        icon: "success",
        title: "Precio Actualizado",
        html: `
          <div style="background: #ffffff10; padding: 15px; border-radius: 10px; margin-top: 10px;">
             <p style="color: #94a3b8; font-size: 0.9em; margin: 0;">Nuevo precio establecido:</p>
             <p style="color: #34d399; font-size: 1.5em; font-weight: bold; margin: 0;">$${precioFinal.toFixed(2)}</p>
          </div>
        `,
        timer: 1500,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#fff",
      });
    }
  }, []);

  const calcularTotal = useCallback(
    () =>
      carrito.reduce(
        (total, item) => total + item.producto.precio_venta * item.cantidad,
        0,
      ),
    [carrito],
  );

  const vaciarCarrito = useCallback(() => setCarrito([]), []);

  return {
    carrito,
    agregarAlCarrito,
    eliminarDelCarrito,
    actualizarCantidad,
    editarPrecio,
    calcularTotal,
    vaciarCarrito,
  };
}
