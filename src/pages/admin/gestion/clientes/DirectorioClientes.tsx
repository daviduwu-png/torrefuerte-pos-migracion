import { useState } from "react";
import { Search, Edit, Trash2, UserPlus, Loader2, Users, FileText } from "lucide-react";
import { ClienteModal } from "./components/ClienteModal";
import { CotizacionesClienteModal } from "./components/CotizacionesClienteModal";
import { useClientes } from "./hooks/useClientes";
import { Cliente } from "../../../../api/tauri";
import { api } from "../../../../api/tauri";
import { notify } from "../../../../utils/sileo";

export default function DirectorioClientes() {
  const { clientes, loading, busqueda, setBusqueda, recargar } = useClientes();
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [modalCotizacionesOpen, setModalCotizacionesOpen] = useState(false);
  const [clienteCotizaciones, setClienteCotizaciones] = useState<Cliente | null>(null);

  const handleOpenNuevo = () => {
    setClienteEditando(null);
    setModalOpen(true);
  };

  const handleOpenEditar = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setModalOpen(true);
  };

  const handleOpenCotizaciones = (cliente: Cliente) => {
    setClienteCotizaciones(cliente);
    setModalCotizacionesOpen(true);
  };

  const handleEliminar = async (cliente: Cliente) => {
    if (!confirm(`¿Eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await api.eliminarCliente(cliente.id);
      if (res.success) {
        notify.success({ title: "Cliente eliminado", description: `"${cliente.nombre}" fue removido del directorio.`, duration: 4000 });
        recargar();
      } else {
        notify.error({ title: "Error", description: res.message, duration: 5000 });
      }
    } catch {
      notify.error({ title: "Error", description: "No se pudo eliminar el cliente.", duration: 5000 });
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">
          Listado de Clientes
          <span className="ml-2 text-sm font-normal text-slate-400">({clientes.length})</span>
        </h3>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
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
        {loading ? (
          <div className="h-full flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">
              {busqueda ? `Sin resultados para "${busqueda}"` : "No hay clientes registrados aún."}
            </p>
          </div>
        ) : (
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
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-white/5 hover:bg-slate-800/40 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200">{cliente.nombre}</span>
                      <span className="text-xs text-slate-400 font-mono mt-0.5">#CL-{String(cliente.id).padStart(3, "0")}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{cliente.telefono || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{cliente.email || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenCotizaciones(cliente)}
                        className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        title="Ver Cotizaciones"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditar(cliente)}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEliminar(cliente)}
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
        )}
      </div>

      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clienteEditando={clienteEditando}
        onSuccess={() => { setModalOpen(false); recargar(); }}
      />
      
      <CotizacionesClienteModal
        open={modalCotizacionesOpen}
        onClose={() => setModalCotizacionesOpen(false)}
        cliente={clienteCotizaciones}
      />
    </div>
  );
}
