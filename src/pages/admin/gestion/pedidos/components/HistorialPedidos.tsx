import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Clock, Package, Eye, X, PlusSquare, Filter, ChevronDown, FileDown, Send } from "lucide-react";
import { api, PedidoProveedor, PedidoConProductos } from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoTorre from "../../../../../assets/torre.png";

export default function HistorialPedidos() {
  const [pedidos, setPedidos] = useState<PedidoProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoConProductos | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modoRecepcion, setModoRecepcion] = useState(false);
  const [cantidadesRecepcion, setCantidadesRecepcion] = useState<Record<number, number>>({});

  const opcionesFiltro = [
    { value: "", label: "Todos los estados" },
    { value: "pendiente", label: "Pendientes" },
    { value: "enviado", label: "Enviados" },
    { value: "recibido", label: "Recibidos" },
    { value: "cancelado", label: "Cancelados" },
  ];

  const cargarPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listarPedidos(undefined, filtroEstado || undefined);
      if (res.success && res.data) {
        setPedidos(res.data);
      }
    } catch (error) {
      console.error(error);
      notify.error({ title: "Error", description: "No se pudieron cargar los pedidos." });
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  const verDetalles = async (id: number) => {
    setLoadingDetalle(true);
    setModalOpen(true);
    setModoRecepcion(false);
    setCantidadesRecepcion({});
    try {
      const res = await api.obtenerPedido(id);
      if (res.success && res.data) {
        setPedidoDetalle(res.data);
      }
    } catch (error) {
      console.error(error);
      notify.error({ title: "Error", description: "No se pudieron cargar los detalles del pedido." });
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleIniciarRecepcion = () => {
    if (!pedidoDetalle) return;
    const initialCantidades: Record<number, number> = {};
    pedidoDetalle.productos.forEach(p => {
      initialCantidades[p.producto_id] = p.cantidad_pedida;
    });
    setCantidadesRecepcion(initialCantidades);
    setModoRecepcion(true);
  };

  const handleConfirmarRecepcion = async () => {
    if (!pedidoDetalle) return;
    try {
      const items = pedidoDetalle.productos.map(p => ({
        producto_id: p.producto_id,
        cantidad_recibida: cantidadesRecepcion[p.producto_id] ?? p.cantidad_pedida
      }));
      
      const res = await api.recibirPedido(pedidoDetalle.pedido.id, items);
      if (res.success) {
        notify.success({ title: "Recepción confirmada", description: "Se ha actualizado el stock correctamente con las cantidades indicadas." });
        setModalOpen(false);
        setPedidoDetalle(null);
        setModoRecepcion(false);
        cargarPedidos();
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (error) {
      console.error(error);
      notify.error({ title: "Error", description: "Ocurrió un error al recibir el pedido." });
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
            const res = await api.cambiarEstadoPedido(pedidoDetalle.pedido.id, "cancelado");
            if (res.success) {
              notify.success({ title: "Pedido cancelado", description: "El pedido se ha cancelado correctamente." });
              setModalOpen(false);
              setPedidoDetalle(null);
              cargarPedidos();
            } else {
              notify.error({ title: "Error", description: res.message });
            }
          } catch (error) {
            console.error(error);
            notify.error({ title: "Error", description: "Ocurrió un error al cancelar el pedido." });
          }
        }
      }
    });
  };

  const handleMarcarEnviado = async () => {
    if (!pedidoDetalle) return;
    try {
      const res = await api.cambiarEstadoPedido(pedidoDetalle.pedido.id, "enviado");
      if (res.success) {
        notify.success({ title: "Estado actualizado", description: "El pedido se marcó como Enviado." });
        setModalOpen(false);
        setPedidoDetalle(null);
        cargarPedidos();
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (error) {
      console.error(error);
      notify.error({ title: "Error", description: "Ocurrió un error al actualizar el estado." });
    }
  };

  const handleReimprimirPDF = async (p: PedidoProveedor) => {
    try {
      const res = await api.obtenerPedido(p.id);
      if (res.success && res.data) {
        const pedidoData = res.data;
        const fechaPedido = new Date(p.fecha);
        const timeStr = fechaPedido.toLocaleTimeString("es-MX", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }).replace(/:/g, "");
        const dateStr = fechaPedido.toLocaleDateString("es-MX").replace(/\//g, "-");
        
        const doc = new jsPDF();
      
        try {
          const response = await fetch(logoTorre);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          doc.addImage(base64, "PNG", 14, 10, 40, 40);
        } catch (e) {
          console.warn("No se pudo cargar el logo:", e);
        }

        doc.setFontSize(22);
        doc.setTextColor(192, 57, 43);
        doc.text("Ferretería Torre Fuerte", 60, 24);

        doc.setFontSize(14);
        doc.setTextColor(80, 80, 80);
        doc.text(`Orden de Pedido #${p.id}`, 60, 32);

        doc.setFontSize(11);
        const fechaFormat = new Date(p.fecha).toLocaleString("es-MX", { hour12: false });
        doc.text(`Fecha: ${fechaFormat}`, 196, 24, { align: "right" });
        doc.text(`Proveedor: ${p.proveedor}`, 60, 40);
        doc.text(`Marca: ${p.marca || "N/A"}`, 60, 46);

        const tableData = pedidoData.productos.map((item, index) => [
          index + 1,
          item.nombre,
          item.codigo_interno ?? item.producto_id,
          item.cantidad_pedida,
        ]);

        autoTable(doc, {
          startY: 55,
          head: [["#", "Producto", "Código", "Cantidad Pedida"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [192, 57, 43] },
          styles: { fontSize: 10 },
          columnStyles: {
            0: { cellWidth: 10 },
            3: { halign: "center", fontStyle: "bold" },
          },
        });

        if (p.notas) {
          const finalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          doc.text("Notas:", 14, finalY);
          doc.setFontSize(9);
          const splitNotas = doc.splitTextToSize(p.notas, 180);
          doc.text(splitNotas, 14, finalY + 5);
        }

        doc.save(`Pedido_${p.id}_${p.proveedor.replace(/\s+/g, "_")}_${dateStr}_${timeStr}.pdf`);
        
        notify.success({ title: "Éxito", description: "El PDF se generó correctamente." });
      }
    } catch (e) {
      notify.error({ title: "Error", description: "No se pudo generar el documento PDF." });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Historial de Pedidos</h2>
        <div className="flex items-center gap-2 relative group min-w-[170px]">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between pl-10 pr-3 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-white hover:border-blue-500/50 focus:border-blue-500/50 outline-none transition-all shadow-inner"
          >
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Filter className={`w-4 h-4 transition-colors ${dropdownOpen ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'}`} />
            </div>
            <span className="truncate pr-2">
              {opcionesFiltro.find(o => o.value === filtroEstado)?.label || "Todos los estados"}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                {opcionesFiltro.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setFiltroEstado(opt.value);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      filtroEstado === opt.value
                        ? "bg-blue-500/20 text-blue-400 font-bold border-l-2 border-blue-500"
                        : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-slate-900/30 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="animate-spin w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full mr-3" />
            Cargando pedidos...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Package className="w-12 h-12 opacity-30" />
            <p>No se encontraron pedidos.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-300">#{p.id}</td>
                  <td className="px-4 py-3 font-medium text-white">{p.proveedor}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(p.fecha).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      p.estado === 'recibido' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.estado === 'pendiente' ? 'bg-amber-500/20 text-amber-400' :
                      p.estado === 'cancelado' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {p.estado === 'recibido' && <CheckCircle className="w-3 h-3" />}
                      {p.estado === 'pendiente' && <Clock className="w-3 h-3" />}
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.total_items} artículos</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleReimprimirPDF(p)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        title="Reimprimir PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => verDetalles(p.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-white">
                {pedidoDetalle ? `Pedido #${pedidoDetalle.pedido.id} - ${pedidoDetalle.pedido.proveedor}` : 'Cargando...'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {loadingDetalle ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full" />
                </div>
              ) : pedidoDetalle ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-800/50 p-4 rounded-xl">
                    <div>
                      <span className="block text-slate-500 mb-1">Fecha</span>
                      <span className="text-white">{new Date(pedidoDetalle.pedido.fecha).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1">Estado</span>
                      <span className="text-white capitalize">{pedidoDetalle.pedido.estado}</span>
                    </div>
                    {pedidoDetalle.pedido.notas && (
                      <div className="col-span-2">
                        <span className="block text-slate-500 mb-1">Notas</span>
                        <span className="text-white">{pedidoDetalle.pedido.notas}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-white mb-2">Productos ({pedidoDetalle.productos.length})</h3>
                    <div className="border border-white/5 rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 bg-slate-800 border-b border-white/5">
                          <tr>
                            <th className="px-3 py-2">Producto</th>
                            <th className="px-3 py-2 text-center">Cant. Pedida</th>
                            <th className="px-3 py-2 text-center">Cant. Recibida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pedidoDetalle.productos.map(prod => (
                            <tr key={prod.producto_id} className="border-b border-white/5 bg-slate-900/30">
                              <td className="px-3 py-2">
                                <div className="font-medium text-white">{prod.nombre}</div>
                                <div className="text-xs text-slate-500">{prod.codigo_interno}</div>
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-amber-400">
                                {prod.cantidad_pedida}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-emerald-400">
                                {modoRecepcion ? (
                                  <input
                                    type="number"
                                    min={0}
                                    value={cantidadesRecepcion[prod.producto_id] !== undefined ? cantidadesRecepcion[prod.producto_id] : prod.cantidad_pedida}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (!isNaN(val) && val >= 0) {
                                        setCantidadesRecepcion(prev => ({ ...prev, [prod.producto_id]: val }));
                                      } else if (e.target.value === '') {
                                        // Allow empty state briefly while typing
                                        setCantidadesRecepcion(prev => ({ ...prev, [prod.producto_id]: 0 }));
                                      }
                                    }}
                                    className="w-16 mx-auto px-2 py-1 bg-slate-900 border border-emerald-500/30 rounded text-center outline-none focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
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
                <div className="text-center text-rose-400">Error al cargar pedido.</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex flex-wrap justify-end gap-2 shrink-0">
              {modoRecepcion ? (
                <>
                  <button onClick={() => setModoRecepcion(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm">
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarRecepcion}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors text-sm font-bold"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Ingreso a Stock
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm">
                    Cerrar
                  </button>
                  {pedidoDetalle && pedidoDetalle.pedido.estado === 'pendiente' && (
                    <button
                      onClick={handleMarcarEnviado}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors text-sm"
                    >
                      <Send className="w-4 h-4" />
                      Marcar como Enviado
                    </button>
                  )}
                  {pedidoDetalle && pedidoDetalle.pedido.estado !== 'recibido' && pedidoDetalle.pedido.estado !== 'cancelado' && (
                    <button
                      onClick={handleCancelarPedido}
                      className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20 flex items-center gap-2 transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      Cancelar Pedido
                    </button>
                  )}
                  {pedidoDetalle && pedidoDetalle.pedido.estado !== 'recibido' && pedidoDetalle.pedido.estado !== 'cancelado' && (
                    <button
                      onClick={handleIniciarRecepcion}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors text-sm"
                    >
                      <PlusSquare className="w-4 h-4" />
                      Marcar como Recibido
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
