import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  Filter,
  ChevronDown,
  Search,
} from "lucide-react";
import { usePedidos } from "./pedidos/hooks/usePedidos";
import { NuevoPedidoModal } from "./pedidos/components/NuevoPedidoModal";
import { ProductosTabla } from "./pedidos/components/ProductosTabla";
import { notify } from "../../../utils/sileo";
import { Producto } from "../../../api/tauri";

type SubTab = "critico" | "sin_stock" | "mas_vendidos";

export default function PedidosTab() {
  const {
    productos,
    proveedores,
    marcas,
    loading,
    cargarDatos,
    stockCritico,
    sinStock,
    masVendidos,
    PAGE_SIZE,
  } = usePedidos();
  const [activeTab, setActiveTab] = useState<SubTab>("sin_stock");
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const handleCambiarTab = useCallback((tab: SubTab) => {
    setActiveTab(tab);
    setSeleccionados(new Set());
    setPage(1); // resetear página al cambiar de tab
    setBusqueda(""); // limpiar busqueda al cambiar tab
  }, []);

  // tabsConfig solo se recrea si cambian los conteos
  const tabsConfig = useMemo(
    () => [
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
    ],
    [sinStock.length, stockCritico.length, masVendidos.length],
  );

  // productosActivos solo cambia si cambia la tab o los datos
  const productosActivos = useMemo((): Producto[] => {
    switch (activeTab) {
      case "sin_stock":
        return sinStock;
      case "critico":
        return stockCritico;
      case "mas_vendidos":
        return masVendidos;
      default:
        return [];
    }
  }, [activeTab, sinStock, stockCritico, masVendidos]);

  // Aplicar filtro de proveedor y busqueda
  const productosFiltrados = useMemo(() => {
    let filtrados = productosActivos;
    if (filtroProveedor) {
      filtrados = filtrados.filter((p) => p.proveedor === filtroProveedor);
    }
    if (busqueda) {
      const term = busqueda.toLowerCase();
      filtrados = filtrados.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          (p.codigo_interno && p.codigo_interno.toLowerCase().includes(term)) ||
          (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term)),
      );
    }
    return filtrados;
  }, [productosActivos, filtroProveedor, busqueda]);

  // productosSeleccionadosData solo cambia si cambia la selección o los datos
  const productosSeleccionadosData = useMemo(
    () => productos.filter((p) => seleccionados.has(p.id)),
    [productos, seleccionados],
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
    const paginaActual = productosFiltrados.slice(inicio, inicio + PAGE_SIZE);
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
  }, [productosFiltrados, seleccionados, page, PAGE_SIZE]);

  const handleAbrirPedido = useCallback(() => {
    if (seleccionados.size === 0) {
      notify.warning({
        title: "Sin selección",
        description: "Selecciona al menos un producto para generar el pedido.",
        duration: 4000,
      });
      return;
    }

    // Verificar que todos los seleccionados sean del mismo proveedor
    const proveedoresSeleccionados = new Set(
      productosSeleccionadosData.map((p) => p.proveedor),
    );
    if (proveedoresSeleccionados.size > 1) {
      notify.warning({
        title: "Múltiples proveedores",
        description:
          "Solo se pueden generar pedidos de un solo proveedor a la vez.",
        duration: 5000,
      });
      return;
    }

    setModalOpen(true);
  }, [seleccionados.size, productosSeleccionadosData]);

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
      case "sin_stock":
        return {
          icon: <AlertCircle className="w-10 h-10 opacity-30" />,
          text: "¡Excelente! No hay productos sin stock.",
        };
      case "critico":
        return {
          icon: <AlertTriangle className="w-10 h-10 opacity-30" />,
          text: "No hay productos con stock crítico (≤5).",
        };
      case "mas_vendidos":
        return {
          icon: <TrendingUp className="w-10 h-10 opacity-30" />,
          text: "No hay productos disponibles.",
        };
      default:
        return {
          icon: <AlertCircle className="w-10 h-10 opacity-30" />,
          text: "No hay datos disponibles.",
        };
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col lg:flex-row animate-in fade-in duration-300 h-full min-h-0 overflow-hidden gap-6">
      {/* Sidebar Panel (Left) */}
      <div className="glass-panel rounded-2xl shadow-lg border border-white/10 shrink-0 w-full lg:w-72 flex flex-col relative z-20">
        <div className="p-4 sm:p-5 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar min-h-0">
          
          {/* Tabs */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              Estado de Inventario
            </h3>
            <div className="flex flex-col gap-2">
              {tabsConfig.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleCambiarTab(tab.key)}
                  className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    activeTab === tab.key
                      ? tab.color + " border-transparent ring-1 ring-white/10"
                      : "bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab.icon}
                    {tab.label}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      activeTab === tab.key ? "bg-white/20 text-white" : "bg-white/10"
                    }`}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5"></div>

          {/* Filtro Proveedor */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Proveedor
            </h3>
            <div className="relative group w-full">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between pl-3 pr-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-white hover:border-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all shadow-inner"
              >
                <span className="truncate pr-2 text-xs font-medium">
                  {filtroProveedor || "Todos los proveedores"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    <button
                      onClick={() => {
                        setFiltroProveedor("");
                        setPage(1);
                        setSeleccionados(new Set());
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        !filtroProveedor
                          ? "bg-emerald-500/20 text-emerald-400 font-bold border-l-2 border-emerald-500"
                          : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                      }`}
                    >
                      Todos los proveedores
                    </button>
                    {proveedores.map((prov) => (
                      <button
                        key={prov}
                        onClick={() => {
                          setFiltroProveedor(prov);
                          setPage(1);
                          setSeleccionados(new Set());
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                          filtroProveedor === prov
                            ? "bg-emerald-500/20 text-emerald-400 font-bold border-l-2 border-emerald-500"
                            : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                        }`}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-white/5"></div>

          {/* Búsqueda */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              Búsqueda Rápida
            </h3>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="text"
                placeholder="Buscar código o nombre..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Botones de acción inferiores */}
          <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-white/5">
            {seleccionados.size > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-emerald-400 font-bold">
                    {seleccionados.size}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-500/70">seleccionados</span>
                </div>
                <button
                  onClick={() => setSeleccionados(new Set())}
                  className="text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-emerald-500/20 rounded-md transition-colors text-[10px] font-bold"
                  title="Limpiar selección"
                >
                  Limpiar
                </button>
              </div>
            )}

            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 p-2.5 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recargar Datos
            </button>

            <button
              onClick={handleAbrirPedido}
              disabled={seleccionados.size === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" />
              Generar Pedido
            </button>
          </div>
        </div>
      </div>

      {/* Main Content (Table) */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 flex-1 flex flex-col min-h-0 relative z-10">
        <ProductosTabla
          productos={productosFiltrados}
          loading={loading}
          seleccionados={seleccionados}
          onToggleSeleccion={handleToggleSeleccion}
          onSelectAll={handleSelectAll}
          emptyIcon={emptyConfig.icon}
          emptyText={emptyConfig.text}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => {
            setPage(p);
          }}
        />
      </div>

      {/* Modal */}
      <NuevoPedidoModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSeleccionados(new Set());
        }}
        productosPreseleccionados={productosSeleccionadosData}
        marcas={marcas}
        proveedorFiltro={filtroProveedor}
      />
    </div>
  );
}
