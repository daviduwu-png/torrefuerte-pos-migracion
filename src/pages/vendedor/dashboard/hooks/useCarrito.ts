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

export function useCarrito(): UseCarritoReturn {
    const [carrito, setCarrito] = useState<CarritoItem[]>([]);

    const agregarAlCarrito = useCallback((producto: Producto) => {
        setCarrito((prev) => {
            const existente = prev.find((item) => item.id === producto.id);
            if (existente) {
                return prev.map((item) =>
                    item.id === producto.id
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item
                );
            }
            return [...prev, { id: producto.id, producto: { ...producto }, cantidad: 1 }];
        });
    }, []);

    const eliminarDelCarrito = useCallback((id: number) => {
        setCarrito((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const actualizarCantidad = useCallback((id: number, delta: number) => {
        setCarrito((prev) =>
            prev.map((item) =>
                item.id === id
                    ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
                    : item
            )
        );
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
                        ? { ...item, producto: { ...item.producto, precio_venta: precioFinal } }
                        : item
                )
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
                0
            ),
        [carrito]
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
