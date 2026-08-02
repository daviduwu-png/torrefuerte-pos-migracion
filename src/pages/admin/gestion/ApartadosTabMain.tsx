import { useState } from "react";
import { Search, Filter, Loader2, Package, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import { useApartados } from "./apartados/hooks/useApartados";
import { ApartadoDetalleModal } from "./apartados/components/ApartadoDetalleModal";
import { Apartado } from "../../../api/tauri";

export default function ApartadosTabMain() {
  const {
    apartados,
    loading,
    busqueda,
    setBusqueda,
    estadoFiltro,
    setFiltroEstado,
    recargar
  } = useApartados();

  const [apartadoSeleccionado, setApartadoSeleccionado] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const opcionesFiltro = [
    { value: "", label: "Todos los estados" },
    { value: "activo", label: "Activos" },
    { value: "liquidado", label: "Liquidados" },
    { value: "cancelado", label: "Cancelados" },
  ];

  const filtrados = apartados.filter((a) => {
    const term = busqueda.toLowerCase();
    return (
      a.id.toString().includes(term) ||
      a.cliente_nombre.toLowerCase().includes(term)
    );
  });

  return (
    <div className="h-full flex flex-col min-h-0 relative">
      {/* Header & Filters */}
      <div className="shrink-0 pb-3 border-b border-white/10 mb-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight">Gestión de Créditos y Apartados</h2>
              <p className="text-xs text-slate-400">Administra los productos reservados, deudas y pagos de clientes.</p>
            </div>
          </div>

        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 flex-wrap sm:flex-nowrap">
          {/* Buscador */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por cliente o folio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all shadow-inner"
            />
          </div>

          {/* Filtro Estado */}
          <div className="relative group min-w-[170px]">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between pl-10 pr-3 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-white hover:border-blue-500/50 focus:border-blue-500/50 outline-none transition-all shadow-inner"
            >
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Filter className={`w-4 h-4 transition-colors ${dropdownOpen ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'}`} />
              </div>
              <span className="truncate pr-2">
                {opcionesFiltro.find(o => o.value === estadoFiltro)?.label || "Todos los estados"}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                  {opcionesFiltro.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFiltroEstado(opt.value);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        estadoFiltro === opt.value
                          ? "bg-blue-500/20 text-blue-400 font-bold border-l-2 border-blue-500"
                          : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto bg-slate-950/30 rounded-2xl border border-white/5 relative min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p className="text-sm font-medium">Cargando apartados...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <Package className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">No se encontraron apartados</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-400 bg-slate-900/80 sticky top-0 z-10 shadow-md backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Folio</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Fecha</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Pendiente</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map((a: Apartado) => (
                <tr 
                  key={a.id} 
                  onClick={() => setApartadoSeleccionado(a.id)}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-mono text-slate-300">APT-{a.id}</td>
                  <td className="px-6 py-4 text-white font-medium">{a.cliente_nombre}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(a.fecha.replace(" ", "T") + "Z").toLocaleString("es-MX", { 
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" 
                    })}
                  </td>
                  <td className="px-6 py-4 text-emerald-400 font-medium">${a.total.toFixed(2)}</td>
                  <td className="px-6 py-4 text-rose-400 font-medium">${a.monto_pendiente.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {a.estado === "activo" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20 flex items-center w-max gap-1"><Loader2 className="w-3 h-3" /> ACTIVO</span>}
                    {a.estado === "cancelado" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center w-max gap-1"><XCircle className="w-3 h-3" /> CANCELADO</span>}
                    {a.estado === "liquidado" && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center w-max gap-1"><CheckCircle className="w-3 h-3" /> LIQUIDADO</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {apartadoSeleccionado && (
        <ApartadoDetalleModal 
          apartadoId={apartadoSeleccionado} 
          onClose={() => setApartadoSeleccionado(null)}
          onApartadoActualizado={recargar}
        />
      )}
    </div>
  );
}
