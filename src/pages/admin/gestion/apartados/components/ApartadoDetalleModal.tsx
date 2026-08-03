import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save, DollarSign, CheckCircle, Package } from "lucide-react";
import {
  api,
  ApartadoConProductos,
  ApartadoProducto,
} from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";
import { StyledSwal } from "../../../../../utils/swal";

interface ApartadoDetalleModalProps {
  apartadoId: number;
  onClose: () => void;
  onApartadoActualizado: () => void;
}

export function ApartadoDetalleModal({
  apartadoId,
  onClose,
  onApartadoActualizado,
}: ApartadoDetalleModalProps) {
  const [data, setData] = useState<ApartadoConProductos | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modoAbono, setModoAbono] = useState(false);
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  // Load details
  useEffect(() => {
    let mounted = true;
    api.obtenerApartado(apartadoId).then((res) => {
      if (mounted) {
        if (res.success && res.data) setData(res.data);
        else {
          notify.error({
            title: "Error",
            description: "No se pudo cargar el apartado.",
          });
          onClose();
        }
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [apartadoId, onClose]);

  const handleAbonar = async () => {
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) {
      return notify.warning({
        title: "Inválido",
        description: "Ingresa un monto válido.",
      });
    }
    if (!data) return;
    if (monto > data.apartado.monto_pendiente) {
      return notify.warning({
        title: "Monto excedido",
        description: "El abono supera el monto pendiente.",
      });
    }

    setProcesando(true);
    try {
      const res = await api.abonarApartado({
        apartado_id: apartadoId,
        monto,
        metodo_pago: metodoPago,
      });

      if (res.success) {
        notify.success({ title: "Abono exitoso", description: res.message });
        onApartadoActualizado();
        onClose();
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (e) {
      notify.error({ title: "Error", description: "Fallo de conexión." });
    } finally {
      setProcesando(false);
    }
  };

  const handleLiquidar = async () => {
    const result = await StyledSwal.fire({
      title: "¿Liquidar apartado?",
      text: "Se generará un ticket de venta y se descontará el stock real. ¿Método de pago final?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Efectivo",
      cancelButtonText: "Tarjeta",
      showDenyButton: true,
      denyButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#3b82f6",
    });

    if (result.isDenied || result.isDismissed) return;
    const metodo = result.isConfirmed ? "Efectivo" : "Tarjeta";

    setProcesando(true);
    try {
      const res = await api.liquidarApartado(apartadoId, metodo);
      if (res.success) {
        notify.success({
          title: "Liquidado",
          description: "Ticket generado correctamente.",
        });
        onApartadoActualizado();
        onClose();
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch {
      notify.error({ title: "Error", description: "Error de conexión" });
    } finally {
      setProcesando(false);
    }
  };

  if (loading || !data)
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const { apartado, productos, abonos } = data;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Apartado #{apartado.id}
              </h2>
              <p className="text-xs text-slate-400">
                Cliente: {apartado.cliente_nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Status & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <p className="text-xs text-slate-400 font-medium">Estado</p>
              <div className="mt-1">
                {apartado.estado === "activo" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">
                    ACTIVO
                  </span>
                )}
                {apartado.estado === "cancelado" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20">
                    CANCELADO
                  </span>
                )}
                {apartado.estado === "liquidado" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                    LIQUIDADO
                  </span>
                )}
              </div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <p className="text-xs text-slate-400 font-medium">Total</p>
              <p className="text-xl font-bold text-white mt-1">
                ${apartado.total.toFixed(2)}
              </p>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 relative overflow-hidden">
              <p className="text-xs text-slate-400 font-medium">
                Monto Pendiente
              </p>
              <p className="text-xl font-black text-rose-400 mt-1">
                ${apartado.monto_pendiente.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Productos Apartados
            </h3>
            <div className="bg-slate-950/50 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 bg-white/[0.02] border-b border-white/5 uppercase">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-right">Cant.</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productos.map((prod: ApartadoProducto) => (
                    <tr
                      key={prod.producto_id}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {prod.codigo_interno || "-"}
                      </td>
                      <td className="px-4 py-3 text-white">{prod.nombre}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {prod.cantidad}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        ${prod.precio_unitario.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                        ${prod.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historial de Abonos Table */}
          {abonos && abonos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Historial de Pagos</h3>
              <div className="bg-slate-950/50 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 bg-white/[0.02] border-b border-white/5 uppercase">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Método</th>
                      <th className="px-4 py-3">Notas</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {abonos.map((abono) => (
                      <tr key={abono.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-slate-300">
                          {new Date(abono.fecha.replace(" ", "T")).toLocaleDateString("es-MX", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-white">
                          <span className="px-2 py-1 bg-slate-800 rounded-md text-xs border border-white/10 uppercase">
                            {abono.metodo_pago}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {abono.notas || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                          ${abono.monto.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Abonar Section */}
          {apartado.estado === "activo" &&
            apartado.monto_pendiente > 0 &&
            !modoAbono && (
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => setModoAbono(true)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Registrar Abono
                </button>
              </div>
            )}

          {modoAbono && (
            <div className="bg-blue-950/30 p-5 rounded-xl border border-blue-500/20 animate-in fade-in slide-in-from-bottom-2 mt-4">
              <h3 className="text-sm font-bold text-white mb-4">
                Registrar Nuevo Abono
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                    Monto a abonar
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      value={montoAbono}
                      onChange={(e) => setMontoAbono(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Efectivo", "Tarjeta", "Transferencia"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMetodoPago(m)}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                          metodoPago === m
                            ? "bg-blue-600/20 border-blue-500 text-blue-400"
                            : "bg-slate-900 border-white/5 text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setModoAbono(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAbonar}
                  disabled={procesando || !montoAbono}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar Abono
                </button>
              </div>
            </div>
          )}

          {/* Liquidar Section */}
          {apartado.estado === "activo" && apartado.monto_pendiente <= 0.01 && (
            <div className="bg-emerald-950/30 p-5 rounded-xl border border-emerald-500/20 text-center animate-in fade-in">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">
                Apartado Pagado
              </h3>
              <p className="text-slate-400 text-sm mb-5">
                El apartado ha sido pagado en su totalidad. Liquídalo para
                generar el ticket y descontar el stock.
              </p>
              <button
                onClick={handleLiquidar}
                disabled={procesando}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20"
              >
                LIQUIDAR APARTADO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
