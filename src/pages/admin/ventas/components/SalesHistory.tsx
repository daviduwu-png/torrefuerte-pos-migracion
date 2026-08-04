import { useState, useEffect } from "react";
import { api, TicketConProductos } from "../../../../api/tauri";
import {
  Search,
  Filter,
  Eye,
  FileText,
  X,
  Loader2,
  RotateCcw,
  Printer,
  Clock,
  Calendar,
} from "lucide-react";
import { StyledSwal as Swal } from "../../../../utils/swal";
import { formatFechaHoraCorta, getFechaHoy } from "../../../../utils/dateFormat";
import DatePicker from "../../../../components/ui/DatePicker";

export default function SalesHistory() {
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Results State
  const [tickets, setTickets] = useState<TicketConProductos[]>([]);
  const [modalTitle, setModalTitle] = useState("Ventas de Hoy");
  const [activeFilter, setActiveFilter] = useState<"hoy" | "semana" | "mes" | "anio" | "custom">("hoy");

  useEffect(() => {
    fetchTickets("hoy");
  }, []);

  // Ticket Detail Modal
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [selectedTicket, setSelectedTicket] =
    useState<TicketConProductos | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

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

      setFechaInicio(fStart!);
      setFechaFin(fEnd!);
      setActiveFilter(range);

      const response = await api.listarTickets(fStart, fEnd);
      if (response.success && response.data) {
        setTickets(response.data);
        setModalTitle(title);
      } else {
        Swal.fire({
          icon: "info",
          title: "Aviso",
          text: response.message || "No se encontraron tickets.",
          background: "#1e293b",
          color: "#fff",
          confirmButtonColor: "#3b82f6",
        });
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFilter = () => {
    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "Seleccione ambas fechas antes de filtrar.",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }
    setActiveFilter("custom");
    fetchTickets("custom", fechaInicio, fechaFin);
  };

  const handleSearchById = async () => {
    const { value: id } = await Swal.fire({
      title: "Buscar Ticket",
      input: "text",
      inputLabel: "Ingrese el ID o Folio del Ticket:",
      showCancelButton: true,
      confirmButtonText: "Buscar",
      cancelButtonText: "Cancelar",
      background: "#1e293b",
      color: "#fff",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#64748b",
      customClass: {
        input: "bg-slate-800 text-white border-slate-600 focus:ring-blue-500",
        popup: "rounded-2xl border border-white/10 shadow-2xl glass-panel",
      },
    });

    if (!id || !id.trim()) return;

    const trimmedId = id.trim();
    setLoading(true);
    try {
      const response = await api.buscarTicket(trimmedId);
      if (response.success && response.data && response.data.length > 0) {
        setTickets(response.data);
        setModalTitle(`Resultados para: "${trimmedId}"`);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ticket no encontrado",
          background: "#1e293b",
          color: "#fff",
          confirmButtonColor: "#ef4444",
        });
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
      inputValidator: (value: string) => {
        return !value ? "Debes seleccionar un motivo" : null;
      },
      customClass: {
        input:
          "bg-slate-100 text-slate-900 font-semibold border-slate-300 focus:ring-blue-500",
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

      inputValidator: (value: string) => {
        return !value ? "Debes seleccionar un motivo" : null;
      },
      customClass: {
        input:
          "bg-slate-100 text-slate-900 font-semibold border-slate-300 focus:ring-blue-500",
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

          const updatedProductos = selectedTicket.productos.map((p: any) => {
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

  const handleReimprimirTicket = async () => {
    if (!selectedTicket) return;
    setLoadingPrint(true);
    try {
      const res = await api.imprimirTicket(selectedTicket.ticket.id);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Reimpresión exitosa",
          text: "Copia del ticket enviada a la impresora.",
          timer: 2000,
          showConfirmButton: false,
          background: "#1e293b",
          color: "#fff",
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Error al imprimir",
          text: res.message,
          background: "#1e293b",
          color: "#fff",
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (e) {
      console.error(e);
      await Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con la impresora.",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoadingPrint(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 animate-in fade-in duration-300">
      {/* Panel de Filtros (Izquierda) */}
      <div className="glass-panel rounded-2xl shadow-lg border border-white/10 shrink-0 w-full lg:w-72 flex flex-col relative z-20">
        <div className="p-4 sm:p-5 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
          
          {/* Quick Filters */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Filtros Rápidos
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {["hoy", "semana", "mes", "anio"].map((period) => (
                <button
                  key={period}
                  onClick={() => fetchTickets(period as any)}
                  className={`px-2 py-2 text-xs font-bold rounded-xl transition-all border text-center ${
                    activeFilter === period
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-900/20"
                      : "bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {period === "anio" ? "Este Año" : (period === "hoy" ? "Hoy" : (period === "semana" ? "Semana" : "Mes"))}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5"></div>

          {/* Custom Date Range */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Rango Personalizado
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 tracking-wider">
                  Desde
                </label>
                <DatePicker
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 tracking-wider">
                  Hasta
                </label>
                <DatePicker
                  value={fechaFin}
                  onChange={setFechaFin}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleCustomFilter}
                disabled={loading}
                className="w-full mt-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-lg shadow-cyan-900/20"
              >
                {loading && activeFilter === "custom" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Filter className="w-4 h-4" />
                )}
                Filtrar Rango
              </button>
            </div>
          </div>

          <div className="border-t border-white/5 mt-auto pt-4 lg:pt-0 lg:border-t-0"></div>

          {/* Search by ID */}
          <div className="lg:mt-auto">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              Búsqueda Directa
            </h3>
            <button
              onClick={handleSearchById}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-md"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar Folio / ID
            </button>
          </div>
          
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 flex-1 flex flex-col min-h-0 relative z-10">
        <div className="bg-slate-900/50 px-4 sm:px-6 py-4 flex items-center gap-2 border-b border-white/5 shrink-0">
          <div className="p-1.5 bg-cyan-500/20 rounded-lg border border-cyan-500/20 shrink-0">
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="font-bold text-base sm:text-lg text-white truncate">
            {modalTitle}
          </h3>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead className="bg-slate-900/50 sticky top-0 z-10 shadow-sm border-b border-white/5">
              <tr>
                <th className="p-3 sm:px-6 sm:py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-12">
                  ID
                </th>
                <th className="p-3 sm:px-6 sm:py-4 text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  Folio
                </th>
                <th className="p-3 sm:px-6 sm:py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="p-3 sm:px-6 sm:py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="p-3 sm:px-6 sm:py-4 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Método
                </th>
                <th className="p-3 sm:px-6 sm:py-4 text-xs font-bold text-slate-400 uppercase text-center tracking-wider">
                  Ver
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
                    <td className="p-3 sm:px-6 sm:py-4 text-sm font-mono text-slate-400">
                      {t.ticket.id}
                    </td>
                    <td className="p-3 sm:px-6 sm:py-4 text-sm font-mono text-slate-300 group-hover:text-cyan-300 transition-colors hidden sm:table-cell">
                      {t.ticket.folio_fiscal || (
                        <span className="text-slate-600 italic">--</span>
                      )}
                    </td>
                    <td className="p-3 sm:px-6 sm:py-4 text-xs sm:text-sm text-slate-400">
                      {formatFechaHoraCorta(t.ticket.fecha)}
                    </td>
                    <td className="p-3 sm:px-6 sm:py-4 text-sm font-bold text-emerald-400 font-mono whitespace-nowrap">
                      ${t.ticket.total.toFixed(2)}
                    </td>
                    <td className="p-3 sm:px-6 sm:py-4 text-sm text-slate-300 hidden md:table-cell">
                      <span className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium">
                        {t.ticket.metodo_pago}
                      </span>
                    </td>
                    <td className="p-3 sm:px-6 sm:py-4 text-center">
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
                    className="p-16 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                        <RotateCcw className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="font-medium text-lg">No hay tickets</p>
                      <p className="text-sm opacity-60">Prueba usando los filtros superiores</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {showTicketDetail && selectedTicket && (
        <div
          onClick={() => setShowTicketDetail(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden relative"
          >
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <button
                onClick={handleReimprimirTicket}
                disabled={loadingPrint}
                title="Reimprimir ticket"
                className="bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-600 rounded-full p-2 transition-colors disabled:opacity-50"
              >
                {loadingPrint ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setShowTicketDetail(false)}
                className="bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-600 rounded-full p-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Style: Paper Receipt */}
            <div className="p-5 sm:p-6 md:p-8 max-h-[85vh] overflow-y-auto bg-white">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">
                  {selectedTicket.ticket.nombre_local}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedTicket.ticket.rfc && <>RFC: {selectedTicket.ticket.rfc}<br/></>}
                  {selectedTicket.ticket.direccion_local && <>{selectedTicket.ticket.direccion_local}<br/></>}
                  {selectedTicket.ticket.direccion_local_2 && <>{selectedTicket.ticket.direccion_local_2}<br/></>}
                  {selectedTicket.ticket.direccion_local_3 && <>{selectedTicket.ticket.direccion_local_3}</>}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {formatFechaHoraCorta(selectedTicket.ticket.fecha)}
                </p>
                <div className="flex flex-col items-center gap-1 mt-3 font-mono text-sm text-slate-600">
                  <p>
                    ID Interno:{" "}
                    <span className="font-bold text-slate-900">
                      {selectedTicket.ticket.id}
                    </span>
                  </p>
                  <p>
                    Folio Fiscal:{" "}
                    <span className="text-slate-700">
                      {selectedTicket.ticket.folio_fiscal}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border-t-2 border-slate-900 border-dashed my-4"></div>

              <div className="space-y-4 mb-6">
                {selectedTicket.productos.map((p: any, idx: number) => {
                  const devuelto = p.devuelto || 0;
                  const originalQty = p.cantidad + devuelto;
                  const originalSubtotal = originalQty * p.precio_unitario;

                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-1.5 py-3 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex justify-between text-sm items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900">
                            {originalQty}x{" "}
                          </span>
                          <span className="text-slate-800">{p.nombre}</span>
                          {/* Código numérico — fondo negro sólido */}
                          <span className="ml-2 text-[10px] font-mono font-bold text-white bg-black border border-zinc-800 px-1.5 py-0.5 rounded inline-block align-middle">
                            {p.codigo_interno ?? p.producto_id}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">
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
                selectedTicket.productos.forEach((p: any) => {
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
    </div>
  );
}
