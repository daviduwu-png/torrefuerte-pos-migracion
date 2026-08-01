import { useState } from "react";
import { X, Check, FilePlus } from "lucide-react";
import { createPortal } from "react-dom";
import DatePicker from "../../../../../components/ui/DatePicker";
import { notify } from "../../../../../utils/sileo";

interface AsignarDeudaModalProps {
  open: boolean;
  onClose: () => void;
}

export function AsignarDeudaModal({ open, onClose }: AsignarDeudaModalProps) {
  const [clienteId, setClienteId] = useState("");
  const [ticket, setTicket] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");

  const handleClose = () => {
    setClienteId("");
    setTicket("");
    setMonto("");
    setFecha("");
    setNotas("");
    onClose();
  };

  const handleGuardar = () => {
    if (!clienteId.trim()) {
      notify.warning({
        title: "ID de cliente requerido",
        description: "Debes ingresar el ID del cliente al que se le asignará la deuda.",
        duration: 4000,
      });
      return;
    }

    if (!ticket.trim()) {
      notify.warning({
        title: "Ticket requerido",
        description: "Ingresa el número de ticket o referencia asociado al adeudo.",
        duration: 4000,
      });
      return;
    }

    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      notify.warning({
        title: "Monto inválido",
        description: "El monto de la deuda debe ser mayor a $0.00.",
        duration: 4000,
      });
      return;
    }

    if (!fecha) {
      notify.warning({
        title: "Fecha requerida",
        description: "Selecciona una fecha para registrar el adeudo.",
        duration: 4000,
      });
      return;
    }

    try {
      // TODO: llamada real al backend
      notify.success({
        title: "Deuda asignada",
        description: `Se registró un adeudo de $${montoNum.toFixed(2)} al cliente #${clienteId} (${ticket}).`,
        duration: 6000,
      });
      handleClose();
    } catch {
      notify.error({
        title: "Error al asignar deuda",
        description: "No se pudo registrar el adeudo. Intenta de nuevo.",
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
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <FilePlus className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Asignar Deuda</h2>
              <p className="text-sm text-slate-400 mt-0.5">Vincular un adeudo manual a un cliente</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[65vh] custom-scrollbar">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleGuardar(); }}>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                ID de Cliente <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:border-orange-500 outline-none"
                placeholder="Ej. CL-101"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Ticket/Referencia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                  placeholder="#TK-000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Monto de la Deuda <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-orange-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Fecha <span className="text-rose-500">*</span>
              </label>
              <DatePicker
                value={fecha}
                onChange={setFecha}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Concepto o Notas (Opcional)</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none resize-none h-20"
                placeholder="Añade detalles sobre el adeudo..."
              />
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">Cancelar</button>
          <button type="button" onClick={handleGuardar} className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2">
            <Check className="w-4 h-4" /> Guardar Deuda
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
