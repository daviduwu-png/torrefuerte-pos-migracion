import { useState } from "react";
import {
  FileDown,
  Calendar,
  Loader2,
  Clock,
  CalendarDays,
  CalendarRange,
  TrendingUp,
} from "lucide-react";
import { StyledSwal as Swal } from "../../utils/swal";
import { api } from "../../api/tauri";
import { getFechaHoy } from "../../utils/dateFormat";
import DatePicker from "../../components/ui/DatePicker";

export default function Reportes() {
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(getFechaHoy());
  const [fechaFin, setFechaFin] = useState(getFechaHoy());

  const handleExportarExcel = async (inicio: string, fin: string) => {
    setLoading(true);
    try {
      const res = await api.exportarReporteFinanciero(inicio, fin);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Exportación exitosa",
          text: res.message,
          confirmButtonColor: "#10b981",
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Error al exportar",
          text: res.message,
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo comunicar con el sistema.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener fechas de inicio y fin según el período
  const obtenerRangoFechas = (periodo: "dia" | "semana" | "mes" | "anual") => {
    const hoy = new Date();
    let inicio = new Date();

    switch (periodo) {
      case "dia":
        inicio = hoy;
        break;
      case "semana":
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 7);
        break;
      case "mes":
        inicio = new Date(hoy);
        inicio.setMonth(hoy.getMonth() - 1);
        break;
      case "anual":
        inicio = new Date(hoy);
        inicio.setFullYear(hoy.getFullYear() - 1);
        break;
    }

    return {
      inicio: inicio.toISOString().split("T")[0],
      fin: getFechaHoy(),
    };
  };

  const reportesRapidos = [
    {
      titulo: "Reporte Diario",
      descripcion: "Ventas del día actual",
      periodo: "dia" as const,
      icon: Clock,
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-500/20",
      border: "border-blue-500/20",
    },
    {
      titulo: "Reporte Semanal",
      descripcion: "Últimos 7 días",
      periodo: "semana" as const,
      icon: CalendarDays,
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/20",
      border: "border-emerald-500/20",
    },
    {
      titulo: "Reporte Mensual",
      descripcion: "Último mes",
      periodo: "mes" as const,
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
      shadow: "shadow-purple-500/20",
      border: "border-purple-500/20",
    },
    {
      titulo: "Reporte Anual",
      descripcion: "Último año",
      periodo: "anual" as const,
      icon: TrendingUp,
      color: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-500/20",
      border: "border-amber-500/20",
    },
  ];

  return (
    <div className="w-full h-full flex flex-col px-4 sm:px-6 lg:px-8 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
        
        {/* Columna Izquierda: Reporte Personalizado y Nota */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-6">
          {/* Reporte Personalizado por Rango de Fechas */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CalendarRange className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Reporte Personalizado
                </h2>
                <p className="text-slate-400 text-xs">
                  Genera un reporte financiero completo por rango de fechas
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-5 border border-slate-800 flex-1 flex flex-col">
              <p className="text-sm text-slate-400 mb-4 shrink-0">
                Este reporte genera un archivo Excel con 3 hojas detalladas:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-sm mb-6 shrink-0">
                <li>Ventas Totales (Desglose de productos y ganancia)</li>
                <li>Solo Facturables (Para contabilidad fiscal)</li>
                <li>Devoluciones (Registro de retornos)</li>
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                    Fecha Inicio
                  </label>
                  <DatePicker
                    value={fechaInicio}
                    onChange={(val) => setFechaInicio(val)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                    Fecha Fin
                  </label>
                  <DatePicker
                    value={fechaFin}
                    onChange={(val) => setFechaFin(val)}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={() => handleExportarExcel(fechaInicio, fechaFin)}
                disabled={loading}
                className="w-full mt-auto py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando Excel...
                  </>
                ) : (
                  <>
                    <FileDown className="w-5 h-5" />
                    GENERAR REPORTE PERSONALIZADO
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <FileDown className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-blue-300 font-bold text-sm mb-1">
                  Ubicación de Reportes
                </h3>
                <p className="text-blue-200/70 text-xs">
                  Los archivos Excel se guardan automáticamente en:{" "}
                  <code className="bg-blue-900/30 px-2 py-0.5 rounded text-blue-300">
                    Documents/Reportes_TorreFuerte/
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Reportes Rápidos */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 h-full">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2 lg:mb-0 shrink-0">
            <Clock className="w-5 h-5 text-emerald-400" />
            Reportes Rápidos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 flex-1">
            {reportesRapidos.map((reporte, idx) => {
              const IconComponent = reporte.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    const { inicio, fin } = obtenerRangoFechas(reporte.periodo);
                    handleExportarExcel(inicio, fin);
                  }}
                  disabled={loading}
                  className={`glass-card p-4 rounded-xl group border-l-4 ${reporte.border} hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-4 text-left w-full h-full relative overflow-hidden`}
                >
                  <div
                    className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${reporte.color} flex items-center justify-center shadow-lg ${reporte.shadow}`}
                  >
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm truncate">
                      {reporte.titulo}
                    </h3>
                    <p className="text-slate-400 text-xs truncate">
                      {reporte.descripcion}
                    </p>
                  </div>
                  
                  {/* Indicador de exportación en hover */}
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white/10 to-transparent flex items-center justify-end pr-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-full group-hover:translate-x-0">
                    <FileDown className="w-4 h-4 text-white" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
