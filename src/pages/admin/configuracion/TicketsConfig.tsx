import { useState, useEffect } from "react";
import { Receipt, Save, RefreshCw } from "lucide-react";
import { api } from "../../../api/tauri";
import { notify } from "../../../utils/sileo";

export function TicketsConfig() {
  const [config, setConfig] = useState<Record<string, string>>({
    ticket_nombre_local: "",
    ticket_rfc: "",
    ticket_direccion_1: "",
    ticket_direccion_2: "",
    ticket_direccion_3: "",
    ticket_mensaje: "",
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarConfig();
  }, []);

  async function cargarConfig() {
    try {
      const res = await api.obtenerConfiguracion();
      if (res.success && res.data) {
        setConfig((prev) => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error("Error al cargar configuración", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      const res = await api.guardarConfiguracion(config);
      if (res.success) {
        notify.success({ title: "Guardado", description: "Configuración de tickets actualizada." });
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (error) {
      notify.error({ title: "Error", description: "No se pudo guardar la configuración." });
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col lg:flex-row gap-6">
      {/* Formulario */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center text-emerald-400">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Datos del Ticket</h2>
              <p className="text-sm text-slate-400">Información fiscal y dirección para los recibos</p>
            </div>
          </div>
          <button 
            onClick={handleGuardar}
            disabled={loading || saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar
          </button>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Local</label>
            <input 
              type="text" 
              value={config.ticket_nombre_local || ""} 
              onChange={(e) => handleChange("ticket_nombre_local", e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors border border-slate-700 bg-slate-800/80" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">RFC</label>
            <input 
              type="text" 
              value={config.ticket_rfc || ""} 
              onChange={(e) => handleChange("ticket_rfc", e.target.value.toUpperCase())}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-emerald-500 transition-colors border border-slate-700 bg-slate-800/80" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Dirección (Línea 1)</label>
            <input 
              type="text" 
              value={config.ticket_direccion_1 || ""} 
              onChange={(e) => handleChange("ticket_direccion_1", e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors border border-slate-700 bg-slate-800/80" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Dirección (Línea 2)</label>
            <input 
              type="text" 
              value={config.ticket_direccion_2 || ""} 
              onChange={(e) => handleChange("ticket_direccion_2", e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors border border-slate-700 bg-slate-800/80" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Dirección (Línea 3)</label>
            <input 
              type="text" 
              value={config.ticket_direccion_3 || ""} 
              onChange={(e) => handleChange("ticket_direccion_3", e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors border border-slate-700 bg-slate-800/80" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Mensaje de Despedida</label>
            <input 
              type="text" 
              value={config.ticket_mensaje || ""} 
              onChange={(e) => handleChange("ticket_mensaje", e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors border border-slate-700 bg-slate-800/80" 
            />
          </div>
        </div>
      </div>

      {/* Previsualización del Ticket */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col items-center">
        <h3 className="text-sm font-bold text-slate-300 mb-4 self-start">Previsualización (58mm)</h3>
        
        <div className="bg-[#fcfcfc] text-black w-64 p-4 rounded-sm shadow-xl font-mono text-[10px] leading-tight select-none">
          <div className="text-center font-bold text-base mb-1">{config.ticket_nombre_local || "NOMBRE DEL LOCAL"}</div>
          <div className="text-center mb-3 text-gray-700">
            RFC: {config.ticket_rfc || "RFC"}<br/>
            {config.ticket_direccion_1}<br/>
            {config.ticket_direccion_2}<br/>
            {config.ticket_direccion_3}
          </div>
          <div className="mb-1">Ticket: 12345</div>
          <div className="mb-2">Fecha: 02/08/2026 14:30</div>
          <div className="border-t border-dashed border-gray-400 my-2"></div>
          
          <div className="flex justify-between mb-1">
            <span>Aceite Sintético</span>
            <span>$250.00</span>
          </div>
          <div className="text-gray-600 mb-2">1 x $250.00</div>
          
          <div className="flex justify-between mb-1">
            <span>Filtro de Aire</span>
            <span>$120.00</span>
          </div>
          <div className="text-gray-600 mb-2">1 x $120.00</div>

          <div className="border-t border-dashed border-gray-400 my-2"></div>
          
          <div className="flex justify-between font-bold text-sm mb-1">
            <span>TOTAL:</span>
            <span>$370.00</span>
          </div>
          <div className="flex justify-between">
            <span>RECIBIDO:</span>
            <span>$400.00</span>
          </div>
          <div className="flex justify-between">
            <span>CAMBIO:</span>
            <span>$30.00</span>
          </div>
          
          <div className="text-center mt-6 mb-2">{config.ticket_mensaje || "Gracias por su compra"}</div>
        </div>
      </div>
    </div>
  );
}
