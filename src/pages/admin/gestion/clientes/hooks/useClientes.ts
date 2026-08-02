import { useState, useCallback, useEffect } from "react";
import { api, Cliente, CuentaPorCobrar, ResumenDeudas } from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusquedaRaw] = useState("");

  const cargarClientes = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const res = await api.listarClientes(query || undefined);
      if (res.success && res.data) setClientes(res.data);
      else setClientes([]);
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      notify.error({ title: "Error", description: "No se pudieron cargar los clientes.", duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, []);

  const setBusqueda = useCallback((q: string) => {
    setBusquedaRaw(q);
    cargarClientes(q || undefined);
  }, [cargarClientes]);

  useEffect(() => { cargarClientes(); }, [cargarClientes]);

  return { clientes, loading, busqueda, setBusqueda, recargar: cargarClientes };
}

export function useCuentas(clienteId?: number) {
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [resumen, setResumen] = useState<ResumenDeudas | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarCuentas = useCallback(async () => {
    setLoading(true);
    try {
      const [cuentasRes, resumenRes] = await Promise.all([
        api.listarCuentas(clienteId, undefined),
        api.obtenerResumenDeudas(),
      ]);
      if (cuentasRes.success && cuentasRes.data) setCuentas(cuentasRes.data);
      if (resumenRes.success && resumenRes.data) setResumen(resumenRes.data);
    } catch (err) {
      console.error("Error al cargar cuentas:", err);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => { cargarCuentas(); }, [cargarCuentas]);

  return { cuentas, resumen, loading, recargar: cargarCuentas };
}
