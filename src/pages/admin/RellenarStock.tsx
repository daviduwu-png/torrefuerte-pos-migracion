import { useState } from "react";
import { PackagePlus, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { api } from "../../api/tauri";
import { StyledSwal as Swal } from "../../utils/swal";

export default function RellenarStock() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleRellenar = async () => {
    const confirm = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Se actualizará el stock de TODOS los productos a 100. Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, rellenar stock",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await api.rellenarStockMasivo();
      if (response.success) {
        setResult(response.message);
        Swal.fire("Éxito", response.message, "success");
      } else {
        Swal.fire("Error", response.message, "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-amber-500/30">
          <PackagePlus className="w-10 h-10 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">
            Rellenar Stock Masivo
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Herramienta de desarrollo para establecer{" "}
            <strong className="text-white">100 unidades de stock</strong> a
            TODOS los productos del inventario.
          </p>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3 text-left max-w-lg mx-auto">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-red-500 font-bold text-sm">Advertencia</h4>
            <p className="text-red-400 text-xs leading-relaxed">
              Esta acción sobrescribirá el stock actual de todos los productos.
              Úsalo solo en entornos de prueba o durante la configuración
              inicial.
            </p>
          </div>
        </div>

        <button
          onClick={handleRellenar}
          disabled={loading}
          className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2 mx-auto min-w-[200px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <PackagePlus className="w-5 h-5" />
              Rellenar Stock a 100
            </>
          )}
        </button>

        {result && (
          <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center justify-center gap-2 text-emerald-400 font-medium animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle className="w-5 h-5" />
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
