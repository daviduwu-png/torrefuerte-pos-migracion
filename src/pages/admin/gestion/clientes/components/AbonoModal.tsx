import { useState } from "react";
import { X, Check, DollarSign } from "lucide-react";
import { createPortal } from "react-dom";
import { notify } from "../../../../../utils/sileo";

interface AbonoModalProps {
  open: boolean;
  onClose: () => void;
  ticketInfo: any | null;
}

export function AbonoModal({ open, onClose, ticketInfo }: AbonoModalProps) {
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  const handleClose = () => {
    setMonto("");
    setMetodoPago("Efectivo");
    onClose();
  };

  const handleConfirmar = () => {
    const montoNum = parseFloat(monto);

    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      notify.warning({
        title: "Monto inválido",
        description: "Por favor ingresa un monto mayor a $0.00 para el abono.",
        duration: 4000,
      });
      return;
    }

    try {
      // TODO: llamada real al backend
      notify.success({
        title: "Abono registrado",
        description: `Abono de $${montoNum.toFixed(2)} registrado en ${metodoPago} para Ticket #TK-00${ticketInfo}.`,
        duration: 6000,
      });
      handleClose();
    } catch {
      notify.error({
        title: "Error al registrar abono",
        description: "No se pudo procesar el abono. Intenta de nuevo.",
        duration: 6000,
      });
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Registrar Abono</h2>
              {ticketInfo && (
                <p className="text-sm text-slate-400 mt-0.5">
                  Ticket #TK-00{ticketInfo}
                </p>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleConfirmar(); }}>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Monto a abonar <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-rose-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Método de Pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 outline-none"
              >
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Transferencia</option>
              </select>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">Cancelar</button>
          <button type="button" onClick={handleConfirmar} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2">
            <Check className="w-4 h-4" /> Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
