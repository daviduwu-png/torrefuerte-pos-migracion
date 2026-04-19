import { useState, useCallback, useRef } from "react";
import { api } from "../../../../api/tauri";
import { Producto } from "../types";

interface UseBusquedaReturn {
    busqueda: string;
    resultados: Producto[];
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    buscarProducto: (query: string) => void;
    handleKeyDown: (
        e: React.KeyboardEvent<HTMLInputElement>,
        onProductoSeleccionado: (producto: Producto) => void
    ) => Promise<void>;
    limpiarBusqueda: () => void;
}

export function useBusqueda(): UseBusquedaReturn {
    const [busqueda, setBusqueda] = useState("");
    const [resultados, setResultados] = useState<Producto[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const ejecutarBusqueda = useCallback(async (query: string) => {
        if (query.length < 1) {
            setResultados([]);
            return;
        }
        try {
            const res = await api.buscarProducto(query);
            if (res.success && res.data && res.data.length > 0) {
                setResultados(res.data.slice(0, 10));
            } else {
                setResultados([]);
            }
        } catch (error) {
            console.error("Error buscando producto:", error);
            setResultados([]);
        }
    }, []);

    const buscarProducto = useCallback(
        (query: string) => {
            setBusqueda(query);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (query.length < 1) {
                setResultados([]);
                return;
            }
            debounceRef.current = setTimeout(() => {
                ejecutarBusqueda(query);
            }, 200);
        },
        [ejecutarBusqueda]
    );

    const handleKeyDown = useCallback(
        async (
            e: React.KeyboardEvent<HTMLInputElement>,
            onProductoSeleccionado: (producto: Producto) => void
        ) => {
            if (e.key !== "Enter") return;

            if (resultados.length > 0) {
                onProductoSeleccionado(resultados[0]);
            } else if (busqueda.trim().length > 0) {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                try {
                    const res = await api.buscarProducto(busqueda.trim());
                    if (res.success && res.data && res.data.length > 0) {
                        onProductoSeleccionado(res.data[0]);
                    }
                } catch (error) {
                    console.error("Error buscando producto:", error);
                }
            }
        },
        [busqueda, resultados]
    );

    const limpiarBusqueda = useCallback(() => {
        setBusqueda("");
        setResultados([]);
        searchInputRef.current?.focus();
    }, []);

    return {
        busqueda,
        resultados,
        searchInputRef,
        buscarProducto,
        handleKeyDown,
        limpiarBusqueda,
    };
}
