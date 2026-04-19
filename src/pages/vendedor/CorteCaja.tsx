import { useState } from "react";
import {
  AlertTriangle,
  Printer,
  Calendar,
  AlertCircle,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  RotateCcw,
} from "lucide-react";
import { StyledSwal as Swal } from "../../utils/swal";
import { api, CorteCaja as CorteCajaType } from "../../api/tauri";
import { formatFechaHoraCorta } from "../../utils/dateFormat";

export default function CorteCaja() {
  const [corte, setCorte] = useState<CorteCajaType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generarCorte = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.obtenerCorteCaja();
      if (res.success && res.data) {
        setCorte(res.data);
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
          title: "Impresión exitosa",
          text: "Corte enviado a impresión correctamente.",
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
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-transparent">
      {!corte ? (
        <div className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-10 text-center border border-white/10 shadow-2xl relative overflow-hidden">
          <p className="text-slate-300 mb-8 leading-relaxed text-lg">
            Generar el corte de caja calculará el total de ventas del día actual
            y emitirá el reporte final.
            <br />
            <br />
            <span className="flex items-center justify-center gap-2 text-amber-400 font-medium bg-amber-500/10 py-2 px-4 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
              Finalice todas las ventas pendientes
            </span>
          </p>

          <button
            onClick={generarCorte}
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-red-900/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] border-t border-white/20"
          >
            {loading ? (
              "Calculando..."
            ) : (
              <>
                <Printer className="w-6 h-6" />
                GENERAR CORTE
              </>
            )}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 text-red-300 border border-red-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl">
          <div className="bg-gradient-to-b from-slate-900/80 to-slate-900/40 p-6 md:p-10 text-white text-center border-b border-white/5 relative">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <p className="text-sm text-emerald-400 uppercase font-bold tracking-widest mb-2">
              Total Recaudado
            </p>
            <h2 className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
              ${corte.total_venta.toFixed(2)}
            </h2>
            <div className="flex flex-col items-center gap-1 mt-4">
              <p className="text-xs text-emerald-400 uppercase font-bold tracking-widest">
                Corte generado
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-300 font-mono bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                <Calendar className="w-4 h-4" />
                <span>{formatFechaHoraCorta(corte.fecha)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-4">
            <div className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <Banknote className="w-5 h-5" />
                </div>
                <span className="text-slate-300 font-medium">Efectivo</span>
              </div>
              <span className="font-bold text-white text-lg font-mono">
                ${corte.total_efectivo.toFixed(2)}
              </span>
            </div>

            <div className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-slate-300 font-medium">Tarjeta</span>
              </div>
              <span className="font-bold text-white text-lg font-mono">
                ${corte.total_tarjeta.toFixed(2)}
              </span>
            </div>

            <div className="glass-card p-4 rounded-xl flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <span className="text-slate-300 font-medium">
                  Transferencia
                </span>
              </div>
              <span className="font-bold text-white text-lg font-mono">
                ${corte.total_transferencia.toFixed(2)}
              </span>
            </div>

            <div className="border-t border-white/10 my-6"></div>

            <div className="flex justify-between text-xs text-slate-500 font-mono uppercase tracking-wider">
              <span>Tickets: {corte.total_tickets}</span>
              <span>
                #{corte.ticket_inicial} - #{corte.ticket_final}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => setCorte(null)}
                className="py-4 flex items-center justify-center border border-white/10 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all "
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Otro Corte
              </button>
              <button
                onClick={imprimirCorte}
                className="py-4 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
