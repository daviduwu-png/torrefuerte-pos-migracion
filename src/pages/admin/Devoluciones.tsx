import { useState, useEffect } from "react";
import { api, Devolucion } from "../../api/tauri";
import { Search, Loader2, RotateCcw, Clock, Calendar } from "lucide-react";
import { StyledSwal as Swal } from "../../utils/swal";
import { formatFechaHoraCorta, getFechaHoy } from "../../utils/dateFormat";
import DatePicker from "../../components/ui/DatePicker";

export default function Devoluciones() {
  const [loading, setLoading] = useState(false);
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [titulo, setTitulo] = useState("Devoluciones de Hoy");
  const [activeFilter, setActiveFilter] = useState<"hoy" | "semana" | "mes" | "anio" | "custom">("hoy");

  // Initial load - maybe load today's returns?
  useEffect(() => {
    handleQuickFilter("hoy");
  }, []);

  const fetchDevoluciones = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const response = await api.listarDevoluciones(start, end);
      if (response.success && response.data) {
        setDevoluciones(response.data);
      } else {
        setDevoluciones([]); // Clear or handle error
      }
    } catch (error) {
      console.error("Error fetching devoluciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: "warning",
        title: "Fechas requeridas",
        text: "Por favor seleccione ambas fechas para buscar.",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }
    setTitulo(`Devoluciones del ${fechaInicio} al ${fechaFin}`);
    setActiveFilter("custom");
    fetchDevoluciones(fechaInicio, fechaFin);
  };

  const handleQuickFilter = (period: "hoy" | "semana" | "mes" | "anio") => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    let start = "";
    let end = "";

    if (period === "hoy") {
      start = getFechaHoy();
      end = start;
      setTitulo("Devoluciones de Hoy");
    } else if (period === "semana") {
      const first = new Date(now.setDate(d - now.getDay()));
      start = first.toISOString().split("T")[0];
      end = getFechaHoy();
      setTitulo("Devoluciones de la Semana");
    } else if (period === "mes") {
      start = new Date(y, m, 1).toISOString().split("T")[0];
      end = new Date(y, m + 1, 0).toISOString().split("T")[0];
      setTitulo("Devoluciones del Mes");
    } else if (period === "anio") {
      start = new Date(y, 0, 1).toISOString().split("T")[0];
      end = new Date(y, 11, 31).toISOString().split("T")[0];
      setTitulo("Devoluciones del Año");
    }

    setFechaInicio(start);
    setFechaFin(end);
    setActiveFilter(period);
    fetchDevoluciones(start, end);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 animate-in fade-in duration-300">
      {/* Panel de Filtros (Izquierda) */}
      <div className="glass-panel rounded-2xl shadow-lg border border-white/10 shrink-0 w-full lg:w-72 flex flex-col relative z-20">
        <div className="p-4 sm:p-5 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
          
          {/* Quick Filters */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Filtros Rápidos
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {["hoy", "semana", "mes", "anio"].map((period) => (
                <button
                  key={period}
                  onClick={() => handleQuickFilter(period as any)}
                  className={`px-2 py-2 text-xs font-bold rounded-xl transition-all border text-center ${
                    activeFilter === period
                      ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-900/20"
                      : "bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {period === "anio" ? "Este Año" : (period === "hoy" ? "Hoy" : (period === "semana" ? "Semana" : "Mes"))}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5"></div>

          {/* Custom Date Range */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Rango Personalizado
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 tracking-wider">
                  Desde
                </label>
                <DatePicker
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 tracking-wider">
                  Hasta
                </label>
                <DatePicker
                  value={fechaFin}
                  onChange={setFechaFin}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full mt-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-lg shadow-amber-900/20"
              >
                {loading && activeFilter === "custom" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Buscar Registros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 flex-1 flex flex-col min-h-0 relative z-10">
        <div className="bg-slate-900/50 px-4 sm:px-6 py-4 flex items-center gap-2 border-b border-white/5 shrink-0">
          <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/20 shrink-0">
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="font-bold text-base sm:text-lg text-white truncate">
            {titulo}
          </h3>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-900/50 sticky top-0 z-10 shadow-sm border-b border-white/5">
              <tr>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3 tracking-wider">
                  Fecha
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3 tracking-wider">
                  Ticket (ID)
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3 tracking-wider">
                  Código
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3 tracking-wider">
                  Producto
                </th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase px-4 py-3 tracking-wider">
                  Cant.
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3 tracking-wider">
                  Motivo
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3 tracking-wider">
                  Usuario
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {devoluciones.length > 0 ? (
                devoluciones.map((dev) => (
                  <tr
                    key={dev.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-4 py-3 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      {formatFechaHoraCorta(dev.fecha)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-amber-500/90 font-medium group-hover:text-amber-400">
                      {dev.ticket_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono group-hover:text-slate-400">
                      {dev.codigo_interno || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {dev.producto}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200 text-center font-bold bg-white/5 mx-2 rounded-lg">
                      {dev.cantidad}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 italic">
                      {dev.motivo || "Sin motivo"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 group-hover:text-slate-400">
                      {dev.usuario || "Sistema"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                        <RotateCcw className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="font-medium text-lg">No hay devoluciones</p>
                      <p className="text-sm opacity-60">
                        Prueba ajustando los filtros de fecha
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
