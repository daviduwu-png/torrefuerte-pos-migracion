import { useState } from "react";
import { DollarSign, Search, FilePlus } from "lucide-react";
import { AbonoModal } from "./components/AbonoModal";
import { AsignarDeudaModal } from "./components/AsignarDeudaModal";

export default function CuentasPorCobrar() {
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [modalDeudaOpen, setModalDeudaOpen] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<any | null>(null);

  const handleOpenAbono = (ticket: any) => {
    setTicketSeleccionado(ticket);
    setModalAbonoOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 h-full min-h-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 xl:gap-6">
          <h3 className="text-lg font-semibold text-white truncate">Estado de Pagos</h3>
          <div className="px-3 py-1.5 xl:px-5 xl:py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 flex items-center gap-3 w-fit shrink-0">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] xl:text-[11px] font-medium text-rose-500 uppercase tracking-wider mb-0.5">Total Adeudos</p>
              <p className="text-lg xl:text-xl font-bold text-rose-500 leading-none">$1,250.00</p>
            </div>
            <div className="p-1.5 xl:p-2 bg-rose-500/20 rounded-full">
              <DollarSign className="w-4 h-4 xl:w-5 xl:h-5 text-rose-500" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 xl:gap-3 shrink-0">
          <div className="relative w-48 xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ticket..."
              className="w-full pl-9 pr-3 py-1.5 xl:py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
          <button 
            onClick={() => setModalDeudaOpen(true)}
            className="px-3 py-1.5 xl:px-4 xl:py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-orange-900/20"
          >
            <FilePlus className="w-4 h-4" />
            <span className="hidden sm:inline">Asignar Deuda</span>
            <span className="sm:hidden">Asignar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-slate-900/30 custom-scrollbar relative">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 border-b border-white/5 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Deuda</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <tr key={item} className="border-b border-white/5 hover:bg-slate-800/40 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">Cliente Deudor {item}</span>
                    <span className="text-xs text-slate-400 font-mono mt-0.5">#CL-{String(item).padStart(3, '0')}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">#TK-00{item}</td>
                <td className="px-4 py-3 text-slate-400">01/08/2026</td>
                <td className="px-4 py-3 font-semibold text-rose-400">${item * 150}.00</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-end">
                    <button 
                      onClick={() => handleOpenAbono(item)}
                      className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-colors text-xs font-semibold"
                    >
                      Abonar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AbonoModal 
        open={modalAbonoOpen} 
        onClose={() => setModalAbonoOpen(false)} 
        ticketInfo={ticketSeleccionado} 
      />
      
      <AsignarDeudaModal 
        open={modalDeudaOpen}
        onClose={() => setModalDeudaOpen(false)}
      />
    </div>
  );
}
