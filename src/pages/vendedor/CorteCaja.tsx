import { useState } from "react";
import {
  AlertTriangle,
  Printer,
  Calendar,
  AlertCircle,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Wifi,
  ArrowLeft,
} from "lucide-react";
import { StyledSwal as Swal } from "../../utils/swal";
import { api, CorteCaja as CorteCajaType } from "../../api/tauri";
import { formatFechaHoraCorta } from "../../utils/dateFormat";
import DatePicker from "../../components/ui/DatePicker";

/** Devuelve la fecha de hoy en formato "YYYY-MM-DD" usando la hora local */
function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Convierte "YYYY-MM-DD" a un texto legible tipo "lunes 13 Jul 2026" */
function fechaLegible(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CorteCaja() {
  const [corte, setCorte] = useState<CorteCajaType | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [error, setError] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] =
    useState<string>(todayStr());

  const esHoy = fechaSeleccionada === todayStr();

  const generarCorte = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.obtenerCorteCaja(fechaSeleccionada);
      if (res.success && res.data) {
        setCorte(res.data);

        // Backup automático al cierre del día (solo si es el día de hoy, no históricos)
        // Usa tipo "corte" para que sea independiente del backup del login (sin límite diario)
        if (esHoy) {
          api.crearRespaldo("corte").catch((err) => {
            console.error("Error al generar backup en corte de caja:", err);
          });
        }

        try {
          const printRes = await api.imprimirCorte(res.data);
          if (printRes.success) {
            Swal.fire({
              icon: "success",
              title: "Corte generado e impreso",
              text: "El corte de caja se calculó y se envió a la impresora correctamente.",
              timer: 2200,
              showConfirmButton: false,
            });
          } else {
            Swal.fire({
              icon: "warning",
              title: "Corte en pantalla (Sin imprimir)",
              text: `No se pudo imprimir automáticamente: ${printRes.message}`,
              confirmButtonColor: "#f59e0b",
            });
          }
        } catch (e) {
          console.error("Error al auto-imprimir corte:", e);
        }
      } else {
        setError(res.message || "Error al generar el corte");
      }
    } catch (err) {
      setError("Error de comunicación");
    } finally {
      setLoading(false);
    }
  };

  const imprimirCorte = async () => {
    if (!corte) return;
    try {
      const res = await api.imprimirCorte(corte);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Reimpresión exitosa",
          text: "El corte de caja se envió nuevamente a la impresora.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Error al reimprimir",
          text: res.message,
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (e) {
      console.error(e);
      await Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con la impresora.",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const testImpresora = async () => {
    setLoadingTest(true);
    try {
      const res = await api.imprimirTest();
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Impresora OK",
          text: "Página de prueba enviada correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Error al imprimir",
          text: res.message,
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (e) {
      console.error(e);
      await Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con la impresora.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-2 md:p-4 xl:p-6 bg-transparent overflow-y-auto">
      {!corte ? (
        <div className="w-full max-w-screen-2xl glass-panel rounded-3xl border border-white/10 shadow-2xl relative my-auto animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-900/60 p-6 md:p-8 xl:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5 relative rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                  Corte de Caja Diario
                </h1>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
                  El corte de caja recopila todas las ventas registradas del
                  período seleccionado, desglosando los ingresos por efectivo,
                  tarjeta bancaria y transferencias electrónicas.
                </p>

                <div className="p-4 bg-amber-500/10 border border-amber-500/80 bg-black rounded-2xl flex items-start gap-3 text-amber-300 text-xs md:text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">
                      Antes de generar el corte:
                    </span>
                    Verifique que todas las ventas en mostrador hayan sido
                    debidamente cobradas y finalizadas.
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-300">
                      Diagnóstico de Hardware
                    </p>
                    <p className="text-xs text-slate-500">
                      Verificar conexión con impresora POS
                    </p>
                  </div>
                  <button
                    onClick={testImpresora}
                    disabled={loadingTest || loading}
                    className="w-full sm:w-auto px-5 py-3 flex items-center bg-gray-700 justify-center gap-2 border border-slate-600/60 rounded-xl text-slate-300 hover:text-teal-400 hover:border-teal-500/40 hover:bg-teal-500/10 font-semibold text-xs md:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
                  >
                    <Wifi className="w-4 h-4" />
                    {loadingTest ? "Enviando prueba..." : "Probar impresora"}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 xl:p-12 bg-slate-900/40 flex flex-col justify-center space-y-6 rounded-b-3xl lg:rounded-r-3xl lg:rounded-bl-none overflow-visible">
              <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 bg-white/[0.02]">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Seleccionar Día de Auditoría
                </label>

                <DatePicker
                  value={fechaSeleccionada}
                  onChange={(d) => {
                    setFechaSeleccionada(d);
                    setError("");
                  }}
                  maxDate={todayStr()}
                  placeholder="Seleccionar fecha"
                />

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">
                    Estado del período:
                  </span>
                  {esHoy ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      ✓ Día actual en curso
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      Corte histórico · {fechaLegible(fechaSeleccionada)}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <button
                  onClick={generarCorte}
                  disabled={loading || !fechaSeleccionada}
                  className="w-full py-5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-red-900/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] border-t border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    "Calculando e imprimiendo..."
                  ) : (
                    <>
                      <Printer className="w-6 h-6" />
                      GENERAR CORTE
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-500/10 text-red-300 border border-red-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full max-w-screen-2xl glass-panel rounded-3xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl flex flex-col lg:flex-row relative">
          {/* Línea decorativa superior */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent z-20" />

          {/* Panel Izquierdo: Resumen y Acciones */}
          <div className="w-full lg:w-1/3 xl:w-1/4 p-6 md:p-8 xl:p-10 bg-gradient-to-b from-slate-900/95 to-slate-900/60 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col relative z-10">
            <div className="flex-1">
              {!esHoy && (
                <div className="mb-4 inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />
                  Corte histórico · {fechaLegible(fechaSeleccionada)}
                </div>
              )}
              <p className="text-sm text-emerald-400 uppercase font-black tracking-widest mb-2 mt-2">
                Total Recaudado
              </p>
              <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter drop-shadow-lg mb-8">
                ${corte.total_venta.toFixed(2)}
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-300 font-mono bg-white/5 px-4 py-3.5 rounded-2xl border border-white/5">
                  <Calendar className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    {formatFechaHoraCorta(corte.fecha)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300 font-mono bg-white/5 px-4 py-3.5 rounded-2xl border border-white/5">
                  <div className="flex flex-row items-center justify-center gap-2">
                    <span className="text-white font-bold text-base mb-0.5">
                      Tickets: {corte.total_tickets}
                    </span>
                    <span className="text-slate-500 text-xs">
                      (#{corte.ticket_inicial} - #{corte.ticket_final})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
              <button
                onClick={imprimirCorte}
                className="w-full py-4 px-5 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-md shadow-blue-900/20 active:scale-[0.98] text-sm"
              >
                <Printer className="w-5 h-5 mr-2" />
                Reimprimir Corte
              </button>
              <button
                onClick={() => setCorte(null)}
                className="w-full py-4 px-5 flex items-center justify-center border border-white/15 rounded-2xl font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all shadow-md active:scale-[0.98] text-sm bg-white/[0.02]"
              >
                <ArrowLeft className="w-5 h-5 mr-2 text-slate-400" />
                Volver atrás
              </button>
            </div>
          </div>

          {/* Panel Derecho: Desgloses */}
          <div className="w-full lg:w-2/3 xl:w-3/4 p-6 md:p-8 xl:p-10 bg-slate-900/40 flex flex-col gap-6 xl:gap-8 overflow-y-auto z-10">
            {/* Tipo de Producto */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
                Desglose por tipo de producto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="glass-card rounded-3xl p-6 xl:p-8 flex flex-col justify-center border border-white/5 hover:border-teal-500/30 transition-all bg-white/[0.02] hover:bg-white/[0.04] group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3.5 bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors rounded-2xl text-teal-400 shrink-0">
                      <CreditCard className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-slate-200 font-bold text-xl block mb-1">
                        Facturables
                      </span>
                      <span className="text-sm text-slate-500 font-mono block">
                        Productos con IVA / factura
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="font-black text-white text-4xl xl:text-5xl font-mono tracking-tight text-teal-400 drop-shadow-md">
                      ${corte.total_facturable.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 xl:p-8 flex flex-col justify-center border border-white/5 hover:border-orange-500/30 transition-all bg-white/[0.02] hover:bg-white/[0.04] group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3.5 bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors rounded-2xl text-orange-400 shrink-0">
                      <Banknote className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-slate-200 font-bold text-xl block mb-1">
                        No Facturables
                      </span>
                      <span className="text-sm text-slate-500 font-mono block">
                        Productos sin factura
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="font-black text-white text-4xl xl:text-5xl font-mono tracking-tight text-orange-400 drop-shadow-md">
                      ${corte.total_no_facturable.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
                Desglose por método de pago
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                <div className="glass-card rounded-3xl p-6 xl:p-8 flex flex-col justify-center border border-white/5 hover:border-emerald-500/30 transition-all bg-white/[0.02] hover:bg-white/[0.04] group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors rounded-xl text-emerald-400 shrink-0">
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-slate-200 font-bold text-lg block mb-0.5">
                        Efectivo
                      </span>
                      <span className="text-xs text-slate-500 font-mono block">
                        Pagos en caja
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="font-black text-white text-3xl xl:text-4xl font-mono tracking-tight text-emerald-400 drop-shadow-md">
                      ${corte.total_efectivo.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 xl:p-8 flex flex-col justify-center border border-white/5 hover:border-blue-500/30 transition-all bg-white/[0.02] hover:bg-white/[0.04] group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors rounded-xl text-blue-400 shrink-0">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-slate-200 font-bold text-lg block mb-0.5">
                        Tarjeta
                      </span>
                      <span className="text-xs text-slate-500 font-mono block">
                        Débito / Crédito
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="font-black text-white text-3xl xl:text-4xl font-mono tracking-tight text-blue-400 drop-shadow-md">
                      ${corte.total_tarjeta.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 xl:p-8 flex flex-col justify-center border border-white/5 hover:border-purple-500/30 transition-all bg-white/[0.02] hover:bg-white/[0.04] group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors rounded-xl text-purple-400 shrink-0">
                      <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-slate-200 font-bold text-lg block mb-0.5">
                        Transferencia
                      </span>
                      <span className="text-xs text-slate-500 font-mono block">
                        SPEI / Electrónico
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="font-black text-white text-3xl xl:text-4xl font-mono tracking-tight text-purple-400 drop-shadow-md">
                      ${corte.total_transferencia.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
