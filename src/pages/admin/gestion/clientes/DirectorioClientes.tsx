import { useState } from "react";
import { Search, Edit, Trash2, UserPlus } from "lucide-react";
import { ClienteModal } from "./components/ClienteModal";

export default function DirectorioClientes() {
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any | null>(null);

  const handleOpenNuevo = () => {
    setClienteEditando(null);
    setModalOpen(true);
  };

  const handleOpenEditar = (cliente: any) => {
    setClienteEditando(cliente);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">Listado de Clientes</h3>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={handleOpenNuevo}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-blue-900/20"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-slate-900/30 custom-scrollbar relative">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 border-b border-white/5 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <tr key={item} className="border-b border-white/5 hover:bg-slate-800/40 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">Cliente de Ejemplo {item}</span>
                    <span className="text-xs text-slate-400 font-mono mt-0.5">#CL-{String(item).padStart(3, '0')}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">555-010{item}</td>
                <td className="px-4 py-3 text-slate-400">cliente{item}@ejemplo.com</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpenEditar(item)}
                      className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ClienteModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        clienteEditando={clienteEditando} 
      />
    </div>
  );
}
