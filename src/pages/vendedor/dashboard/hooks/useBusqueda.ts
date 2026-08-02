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
    onProductoSeleccionado: (producto: Producto) => void,
  ) => Promise<void>;
  limpiarBusqueda: () => void;
}

export function useBusqueda(): UseBusquedaReturn {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchQuery = useRef("");

  const ejecutarBusqueda = useCallback(async (query: string) => {
    if (query.length < 1) {
      setResultados([]);
      lastSearchQuery.current = "";
      return;
    }
    try {
      const res = await api.buscarProducto(query);
      if (res.success && res.data && res.data.length > 0) {
        setResultados(res.data.slice(0, 10));
      } else {
        setResultados([]);
      }
      lastSearchQuery.current = query.trim();
    } catch (error) {
      console.error("Error buscando producto:", error);
      setResultados([]);
      lastSearchQuery.current = query.trim();
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
    [ejecutarBusqueda],
  );

  const handleKeyDown = useCallback(
    async (
      e: React.KeyboardEvent<HTMLInputElement>,
      onProductoSeleccionado: (producto: Producto) => void,
    ) => {
      if (e.key !== "Enter") return;

      const currentQuery = busqueda.trim();
      if (currentQuery.length === 0) return;

      if (currentQuery === lastSearchQuery.current && resultados.length > 0) {
        onProductoSeleccionado(resultados[0]);
        lastSearchQuery.current = "";
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      try {
        const res = await api.buscarProducto(currentQuery);
        if (res.success && res.data && res.data.length > 0) {
          setResultados(res.data.slice(0, 10));
        } else {
          setResultados([]);
        }
        lastSearchQuery.current = currentQuery;
      } catch (error) {
        console.error("Error buscando producto:", error);
        setResultados([]);
        lastSearchQuery.current = currentQuery;
      }
    },
    [busqueda, resultados],
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
