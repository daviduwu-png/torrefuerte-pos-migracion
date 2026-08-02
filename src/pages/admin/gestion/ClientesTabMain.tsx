import { Users } from "lucide-react";
import DirectorioClientes from "./clientes/DirectorioClientes";

export default function ClientesTab() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full min-h-0">
      <div className="shrink-0 pb-3 border-b border-white/10 mb-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                Gestión de Clientes
              </h2>
              <p className="text-xs text-slate-400">
                Administra el directorio de clientes y sus cotizaciones.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 sm:p-6 flex-1 min-h-0">
        <DirectorioClientes />
      </div>
    </div>
  );
}
