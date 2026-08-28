import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Settings2, BookOpen } from "lucide-react";
import GestionProductos from "./productos/GestionProductos";
import CatalogoProductos from "./productos/CatalogoProductos";


type Mode = "gestion" | "catalogo";

export default function Productos() {
  const [mode, setMode] = useState<Mode>("gestion");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);

  useEffect(() => {
    setPortalTarget(document.getElementById("header-actions-portal"));
  }, []);

  const handleModeChange = useCallback((next: Mode) => {
    if (next === mode) return;
    setMode(next);
  }, [mode]);

  const switchContent = (
    <div className="flex items-center p-1 bg-slate-900/80 border border-white/5 rounded-xl shadow-lg ml-2">
      <button
        onClick={() => handleModeChange("gestion")}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
          mode === "gestion"
            ? "bg-amber-500 text-slate-900 shadow-sm shadow-amber-900/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <Settings2 className="w-4 h-4" />
        Gestión
      </button>
      <button
        onClick={() => handleModeChange("catalogo")}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
          mode === "catalogo"
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <BookOpen className="w-4 h-4" />
        Facturables
        {pendingChangesCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-violet-500 text-white text-[9px] font-black rounded-full shadow-sm shadow-violet-900/20">
            {pendingChangesCount}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      {portalTarget && createPortal(switchContent, portalTarget)}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
      <div className={mode === "gestion" ? "contents" : "hidden"}>
        <GestionProductos />
      </div>
      <div className={mode === "catalogo" ? "contents" : "hidden"}>
        <CatalogoProductos onPendingChangesChange={setPendingChangesCount} />
      </div>
    </div>
  );
}