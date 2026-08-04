import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ImpresorasConfig } from "./configuracion/ImpresorasConfig";
import { SistemaConfig } from "./configuracion/SistemaConfig";
import { TicketsConfig } from "./configuracion/TicketsConfig";
import { UsuariosConfig } from "./configuracion/UsuariosConfig";
import { Printer, Receipt, Monitor, Users } from "lucide-react";

type Tab = "impresoras" | "tickets" | "sistema" | "usuarios";

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState<Tab>("impresoras");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("header-actions-portal"));
  }, []);

  const tabsContent = (
    <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-white/5 rounded-xl shadow-lg ml-2">
      <button
        onClick={() => setActiveTab("impresoras")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
          activeTab === "impresoras"
            ? "bg-slate-700 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <Printer className="w-3.5 h-3.5" />
        Impresoras
      </button>

      <button
        onClick={() => setActiveTab("tickets")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
          activeTab === "tickets"
            ? "bg-slate-700 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <Receipt className="w-3.5 h-3.5" />
        Tickets
      </button>

      <button
        onClick={() => setActiveTab("sistema")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
          activeTab === "sistema"
            ? "bg-slate-700 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <Monitor className="w-3.5 h-3.5" />
        Sistema
      </button>

      <button
        onClick={() => setActiveTab("usuarios")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
          activeTab === "usuarios"
            ? "bg-slate-700 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        Usuarios
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full min-h-0">
      {portalTarget && createPortal(tabsContent, portalTarget)}

      <div className="flex-1 overflow-hidden">
        <div className="w-full h-full pb-6">
          {activeTab === "impresoras" && <ImpresorasConfig />}
          {activeTab === "tickets" && <TicketsConfig />}
          {activeTab === "sistema" && <SistemaConfig />}
          {activeTab === "usuarios" && <UsuariosConfig />}
        </div>
      </div>
    </div>
  );
}
