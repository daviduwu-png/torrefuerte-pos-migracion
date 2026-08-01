import { useState } from "react";
import { X, Check, UserPlus } from "lucide-react";
import { createPortal } from "react-dom";
import { notify } from "../../../../../utils/sileo";

interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  clienteEditando: any | null;
}

export function ClienteModal({ open, onClose, clienteEditando }: ClienteModalProps) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  const handleClose = () => {
    setNombre("");
    setTelefono("");
    setCorreo("");
    onClose();
  };

  const handleGuardar = () => {
    if (!nombre.trim()) {
      notify.warning({
        title: "Campo requerido",
        description: "El nombre del cliente no puede estar vacío.",
        duration: 4000,
      });
      return;
    }

    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      notify.warning({
        title: "Correo inválido",
        description: "Por favor ingresa un correo electrónico válido.",
        duration: 4000,
      });
      return;
    }

    try {
      // TODO: llamada real al backend
      notify.success({
        title: clienteEditando ? "Cliente actualizado" : "Cliente registrado",
        description: clienteEditando
          ? `Los datos de "${nombre}" han sido actualizados correctamente.`
          : `"${nombre}" ha sido agregado al directorio de clientes.`,
        duration: 5000,
      });
      handleClose();
    } catch {
      notify.error({
        title: "Error al guardar",
        description: "No se pudo guardar el cliente. Intenta de nuevo.",
        duration: 6000,
      });
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {clienteEditando ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleGuardar(); }}>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Nombre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Teléfono</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                placeholder="Ej. 555-1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                placeholder="ejemplo@correo.com"
              />
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">Cancelar</button>
          <button type="button" onClick={handleGuardar} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Check className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
