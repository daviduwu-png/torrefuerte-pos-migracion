import { useState, useEffect } from "react";
import { X, Check, UserPlus, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { notify } from "../../../../../utils/sileo";
import { api, Cliente, ClienteInput } from "../../../../../api/tauri";

interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  clienteEditando: Cliente | null;
  onSuccess: () => void;
}

export function ClienteModal({ open, onClose, clienteEditando, onSuccess }: ClienteModalProps) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [rfc, setRfc] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Rellenar campos cuando se edita
  useEffect(() => {
    if (clienteEditando) {
      setNombre(clienteEditando.nombre);
      setTelefono(clienteEditando.telefono ?? "");
      setCorreo(clienteEditando.email ?? "");
      setDireccion(clienteEditando.direccion ?? "");
      setRfc(clienteEditando.rfc ?? "");
      setNotas(clienteEditando.notas ?? "");
    } else {
      setNombre(""); setTelefono(""); setCorreo("");
      setDireccion(""); setRfc(""); setNotas("");
    }
  }, [clienteEditando, open]);

  const handleClose = () => {
    setNombre(""); setTelefono(""); setCorreo("");
    setDireccion(""); setRfc(""); setNotas("");
    onClose();
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      notify.warning({ title: "Campo requerido", description: "El nombre del cliente no puede estar vacío.", duration: 4000 });
      return;
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      notify.warning({ title: "Correo inválido", description: "Por favor ingresa un correo electrónico válido.", duration: 4000 });
      return;
    }

    setGuardando(true);
    try {
      const input: ClienteInput = {
        id: clienteEditando?.id,
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
        email: correo.trim() || undefined,
        direccion: direccion.trim() || undefined,
        rfc: rfc.trim() || undefined,
        notas: notas.trim() || undefined,
      };

      const res = await api.guardarCliente(input);
      if (res.success) {
        notify.success({
          title: clienteEditando ? "Cliente actualizado" : "Cliente registrado",
          description: clienteEditando
            ? `Los datos de "${nombre}" han sido actualizados.`
            : `"${nombre}" fue agregado al directorio.`,
          duration: 5000,
        });
        onSuccess();
      } else {
        notify.error({ title: "Error al guardar", description: res.message, duration: 6000 });
      }
    } catch {
      notify.error({ title: "Error al guardar", description: "No se pudo guardar el cliente. Intenta de nuevo.", duration: 6000 });
    } finally {
      setGuardando(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {clienteEditando ? "Editar Cliente" : "Nuevo Cliente"}
            </h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[65vh] custom-scrollbar">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleGuardar(); }}>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Nombre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Teléfono</label>
                <input
                  type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                  placeholder="Ej. 555-1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">RFC</label>
                <input
                  type="text" value={rfc} onChange={(e) => setRfc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Correo Electrónico</label>
              <input
                type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                placeholder="ejemplo@correo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Dirección</label>
              <input
                type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Notas</label>
              <textarea
                value={notas} onChange={(e) => setNotas(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none resize-none h-20"
                placeholder="Información adicional del cliente..."
              />
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
            Cancelar
          </button>
          <button
            type="button" onClick={handleGuardar} disabled={guardando}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
