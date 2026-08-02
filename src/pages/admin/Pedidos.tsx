import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PedidosTab from "./gestion/PedidosTabMain";
import HistorialPedidos from "./gestion/pedidos/components/HistorialPedidos";
import { ShoppingCart, History } from "lucide-react";

type Mode = "generar" | "historial";

export default function Pedidos() {
  const [mode, setMode] = useState<Mode>("generar");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("header-actions-portal"));
  }, []);

  const switchContent = (
    <div className="flex items-center p-1 bg-slate-900/80 border border-white/5 rounded-xl shadow-lg ml-2">
      <button
        onClick={() => setMode("generar")}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
          mode === "generar"
            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <ShoppingCart className="w-4 h-4" />
        Pedidos
      </button>
      <button
        onClick={() => setMode("historial")}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
          mode === "historial"
            ? "bg-blue-600 text-white shadow-sm shadow-blue-900/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <History className="w-4 h-4" />
        Historial
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col min-h-0 min-w-0 bg-slate-900/40 border border-white/5 rounded-2xl p-2 sm:p-6 relative overflow-hidden backdrop-blur-sm">
      {portalTarget && createPortal(switchContent, portalTarget)}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
      {mode === "generar" ? <PedidosTab /> : <HistorialPedidos />}
    </div>
  );
}
