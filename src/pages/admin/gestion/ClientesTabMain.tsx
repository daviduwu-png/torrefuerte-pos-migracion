import { Users, Receipt, UserSquare2 } from "lucide-react";
import { useState } from "react";
import DirectorioClientes from "./clientes/DirectorioClientes";
import CuentasPorCobrar from "./clientes/CuentasPorCobrar";

export default function ClientesTab() {
  const [activeSubTab, setActiveSubTab] = useState<"directorio" | "adeudos">(
    "directorio",
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Gestión de Clientes
            </h2>
            <p className="text-sm text-slate-400">
              Administra cuentas por cobrar y pedidos pendientes de los
              clientes.
            </p>
          </div>
        </div>

        {/* Internal Tabs for Clientes */}
        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5 w-max">
          <button
            onClick={() => setActiveSubTab("directorio")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSubTab === "directorio"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <UserSquare2 className="w-4 h-4" />
            Directorio
          </button>
          <button
            onClick={() => setActiveSubTab("adeudos")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSubTab === "adeudos"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Adeudos
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 sm:p-6 flex-1 min-h-0">
        {activeSubTab === "directorio" && <DirectorioClientes />}
        {activeSubTab === "adeudos" && <CuentasPorCobrar />}
      </div>
    </div>
  );
}
