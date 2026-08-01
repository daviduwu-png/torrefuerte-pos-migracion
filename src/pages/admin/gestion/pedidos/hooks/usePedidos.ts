import { useState, useCallback, useEffect, useMemo } from "react";
import { api } from "../../../../../api/tauri";
import { Producto } from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";

const PAGE_SIZE = 50;

export function usePedidos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, provRes, marcasRes] = await Promise.all([
        api.consultarProductos({ limit: 0 }),
        api.obtenerProveedores(),
        api.obtenerMarcas(),
      ]);

      if (prodRes.success && prodRes.data) setProductos(prodRes.data);
      if (provRes.success && provRes.data) setProveedores(provRes.data);
      if (marcasRes.success && marcasRes.data) setMarcas(marcasRes.data);
    } catch (error) {
      console.error("Error cargando datos de pedidos:", error);
      notify.error({
        title: "Error al cargar datos",
        description: "No se pudieron obtener los productos. Verifica la conexión.",
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ── Derivados memoizados: solo se recalculan si cambia `productos` ──
  const stockCritico = useMemo(
    () => productos.filter((p) => p.stock > 0 && p.stock <= 5),
    [productos]
  );

  const sinStock = useMemo(
    () => productos.filter((p) => p.stock === 0),
    [productos]
  );

  const masVendidos = useMemo(
    () => [...productos].sort((a, b) => b.precio_venta - a.precio_venta).slice(0, 100),
    [productos]
  );

  return {
    productos,
    proveedores,
    marcas,
    loading,
    cargarDatos,
    stockCritico,
    sinStock,
    masVendidos,
    PAGE_SIZE,
  };
}
