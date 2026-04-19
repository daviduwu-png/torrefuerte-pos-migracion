import { useState, useEffect } from "react";
import { api, Devolucion } from "../../api/tauri";
import { Search, Filter, Loader2, RotateCcw } from "lucide-react";
import { StyledSwal as Swal } from "../../utils/swal";
import { formatFechaHoraCorta, getFechaHoy } from "../../utils/dateFormat";
import DatePicker from "../../components/ui/DatePicker";

export default function Devoluciones() {
  const [loading, setLoading] = useState(false);
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

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
    } else if (period === "semana") {
      const first = new Date(now.setDate(d - now.getDay()));
      start = first.toISOString().split("T")[0];
      end = getFechaHoy();
    } else if (period === "mes") {
      start = new Date(y, m, 1).toISOString().split("T")[0];
      end = new Date(y, m + 1, 0).toISOString().split("T")[0];
    } else if (period === "anio") {
      start = new Date(y, 0, 1).toISOString().split("T")[0];
      end = new Date(y, 11, 31).toISOString().split("T")[0];
    }

    setFechaInicio(start);
    setFechaFin(end);
    fetchDevoluciones(start, end);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 border border-white/10 relative z-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <h6 className="text-amber-500 font-bold text-xs uppercase flex items-center gap-2 tracking-wider">
            <Filter className="w-4 h-4" /> Filtrar Devoluciones
          </h6>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">
                Desde
              </label>
              <DatePicker
                value={fechaInicio}
                onChange={setFechaInicio}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">
                Hasta
              </label>
              <DatePicker
                value={fechaFin}
                onChange={setFechaFin}
                className="w-full"
              />
            </div>
            <div className="lg:col-span-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Buscar Registros
              </button>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-white/5 pt-4">
            {["hoy", "semana", "mes", "anio"].map((period) => (
              <button
                key={period}
                onClick={() => handleQuickFilter(period as any)}
                className="py-2.5 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-300 hover:text-amber-400 text-sm font-medium transition-all capitalize shadow-sm"
              >
                {period === "anio"
                  ? "Año Actual"
                  : period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-900/50 border-b border-white/5">
              <tr>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-6 py-4 tracking-wider">
                  Fecha
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-6 py-4 tracking-wider">
                  Ticket (ID)
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-6 py-4 tracking-wider">
                  Código
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-6 py-4 tracking-wider">
                  Producto
                </th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase px-6 py-4 tracking-wider">
                  Cant.
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-6 py-4 tracking-wider">
                  Motivo
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-6 py-4 tracking-wider">
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
                    <td className="px-6 py-4 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      {formatFechaHoraCorta(dev.fecha)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-amber-500/90 font-medium group-hover:text-amber-400">
                      {dev.ticket_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono group-hover:text-slate-400">
                      {dev.codigo_interno || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {dev.producto}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-200 text-center font-bold bg-white/5 mx-2 rounded-lg">
                      {dev.cantidad}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 italic">
                      {dev.motivo || "Sin motivo"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 group-hover:text-slate-400">
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
