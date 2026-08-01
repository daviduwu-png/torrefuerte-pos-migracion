import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, Truck, FileText } from "lucide-react";
import { ClientesTab, PedidosTab, CotizacionesTab } from "./gestion";

type TabMode = "clientes" | "pedidos" | "cotizaciones";

export default function Gestion() {
  const [activeTab, setActiveTab] = useState<TabMode>("clientes");

  const handleTabChange = (tab: TabMode) => {
    setActiveTab(tab);
  };

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("header-actions-portal"));
  }, []);

  const tabsContent = (
    <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-white/5 rounded-xl shadow-lg ml-2">
      <button
        onClick={() => handleTabChange("clientes")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
          activeTab === "clientes"
            ? "bg-blue-600 text-white shadow-sm shadow-blue-900/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        Clientes
      </button>
      <button
        onClick={() => handleTabChange("cotizaciones")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
          activeTab === "cotizaciones"
            ? "bg-blue-600 text-white shadow-sm shadow-blue-900/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <FileText className="w-3.5 h-3.5" />
        Cotizaciones
      </button>
      <button
        onClick={() => handleTabChange("pedidos")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
          activeTab === "pedidos"
            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <Truck className="w-3.5 h-3.5" />
        Pedidos a Proveedores
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full min-h-0">
      {portalTarget && createPortal(tabsContent, portalTarget)}

      {/* Main Content */}
      <div className="flex-1 bg-slate-900/40 border border-white/5 rounded-2xl p-2 sm:p-6 relative overflow-hidden flex flex-col min-h-0 backdrop-blur-sm">
        {/* Decorative elements inside the tab container */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />

        {activeTab === "clientes" && <ClientesTab />}
        {activeTab === "pedidos" && <PedidosTab />}
        {activeTab === "cotizaciones" && <CotizacionesTab />}
      </div>
    </div>
  );
}
