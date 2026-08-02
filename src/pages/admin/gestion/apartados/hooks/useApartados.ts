import { useState, useCallback, useEffect } from "react";
import { api, Apartado } from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";

export function useApartados() {
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusquedaRaw] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");

  const cargarApartados = useCallback(async (estado?: string) => {
    setLoading(true);
    try {
      const res = await api.listarApartados(estado || undefined, undefined);
      if (res.success && res.data) {
        setApartados(res.data);
      } else {
        setApartados([]);
      }
    } catch (err) {
      console.error("Error al cargar apartados:", err);
      notify.error({ title: "Error", description: "No se pudieron cargar los apartados.", duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, []);

  const setFiltroEstado = useCallback((estado: string) => {
    setEstadoFiltro(estado);
    cargarApartados(estado);
  }, [cargarApartados]);

  useEffect(() => {
    cargarApartados(estadoFiltro);
  }, [cargarApartados, estadoFiltro]);

  return {
    apartados,
    loading,
    busqueda,
    setBusqueda: setBusquedaRaw,
    estadoFiltro,
    setFiltroEstado,
    recargar: () => cargarApartados(estadoFiltro)
  };
}
