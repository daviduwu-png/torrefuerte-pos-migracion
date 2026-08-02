import { useState, useMemo, useCallback } from "react";
import {
  Truck, AlertTriangle, AlertCircle, TrendingUp,
  ShoppingCart, RefreshCw,
} from "lucide-react";
import { usePedidos } from "./pedidos/hooks/usePedidos";
import { NuevoPedidoModal } from "./pedidos/components/NuevoPedidoModal";
import { ProductosTabla } from "./pedidos/components/ProductosTabla";
import { notify } from "../../../utils/sileo";
import { Producto } from "../../../api/tauri";

type SubTab = "critico" | "sin_stock" | "mas_vendidos";

export default function PedidosTab() {
  const { productos, proveedores, marcas, loading, cargarDatos, stockCritico, sinStock, masVendidos, PAGE_SIZE } = usePedidos();
  const [activeTab, setActiveTab] = useState<SubTab>("sin_stock");
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const handleCambiarTab = useCallback((tab: SubTab) => {
    setActiveTab(tab);
    setSeleccionados(new Set());
    setPage(1); // resetear página al cambiar de tab
  }, []);

  // tabsConfig solo se recrea si cambian los conteos
  const tabsConfig = useMemo(() => [
    {
      key: "sin_stock" as SubTab,
      label: "Sin Stock",
      count: sinStock.length,
      icon: <AlertCircle className="w-4 h-4" />,
      color: "bg-rose-600 text-white shadow-sm shadow-rose-900/30",
      inactive: "text-rose-400 hover:text-white hover:bg-white/5",
    },
    {
      key: "critico" as SubTab,
      label: "Stock Crítico",
      count: stockCritico.length,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "bg-amber-500 text-white shadow-sm shadow-amber-900/30",
      inactive: "text-amber-400 hover:text-white hover:bg-white/5",
    },
    {
      key: "mas_vendidos" as SubTab,
      label: "Más Vendidos",
      count: masVendidos.length,
      icon: <TrendingUp className="w-4 h-4" />,
      color: "bg-emerald-600 text-white shadow-sm shadow-emerald-900/30",
      inactive: "text-emerald-400 hover:text-white hover:bg-white/5",
    },
  ], [sinStock.length, stockCritico.length, masVendidos.length]);

  // productosActivos solo cambia si cambia la tab o los datos
  const productosActivos = useMemo((): Producto[] => {
    switch (activeTab) {
      case "sin_stock": return sinStock;
      case "critico": return stockCritico;
      case "mas_vendidos": return masVendidos;
    }
  }, [activeTab, sinStock, stockCritico, masVendidos]);

  // productosSeleccionadosData solo cambia si cambia la selección o los datos
  const productosSeleccionadosData = useMemo(
    () => productos.filter((p) => seleccionados.has(p.id)),
    [productos, seleccionados]
  );

  const handleToggleSeleccion = useCallback((id: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // handleSelectAll solo selecciona la página actual (mejor UX con 15K items)
  const handleSelectAll = useCallback(() => {
    const inicio = (page - 1) * PAGE_SIZE;
    const paginaActual = productosActivos.slice(inicio, inicio + PAGE_SIZE);
    const todosEnPagina = paginaActual.every((p) => seleccionados.has(p.id));
    if (todosEnPagina) {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        paginaActual.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        paginaActual.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }, [productosActivos, seleccionados, page, PAGE_SIZE]);

  const handleAbrirPedido = useCallback(() => {
    if (seleccionados.size === 0) {
      notify.warning({
        title: "Sin selección",
        description: "Selecciona al menos un producto para generar el pedido.",
        duration: 4000,
      });
      return;
    }
    setModalOpen(true);
  }, [seleccionados.size]);

  const handleRefresh = useCallback(async () => {
    await cargarDatos();
    notify.success({
      title: "Datos actualizados",
      description: "La lista de productos ha sido recargada correctamente.",
      duration: 3000,
    });
  }, [cargarDatos]);

  // emptyConfig memoizado por tab
  const emptyConfig = useMemo(() => {
    switch (activeTab) {
      case "sin_stock": return {
        icon: <AlertCircle className="w-10 h-10 opacity-30" />,
        text: "¡Excelente! No hay productos sin stock.",
      };
      case "critico": return {
        icon: <AlertTriangle className="w-10 h-10 opacity-30" />,
        text: "No hay productos con stock crítico (≤5).",
      };
      case "mas_vendidos": return {
        icon: <TrendingUp className="w-10 h-10 opacity-30" />,
        text: "No hay productos disponibles.",
      };
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col animate-in fade-in duration-300 h-full min-h-0 overflow-hidden">
      {/* Header: título + tabs + acciones en una sola barra */}
      <div className="shrink-0 pb-3 border-b border-white/10 mb-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Título */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Truck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight">Pedidos a Proveedores</h2>
              <p className="text-xs text-slate-400">Monitoreo de stock y generación de órdenes.</p>
            </div>
          </div>

          {/* Sub-tabs inline + acciones */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/50 border border-white/5 rounded-xl">
              {tabsConfig.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleCambiarTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key ? tab.color : tab.inactive
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.key ? "bg-white/20" : "bg-white/10"
                  }`}>
                    {tab.count.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>

            {/* Separador */}
            <div className="w-px h-6 bg-white/10" />

            {seleccionados.size > 0 && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <span className="text-sm text-emerald-400 font-bold">{seleccionados.size}</span>
                <span className="text-xs text-emerald-500/70">sel.</span>
                <button
                  onClick={() => setSeleccionados(new Set())}
                  className="text-xs text-slate-500 hover:text-white transition-colors border-l border-emerald-500/30 pl-2"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              onClick={handleRefresh}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Recargar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {seleccionados.size > 0 && (
              <button
                onClick={handleAbrirPedido}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Generar Pedido
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla: ocupa todo el espacio restante */}
      <div className="flex-1 min-h-0">
        <ProductosTabla
          productos={productosActivos}
          loading={loading}
          seleccionados={seleccionados}
          onToggleSeleccion={handleToggleSeleccion}
          onSelectAll={handleSelectAll}
          emptyIcon={emptyConfig.icon}
          emptyText={emptyConfig.text}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => { setPage(p); }}
        />
      </div>

      {/* Modal */}
      <NuevoPedidoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSeleccionados(new Set()); }}
        productosPreseleccionados={productosSeleccionadosData}
        proveedores={proveedores}
        marcas={marcas}
      />
    </div>
  );
}
