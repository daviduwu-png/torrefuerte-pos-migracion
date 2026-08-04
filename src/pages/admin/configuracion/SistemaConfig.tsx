import { useState, useEffect } from "react";
import { Monitor, Moon, Sun, Save, RefreshCw } from "lucide-react";
import { api } from "../../../api/tauri";
import { notify } from "../../../utils/sileo";
import { Select } from "../../../components/ui/Select";

export function SistemaConfig() {
  const [tema, setTema] = useState<string>("dark");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [moneda, setMoneda] = useState<string>("MXN");
  const [iva, setIva] = useState<string>("16");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarConfig();
  }, []);

  async function cargarConfig() {
    try {
      const res = await api.obtenerConfiguracion();
      if (res.success && res.data) {
        if (res.data.sistema_tema) setTema(res.data.sistema_tema);
        if (res.data.sistema_logo) setLogoBase64(res.data.sistema_logo);
        if (res.data.sistema_moneda) setMoneda(res.data.sistema_moneda);
        if (res.data.sistema_iva) setIva(res.data.sistema_iva);
      }
    } catch (error) {
      console.error("Error al cargar configuración del sistema", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      const configToSave = {
        sistema_tema: tema,
        sistema_logo: logoBase64,
        sistema_moneda: moneda,
        sistema_iva: iva,
      };
      const res = await api.guardarConfiguracion(configToSave);
      if (res.success) {
        notify.success({ title: "Guardado", description: "Preferencias del sistema actualizadas." });
        // Optionally apply theme globally if implemented
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (error) {
      notify.error({ title: "Error", description: "No se pudieron guardar las preferencias." });
    } finally {
      setSaving(false);
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notify.error({ title: "Error", description: "La imagen no debe superar los 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col gap-6 h-full min-h-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-900/30 flex items-center justify-center text-indigo-400">
            <Monitor size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Preferencias del Sistema</h2>
            <p className="text-sm text-slate-400">Ajustes visuales y globales de la aplicación</p>
          </div>
        </div>
        <button 
          onClick={handleGuardar}
          disabled={loading || saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {/* Apariencia */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Apariencia</h3>
          <div className="flex gap-3">
            <button 
              onClick={() => setTema("dark")}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${tema === "dark" ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-transparent bg-slate-800 hover:bg-slate-700 text-slate-400"}`}
            >
              <Moon size={24} />
              <span className="text-xs font-semibold">Modo Oscuro</span>
            </button>
            <button 
              onClick={() => setTema("light")}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${tema === "light" ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-transparent bg-slate-800 hover:bg-slate-700 text-slate-400"}`}
            >
              <Sun size={24} />
              <span className="text-xs font-semibold">Modo Claro</span>
            </button>
          </div>
        </div>

        {/* Logo Global */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Logotipo Principal</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              {logoBase64 ? (
                <img src={logoBase64} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-slate-500">Logo</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-2">Usado en el sistema, PDFs (pedidos y cotizaciones) y reportes. Tamaño recomendado 200x200px (Max 2MB).</p>
              <div className="flex gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-xs font-medium transition-colors">
                  Cargar Imagen...
                  <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logoBase64 && (
                  <button 
                    onClick={() => setLogoBase64("")} 
                    className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 rounded text-red-400 text-xs font-medium transition-colors"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Localización y Finanzas */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 md:col-span-2 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Localización y Finanzas</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Moneda Principal</label>
              <Select
                value={moneda}
                onChange={(val) => setMoneda(val)}
                options={[
                  { value: "MXN", label: "Pesos Mexicanos (MXN)" },
                  { value: "USD", label: "Dólares (USD)" },
                  { value: "EUR", label: "Euros (EUR)" },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tasa de IVA (%)</label>
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled
                    className="w-8 h-8 flex items-center justify-center shrink-0 bg-slate-700 rounded-full border border-slate-600 text-white font-bold opacity-50 cursor-not-allowed"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    value="16"
                    disabled
                    className="w-full text-center px-3 py-1.5 rounded-lg text-sm text-slate-400 font-bold border border-slate-700 bg-slate-800/40 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  />
                  <button
                    type="button"
                    disabled
                    className="w-8 h-8 flex items-center justify-center shrink-0 bg-slate-700 rounded-full border border-slate-600 text-white font-bold opacity-50 cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                <p className="text-[10px] text-blue-400 mt-1.5">Fijo al estándar nacional (16%) temporalmente</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Estos datos se utilizarán por defecto al calcular impuestos y mostrar precios en todo el sistema.</p>
        </div>
      </div>
    </div>
  );
}
