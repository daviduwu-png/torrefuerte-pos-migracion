import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Clock, X, PlusSquare, Send, Minus, Plus } from "lucide-react";
import { api, PedidoConProductos } from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";

interface DetallePedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: number | null;
  onUpdate: () => void;
}

export default function DetallePedidoModal({
  isOpen,
  onClose,
  pedidoId,
  onUpdate,
}: DetallePedidoModalProps) {
  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoConProductos | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [modoRecepcion, setModoRecepcion] = useState(false);
  const [cantidadesRecepcion, setCantidadesRecepcion] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    if (isOpen && pedidoId) {
      cargarDetalles();
    }
  }, [isOpen, pedidoId]);

  const cargarDetalles = async () => {
    setLoading(true);
    setModoRecepcion(false);
    setCantidadesRecepcion({});
    try {
      const res = await api.obtenerPedido(pedidoId!);
      if (res.success && res.data) {
        setPedidoDetalle(res.data);
      } else {
        notify.error({
          title: "Error",
          description: "No se pudieron cargar los detalles del pedido.",
        });
      }
    } catch (error) {
      console.error(error);
      notify.error({
        title: "Error",
        description: "No se pudieron cargar los detalles del pedido.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarRecepcion = () => {
    if (!pedidoDetalle) return;
    const initialCantidades: Record<number, number> = {};
    pedidoDetalle.productos.forEach((p) => {
      initialCantidades[p.producto_id] = p.cantidad_pedida;
    });
    setCantidadesRecepcion(initialCantidades);
    setModoRecepcion(true);
  };

  const handleConfirmarRecepcion = async () => {
    if (!pedidoDetalle) return;
    try {
      const items = pedidoDetalle.productos.map((p) => ({
        producto_id: p.producto_id,
        cantidad_recibida:
          cantidadesRecepcion[p.producto_id] ?? p.cantidad_pedida,
      }));

      const res = await api.recibirPedido(pedidoDetalle.pedido.id, items);
      if (res.success) {
        notify.success({
          title: "Recepción confirmada",
          description:
            "Se ha actualizado el stock correctamente con las cantidades indicadas.",
        });
        onUpdate();
        onClose();
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (error) {
      console.error(error);
      notify.error({
        title: "Error",
        description: "Ocurrió un error al recibir el pedido.",
      });
    }
  };

  const handleCancelarPedido = () => {
    if (!pedidoDetalle) return;
    notify.warning({
      title: "¿Cancelar Pedido?",
      description: `Esta acción no se puede deshacer.`,
      position: "top-center",
      button: {
        title: "Sí, Cancelar",
        onClick: async () => {
          try {
            const res = await api.cambiarEstadoPedido(
              pedidoDetalle.pedido.id,
              "cancelado",
            );
            if (res.success) {
              notify.success({
                title: "Pedido cancelado",
                description: "El pedido se ha cancelado correctamente.",
              });
              onUpdate();
              onClose();
            } else {
              notify.error({ title: "Error", description: res.message });
            }
          } catch (error) {
            console.error(error);
            notify.error({
              title: "Error",
              description: "Ocurrió un error al cancelar el pedido.",
            });
          }
        },
      },
    });
  };

  const handleMarcarEnviado = async () => {
    if (!pedidoDetalle) return;
    try {
      const res = await api.cambiarEstadoPedido(
        pedidoDetalle.pedido.id,
        "enviado",
      );
      if (res.success) {
        notify.success({
          title: "Estado actualizado",
          description: "El pedido se marcó como Enviado.",
        });
        onUpdate();
        onClose();
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (error) {
      console.error(error);
      notify.error({
        title: "Error",
        description: "Ocurrió un error al actualizar el estado.",
      });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white">
            {pedidoDetalle
              ? `Pedido #${pedidoDetalle.pedido.id} - ${pedidoDetalle.pedido.proveedor}`
              : "Cargando..."}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full" />
            </div>
          ) : pedidoDetalle ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-800/50 p-4 rounded-xl">
                <div>
                  <span className="block text-slate-500 mb-1">Fecha</span>
                  <span className="text-white">
                    {new Date(pedidoDetalle.pedido.fecha).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 mb-1">Estado</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      pedidoDetalle.pedido.estado === "recibido"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : pedidoDetalle.pedido.estado === "pendiente"
                          ? "bg-amber-500/20 text-amber-400"
                          : pedidoDetalle.pedido.estado === "cancelado"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {pedidoDetalle.pedido.estado === "recibido" && (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    {pedidoDetalle.pedido.estado === "pendiente" && (
                      <Clock className="w-3 h-3" />
                    )}
                    {pedidoDetalle.pedido.estado.charAt(0).toUpperCase() +
                      pedidoDetalle.pedido.estado.slice(1)}
                  </span>
                </div>
                {pedidoDetalle.pedido.notas && (
                  <div className="col-span-2">
                    <span className="block text-slate-500 mb-1">Notas</span>
                    <span className="text-white">
                      {pedidoDetalle.pedido.notas}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">
                  Productos ({pedidoDetalle.productos.length})
                </h3>
                <div className="border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 bg-slate-800 border-b border-white/5">
                      <tr>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2 text-center">Cant. Pedida</th>
                        <th className="px-3 py-2 text-center">
                          Cant. Recibida
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidoDetalle.productos.map((prod) => (
                        <tr
                          key={prod.producto_id}
                          className="border-b border-white/5 bg-slate-900/30"
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-white">
                              {prod.nombre}
                            </div>
                            <div className="text-xs text-slate-500">
                              {prod.codigo_interno}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-amber-400">
                            {prod.cantidad_pedida}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-400">
                            {modoRecepcion ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    const actual =
                                      cantidadesRecepcion[prod.producto_id] !== undefined
                                        ? cantidadesRecepcion[prod.producto_id]
                                        : prod.cantidad_pedida;
                                    if (actual > 0) {
                                      setCantidadesRecepcion((prev) => ({ ...prev, [prod.producto_id]: actual - 1 }));
                                    }
                                  }}
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={
                                    cantidadesRecepcion[prod.producto_id] !==
                                    undefined
                                      ? cantidadesRecepcion[prod.producto_id]
                                      : prod.cantidad_pedida
                                  }
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0) {
                                      setCantidadesRecepcion((prev) => ({
                                        ...prev,
                                        [prod.producto_id]: val,
                                      }));
                                    } else if (e.target.value === "") {
                                      // Allow empty state briefly while typing
                                      setCantidadesRecepcion((prev) => ({
                                        ...prev,
                                        [prod.producto_id]: 0,
                                      }));
                                    }
                                  }}
                                  className="w-12 px-1 py-1 bg-slate-900 border border-emerald-500/30 rounded text-center outline-none focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  onClick={() => {
                                    const actual =
                                      cantidadesRecepcion[prod.producto_id] !== undefined
                                        ? cantidadesRecepcion[prod.producto_id]
                                        : prod.cantidad_pedida;
                                    setCantidadesRecepcion((prev) => ({ ...prev, [prod.producto_id]: actual + 1 }));
                                  }}
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              prod.cantidad_recibida
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-rose-400">
              Error al cargar pedido.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-2 shrink-0 overflow-x-auto custom-scrollbar">
          {modoRecepcion ? (
            <>
              <button
                onClick={() => setModoRecepcion(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRecepcion}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors text-sm font-bold whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                Confirmar Ingreso
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm whitespace-nowrap"
              >
                Cerrar
              </button>
              {pedidoDetalle &&
                pedidoDetalle.pedido.estado !== "recibido" &&
                pedidoDetalle.pedido.estado !== "cancelado" && (
                  <button
                    onClick={handleCancelarPedido}
                    className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20 flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
                  >
                    <X className="w-4 h-4 shrink-0" />
                    Cancelar Pedido
                  </button>
                )}
              {pedidoDetalle && pedidoDetalle.pedido.estado === "pendiente" && (
                <button
                  onClick={handleMarcarEnviado}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  Marcar como Enviado
                </button>
              )}
              {pedidoDetalle &&
                pedidoDetalle.pedido.estado !== "recibido" &&
                pedidoDetalle.pedido.estado !== "cancelado" && (
                  <button
                    onClick={handleIniciarRecepcion}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
                  >
                    <PlusSquare className="w-4 h-4 shrink-0" />
                    Marcar como Recibido
                  </button>
                )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
