import { useState } from "react";
import { api, TicketConProductos } from "../../api/tauri";
import {
  Search,
  Filter,
  Eye,
  FileText,
  X,
  Loader2,
  RotateCcw,
} from "lucide-react";
import Swal from "sweetalert2";
import { formatFechaHoraCorta, getFechaHoy } from "../../utils/dateFormat";

export default function SalesHistory() {
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Results Modal State
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [tickets, setTickets] = useState<TicketConProductos[]>([]);
  const [modalTitle, setModalTitle] = useState("");

  // Ticket Detail Modal
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [selectedTicket, setSelectedTicket] =
    useState<TicketConProductos | null>(null);

  const fetchTickets = async (
    range: "hoy" | "semana" | "mes" | "anio" | "custom",
    start?: string,
    end?: string,
  ) => {
    setLoading(true);
    try {
      let fStart = start;
      let fEnd = end;
      let title = "";

      if (range !== "custom") {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const d = now.getDate();

        if (range === "hoy") {
          fStart = getFechaHoy();
          fEnd = fStart;
          title = "Ventas de Hoy";
        } else if (range === "semana") {
          const first = new Date(now.setDate(d - now.getDay()));
          fStart = first.toISOString().split("T")[0];
          fEnd = getFechaHoy();
          title = "Ventas de la Semana";
        } else if (range === "mes") {
          fStart = new Date(y, m, 1).toISOString().split("T")[0];
          fEnd = new Date(y, m + 1, 0).toISOString().split("T")[0]; // last day
          title = "Ventas del Mes";
        } else if (range === "anio") {
          fStart = new Date(y, 0, 1).toISOString().split("T")[0];
          fEnd = new Date(y, 11, 31).toISOString().split("T")[0];
          title = "Ventas del Año";
        }
      } else {
        title = `Ventas del ${start} al ${end}`;
      }

      const response = await api.listarTickets(fStart, fEnd);
      if (response.success && response.data) {
        setTickets(response.data);
        setModalTitle(title);
        setShowResultsModal(true);
      } else {
        alert(response.message || "No se encontraron tickets.");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFilter = () => {
    if (!fechaInicio || !fechaFin) {
      alert("Seleccione ambas fechas");
      return;
    }
    fetchTickets("custom", fechaInicio, fechaFin);
  };

  const handleSearchById = async () => {
    const id = prompt("Ingrese el ID o Folio del Ticket:");
    if (!id) return;

    setLoading(true);
    try {
      const response = await api.buscarTicket(id);
      if (response.success && response.data && response.data.length > 0) {
        setTickets(response.data);
        setModalTitle(`Resultados para: "${id}"`);
        setShowResultsModal(true);
      } else {
        alert("Ticket no encontrado");
      }
    } catch (error) {
      console.error("Error searching ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDevolucion = async (producto: any, ticketId: number) => {
    // 1. Confirmar cantidad
    const { value: cantidad } = await Swal.fire({
      title: "Realizar Devolución",
      html: `
        <p class="text-sm text-slate-400 mb-4">Producto: <b>${producto.nombre}</b></p>
        <p class="text-xs text-slate-500 mb-2">Vendidos: ${producto.cantidad}</p>
        <label class="block text-left text-xs font-bold text-slate-300 mb-1">Cantidad a devolver:</label>
      `,
      input: "number",
      inputValue: 1,
      inputAttributes: {
        min: "1",
        max: producto.cantidad.toString(),
        step: "1",
      },
      showCancelButton: true,
      confirmButtonText: "Siguiente",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      background: "#1e293b",
      color: "#ebe6e6ff",
      // --- AGREGA ESTE BLOQUE ---
      didOpen: () => {
        const select = Swal.getInput();
        if (select) {
          // Forzamos el estilo en las opciones hijas
          const options = select.querySelectorAll("option");
          options.forEach((op) => {
            op.style.backgroundColor = "#334155"; // Color slate-700
            op.style.color = "white";
          });
        }
      },
      // --------------------------

      inputValidator: (value) => {
        return !value ? "Debes seleccionar un motivo" : null;
      },
      customClass: {
        input: "bg-slate-700 text-white border-slate-600 focus:ring-blue-500",
        popup: "rounded-3xl border border-slate-700 shadow-2xl",
        confirmButton: "rounded-xl px-6 py-3",
        cancelButton: "rounded-xl px-6 py-3",
      },
    });

    if (!cantidad) return;

    // 2. Confirmar motivo
    const { value: motivo } = await Swal.fire({
      title: "Motivo de Devolución",
      input: "select",
      inputOptions: {
        "Defecto de fábrica": "Defecto de fábrica",
        "Empaque dañado": "Empaque dañado",
        "Cliente se arrepintió": "Cliente se arrepintió",
        "Error en venta": "Error en venta",
        Otro: "Otro",
      },
      inputPlaceholder: "Selecciona un motivo",
      showCancelButton: true,
      confirmButtonText: "Confirmar Devolución",
      confirmButtonColor: "#ef4444",
      background: "#1e293b",
      color: "#ebe6e6ff",

      // --- AGREGA ESTE BLOQUE ---
      didOpen: () => {
        const select = Swal.getInput();
        if (select) {
          // Forzamos el estilo en las opciones hijas
          const options = select.querySelectorAll("option");
          options.forEach((op) => {
            op.style.backgroundColor = "#334155"; // Color slate-700
            op.style.color = "white";
          });
        }
      },
      // --------------------------

      inputValidator: (value) => {
        return !value ? "Debes seleccionar un motivo" : null;
      },
      customClass: {
        input: "bg-slate-700 text-white border-slate-600 focus:ring-blue-500",
        popup: "rounded-3xl border border-slate-700 shadow-2xl",
        confirmButton: "rounded-xl px-6 py-3",
        cancelButton: "rounded-xl px-6 py-3",
      },
    });

    if (!motivo) return;

    // 3. Ejecutar devolución
    try {
      setLoading(true);
      const devolucionData = {
        ticket_id: ticketId,
        producto_id: producto.producto_id, // Asegurar que el backend envía este campo en details
        cantidad: parseInt(cantidad),
        motivo: motivo,
      };

      const res = await api.realizarDevolucion(devolucionData);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Devolución Exitosa",
          text: `Se ha registrado la devolución de ${cantidad} unidad(es).`,
          background: "#1e293b",
          color: "#fff",
          confirmButtonColor: "#10b981",
        });

        // Update local state to reflect change immediately (optional but good for UX)
        if (selectedTicket) {
          const cantInt = parseInt(cantidad);
          const montoDevolucion = cantInt * producto.precio_unitario;

          const updatedProductos = selectedTicket.productos.map((p) => {
            if (p.producto_id === producto.producto_id) {
              return {
                ...p,
                cantidad: p.cantidad - cantInt,
                devuelto: (p.devuelto || 0) + cantInt,
              };
            }
            return p;
          });

          setSelectedTicket({
            ...selectedTicket,
            ticket: {
              ...selectedTicket.ticket,
              total: selectedTicket.ticket.total - montoDevolucion,
            },
            productos: updatedProductos,
          });
        }

        // setShowTicketDetail(false); // Mantener abierto para ver el cambio
      } else {
        throw new Error(res.message);
      }
    } catch (error: any) {
      console.error(error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo procesar la devolución",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const openTicketDetail = (ticket: TicketConProductos) => {
    setSelectedTicket(ticket);
    setShowTicketDetail(true);
  };

  return (
    <>
      <div className="glass-panel rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex flex-col">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 ml-1">
                Desde
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 ml-1">
                Hasta
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCustomFilter}
              disabled={loading}
              className="px-3 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-lg shadow-cyan-900/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Filter className="w-4 h-4" />
              )}{" "}
              Filtrar
            </button>
            <button
              onClick={handleSearchById}
              disabled={loading}
              className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}{" "}
              Buscar ID
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
            <button
              onClick={() => fetchTickets("hoy")}
              className="px-3 py-2 text-xs font-medium text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/10 transition-colors bg-cyan-500/5"
            >
              Hoy
            </button>
            <button
              onClick={() => fetchTickets("semana")}
              className="px-3 py-2 text-xs font-medium text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/10 transition-colors bg-cyan-500/5"
            >
              Semana
            </button>
            <button
              onClick={() => fetchTickets("mes")}
              className="px-3 py-2 text-xs font-medium text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/10 transition-colors bg-cyan-500/5"
            >
              Mes
            </button>
            <button
              onClick={() => fetchTickets("anio")}
              className="px-3 py-2 text-xs font-medium text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/10 transition-colors bg-cyan-500/5"
            >
              Año
            </button>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {showResultsModal && (
        <div
          onClick={() => setShowResultsModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel w-full max-w-4xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-300"
          >
            <div className="bg-slate-900/50 px-6 py-5 flex items-center justify-between flex-shrink-0 border-b border-white/5 backdrop-blur-xl">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/20">
                  <FileText className="w-5 h-5 text-cyan-400" />
                </div>
                {modalTitle}
              </h3>
              <button
                onClick={() => setShowResultsModal(false)}
                className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/50 sticky top-0 z-10 shadow-sm border-b border-white/5">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Folio
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Método
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tickets.length > 0 ? (
                    tickets.map((t) => (
                      <tr
                        key={t.ticket.id}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        <td className="p-4 text-sm font-mono text-slate-400">
                          {t.ticket.id}
                        </td>
                        <td className="p-4 text-sm font-mono text-slate-300 group-hover:text-cyan-300 transition-colors">
                          {t.ticket.folio_fiscal || (
                            <span className="text-slate-600 italic">--</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-400">
                          {formatFechaHoraCorta(t.ticket.fecha)}
                        </td>
                        <td className="p-4 text-sm font-bold text-emerald-400 font-mono">
                          ${t.ticket.total.toFixed(2)}
                        </td>
                        <td className="p-4 text-sm text-slate-300 px-2 py-1">
                          <span className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium">
                            {t.ticket.metodo_pago}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openTicketDetail(t)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 rounded-lg transition-all"
                            title="Ver Detalles"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-slate-500"
                      >
                        No se encontraron tickets.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showTicketDetail && selectedTicket && (
        <div
          onClick={() => setShowTicketDetail(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-slate-900 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden relative"
          >
            <div className="absolute top-2 right-2">
              <button
                onClick={() => setShowTicketDetail(false)}
                className="bg-slate-200 hover:bg-red-100 hover:text-red-500 rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Style: Paper Receipt */}
            <div className="p-6 max-h-[80vh] overflow-y-auto bg-white">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">
                  {selectedTicket.ticket.nombre_local}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedTicket.ticket.direccion_local}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {formatFechaHoraCorta(selectedTicket.ticket.fecha)}
                </p>
                <div className="flex flex-col items-center gap-1 mt-2 font-mono text-sm text-slate-600">
                  <p>ID Interno: #{selectedTicket.ticket.id}</p>
                  <p>Folio Fiscal: {selectedTicket.ticket.folio_fiscal}</p>
                </div>
              </div>

              <div className="border-t-2 border-slate-900 border-dashed my-4"></div>

              <div className="space-y-4 mb-6">
                {selectedTicket.productos.map((p, idx) => {
                  const devuelto = p.devuelto || 0;
                  const originalQty = p.cantidad + devuelto;
                  const originalSubtotal = originalQty * p.precio_unitario;

                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-1 py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex justify-between text-sm items-start">
                        <div className="pr-2">
                          <span className="font-bold text-slate-900">
                            {originalQty} x{" "}
                          </span>
                          <span className="text-slate-800">{p.nombre}</span>
                        </div>
                        <span className="font-mono font-medium text-slate-900 whitespace-nowrap">
                          ${originalSubtotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Badge de devuelto */}
                        <div>
                          {devuelto > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                              <RotateCcw className="w-3 h-3" />
                              {devuelto} Devuelto(s)
                            </span>
                          )}
                        </div>

                        {/* Botón Devolución */}
                        <div className="flex justify-end">
                          {p.cantidad > 0 ? (
                            <button
                              onClick={() =>
                                handleDevolucion(p, selectedTicket.ticket.id)
                              }
                              className="p-1 px-2 text-xs bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 rounded border border-slate-200 hover:border-red-200 transition-colors flex items-center gap-1"
                              title="Devolver Artículo"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Devolver
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                              AGOTADO
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t-2 border-slate-900 border-dashed my-4"></div>

              {(() => {
                // Cálculos Totales para coherencia visual
                let totalDevuelto = 0;
                selectedTicket.productos.forEach((p) => {
                  totalDevuelto += (p.devuelto || 0) * p.precio_unitario;
                });
                const currentTotal = selectedTicket.ticket.total;
                const originalTotal = currentTotal + totalDevuelto;

                return (
                  <div className="space-y-1 text-right">
                    {totalDevuelto > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>Subtotal Original:</span>
                          <span>${originalTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-500 font-medium">
                          <span>Devoluciones:</span>
                          <span>-${totalDevuelto.toFixed(2)}</span>
                        </div>
                        <div className="border-b border-slate-200 my-1"></div>
                      </>
                    )}

                    <div className="flex justify-between text-xl font-black text-slate-900">
                      <span>TOTAL</span>
                      <span>${currentTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-slate-600 mt-2">
                      <span>Método Pago:</span>
                      <span>{selectedTicket.ticket.metodo_pago}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Recibido:</span>
                      <span>
                        ${selectedTicket.ticket.dinero_recibido.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Cambio:</span>
                      <span>${selectedTicket.ticket.cambio.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-8 text-center text-xs text-slate-400">
                <p>*** GRACIAS POR SU COMPRA ***</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
