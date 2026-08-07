import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileText,
  Loader2,
  Download,
  Trash2,
  CopyPlus,
  ChevronDown,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
} from "lucide-react";
import { api, Cotizacion } from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoTorre from "../../../../../assets/torre.png";

interface Props {
  open: boolean;
  onClose: () => void;
}

function FiltroSelector({
  estado,
  onCambiar,
}: {
  estado: string;
  onCambiar: (est: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const estados = [
    {
      value: "todas",
      label: "Todos los estados",
      icon: FileText,
      color: "text-slate-300",
      bg: "bg-slate-800",
      border: "border-slate-700",
    },
    {
      value: "vigente",
      label: "Vigentes",
      icon: Clock,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      value: "enviada",
      label: "Enviadas",
      icon: Send,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      value: "aprobada",
      label: "Aprobadas",
      icon: CheckCircle2,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      value: "cancelada",
      label: "Canceladas",
      icon: XCircle,
      color: "text-slate-400",
      bg: "bg-slate-500/10",
      border: "border-slate-500/20",
    },
  ];

  const actual = estados.find((e) => e.value === estado) || estados[0];
  const Icon = actual.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${actual.bg} ${actual.color} ${actual.border} hover:bg-white/5 shadow-inner`}
      >
        <Icon className="w-3.5 h-3.5" />
        {actual.label}
        <ChevronDown
          className={`w-3.5 h-3.5 ml-1 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1.5 right-0 w-44 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200">
            {estados.map((est) => {
              const EstIcon = est.icon;
              return (
                <button
                  key={est.value}
                  onClick={() => {
                    onCambiar(est.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors hover:bg-white/5 ${est.value === estado ? est.color + " bg-white/5" : "text-slate-400"}`}
                >
                  <EstIcon className="w-3.5 h-3.5" />
                  {est.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function EstadoSelector({
  estado,
  onCambiar,
}: {
  estado: string;
  onCambiar: (est: any) => void;
}) {
  const [open, setOpen] = useState(false);

  const estados = [
    {
      value: "vigente",
      label: "Vigente",
      icon: Clock,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      value: "enviada",
      label: "Enviada",
      icon: Send,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      value: "aprobada",
      label: "Aprobada",
      icon: CheckCircle2,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      value: "cancelada",
      label: "Cancelada",
      icon: XCircle,
      color: "text-slate-400",
      bg: "bg-slate-500/10",
      border: "border-slate-500/20",
    },
  ];

  const actual = estados.find((e) => e.value === estado) || estados[0];
  const Icon = actual.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border transition-all ${actual.bg} ${actual.color} ${actual.border} hover:bg-white/5 shadow-inner`}
      >
        <Icon className="w-3 h-3" />
        {actual.label}
        <ChevronDown
          className={`w-3 h-3 ml-0.5 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1.5 left-0 w-36 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200">
            {estados.map((est) => {
              const EstIcon = est.icon;
              return (
                <button
                  key={est.value}
                  onClick={() => {
                    onCambiar(est.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold uppercase transition-colors hover:bg-white/5 ${est.value === estado ? est.color + " bg-white/5" : "text-slate-400"}`}
                >
                  <EstIcon className="w-3.5 h-3.5" />
                  {est.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function HistorialCotizacionesModal({ open, onClose }: Props) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");

  useEffect(() => {
    if (open) {
      cargarCotizaciones();
    } else {
      setCotizaciones([]);
    }
  }, [open]);

  const cargarCotizaciones = async () => {
    setLoading(true);
    try {
      const res = await api.listarCotizaciones(
        undefined,
        undefined,
        "2000-01-01",
        "2100-12-31",
      );
      if (res.success && res.data) {
        setCotizaciones(res.data);
      } else {
        notify.error({
          title: "Error",
          description: "No se pudieron cargar las cotizaciones.",
        });
      }
    } catch (error) {
      notify.error({
        title: "Error",
        description: "Error de conexión al cargar cotizaciones.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async (id: number) => {
    try {
      const res = await api.obtenerCotizacion(id);
      if (res.success && res.data) {
        const { cotizacion, productos } = res.data;
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
        doc.text(`Cotización #${id}`, 60, 32);

        doc.setFontSize(11);
        const fechaCot = new Date(cotizacion.fecha.replace(" ", "T"));
        const fechaFormateada = fechaCot.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const horaFormateada = fechaCot.toLocaleTimeString("es-MX", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        let nombreClienteAMostrar = "Mostrador";
        if (cotizacion.cliente_id) {
          try {
            const cliRes = await api.obtenerCliente(cotizacion.cliente_id);
            if (cliRes.success && cliRes.data) {
              nombreClienteAMostrar = `CL-${String(cliRes.data.id).padStart(3, "0")} - ${cliRes.data.nombre}`;
            }
          } catch (e) {
             nombreClienteAMostrar = `CL-${String(cotizacion.cliente_id).padStart(3, "0")}`;
          }
        } else if (cotizacion.cliente_ref) {
          nombreClienteAMostrar = cotizacion.cliente_ref;
        }

        doc.text(`Fecha: ${fechaFormateada} ${horaFormateada}`, 196, 24, {
          align: "right",
        });
        doc.text(`Cliente: ${nombreClienteAMostrar}`, 60, 40);

        const tableData = productos.map((item, index) => [
          index + 1,
          item.nombre,
          item.codigo_interno || item.producto_id,
          `$${item.precio_unitario.toFixed(2)}`,
          item.cantidad,
          `$${item.subtotal.toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: 55,
          head: [
            ["#", "Producto", "Código", "Precio Unit.", "Cantidad", "Subtotal"],
          ],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [192, 57, 43] },
          styles: { fontSize: 10 },
          columnStyles: {
            0: { cellWidth: 10 },
            3: { halign: "right" },
            4: { halign: "center" },
            5: { halign: "right" },
          },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(
          `Total de Cotización: $${cotizacion.total.toFixed(2)}`,
          14,
          finalY,
        );

        const fechaArchivo = fechaFormateada.replace(/\//g, "-");
        const timeStr = horaFormateada.replace(/:/g, "");

        const idClienteFormat = cotizacion.cliente_id ? `CL-${String(cotizacion.cliente_id).padStart(3, "0")}` : "Mostrador";
        doc.save(
          `Cotizacion_${id}_${idClienteFormat}_${fechaArchivo}_${timeStr}.pdf`,
        );

        notify.success({
          title: "Éxito",
          description: "El PDF se generó correctamente.",
        });
      } else {
        notify.error({
          title: "Error",
          description: "No se encontró el detalle de la cotización.",
        });
      }
    } catch (error) {
      console.error(error);
      notify.error({
        title: "Error",
        description: "Ocurrió un error al generar el PDF.",
      });
    }
  };

  const handleEliminar = (id: number) => {
    notify.warning({
      title: "¿Eliminar cotización?",
      description: "Esta acción no se puede deshacer.",
      button: {
        title: "Sí, eliminar",
        onClick: async () => {
          try {
            const res = await api.eliminarCotizacion(id);
            if (res.success) {
              notify.success({
                title: "Eliminada",
                description: "Cotización eliminada correctamente.",
              });
              setCotizaciones((prev) => prev.filter((c) => c.id !== id));
            } else {
              notify.error({ title: "Error", description: res.message });
            }
          } catch {
            notify.error({ title: "Error", description: "Fallo de conexión." });
          }
        },
      },
    });
  };

  const handleCambiarEstado = async (
    id: number,
    nuevoEstado: "vigente" | "enviada" | "aprobada" | "cancelada",
  ) => {
    try {
      const res = await api.cambiarEstadoCotizacion(id, nuevoEstado);
      if (res.success) {
        notify.success({
          title: "Estado actualizado",
          description: "El estado se guardó correctamente.",
        });
        setCotizaciones((prev) =>
          prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c)),
        );
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch {
      notify.error({ title: "Error", description: "Fallo de conexión." });
    }
  };

  const handleCargarAlCarrito = async (id: number) => {
    try {
      setLoading(true);
      const res = await api.obtenerCotizacion(id);
      if (res.success && res.data) {
        const { productos, cotizacion } = res.data;
        const items = [];
        for (const p of productos) {
          const pRes = await api.obtenerProducto(p.producto_id);
          if (pRes.success && pRes.data) {
            items.push({
              id: p.producto_id,
              producto: pRes.data,
              cantidad: p.cantidad,
              precioUnitario: p.precio_unitario,
            });
          }
        }
        localStorage.setItem(
          "cotizacion_a_cargar",
          JSON.stringify({
            clienteId: cotizacion.cliente_id,
            items: items,
          }),
        );
        window.dispatchEvent(
          new CustomEvent("cambiarTabGestion", { detail: "cotizaciones" }),
        );
        onClose();
      } else {
        notify.error({
          title: "Error",
          description: "No se pudo obtener la cotización.",
        });
      }
    } catch (e) {
      notify.error({
        title: "Error",
        description: "Ocurrió un error al cargar la cotización.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtradas = cotizaciones.filter(
    (c) => filtroEstado === "todas" || c.estado === filtroEstado,
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Historial de Cotizaciones
              </h2>
              <p className="text-xs text-slate-400">
                Todas las cotizaciones registradas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FiltroSelector estado={filtroEstado} onCambiar={setFiltroEstado} />
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pb-48 min-h-[350px] overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400">Cargando cotizaciones...</p>
            </div>
          ) : cotizaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
              <FileText className="w-12 h-12 text-slate-500" />
              <p className="text-slate-400 text-sm">
                No hay cotizaciones registradas.
              </p>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
              <FileText className="w-12 h-12 text-slate-500" />
              <p className="text-slate-400 text-sm">
                No hay cotizaciones para el estado seleccionado.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtradas.map((cotizacion) => (
                <div
                  key={cotizacion.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-800/40 border border-white/5 rounded-xl hover:bg-slate-800/60 transition-colors gap-4"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-200">
                        Folio #{cotizacion.id}
                      </span>
                      <EstadoSelector
                        estado={cotizacion.estado}
                        onCambiar={(est) =>
                          handleCambiarEstado(cotizacion.id, est)
                        }
                      />
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>
                        {new Date(
                          cotizacion.fecha.replace(" ", "T"),
                        ).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {cotizacion.notas && (
                        <>
                          <span className="w-1 h-1 bg-slate-600 rounded-full" />
                          <span className="truncate max-w-[200px]">
                            {cotizacion.notas}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:justify-end">
                    <div className="text-right">
                       <p className="text-xs font-semibold text-slate-300">
                         {cotizacion.cliente_id ? `Cliente ID: ${cotizacion.cliente_id}` : cotizacion.cliente_ref ? `Ref: ${cotizacion.cliente_ref}` : "Mostrador"}
                       </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-0.5">Total</p>
                      <p className="font-bold text-emerald-400">
                        ${cotizacion.total.toFixed(2)}
                      </p>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden sm:block" />

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCargarAlCarrito(cotizacion.id)}
                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors border border-amber-500/20"
                        title="Cargar al generador"
                      >
                        <CopyPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleImprimir(cotizacion.id)}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20"
                        title="Exportar/Imprimir PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEliminar(cotizacion.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                        title="Eliminar Cotización"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
