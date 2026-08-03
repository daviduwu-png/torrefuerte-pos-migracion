import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Loader2, Download } from "lucide-react";
import { api, Cliente, Cotizacion } from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoTorre from "../../../../../assets/torre.png";

interface Props {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

export function CotizacionesClienteModal({ open, onClose, cliente }: Props) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && cliente) {
      cargarCotizaciones();
    } else {
      setCotizaciones([]);
    }
  }, [open, cliente]);

  const cargarCotizaciones = async () => {
    if (!cliente) return;
    setLoading(true);
    try {
      const res = await api.listarCotizaciones(cliente.id);
      if (res.success && res.data) {
        setCotizaciones(res.data);
      } else {
        notify.error({ title: "Error", description: "No se pudieron cargar las cotizaciones." });
      }
    } catch (error) {
      notify.error({ title: "Error", description: "Error de conexión al cargar cotizaciones." });
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async (id: number) => {
    if (!cliente) return;
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
        const fechaFormateada = fechaCot.toLocaleDateString("es-MX", { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaFormateada = fechaCot.toLocaleTimeString("es-MX", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
        
        doc.text(`Fecha: ${fechaFormateada} ${horaFormateada}`, 196, 24, { align: "right" });
        doc.text(`Cliente: CL-${String(cliente.id).padStart(3, "0")} - ${cliente.nombre}`, 60, 40);

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
        doc.text(`Total de Cotización: $${cotizacion.total.toFixed(2)}`, 14, finalY);

        const fechaArchivo = fechaFormateada.replace(/\//g, "-");
        const timeStr = horaFormateada.replace(/:/g, "");
        
        doc.save(`Cotizacion_${id}_CL-${String(cliente.id).padStart(3, "0")}_${fechaArchivo}_${timeStr}.pdf`);
        
        notify.success({ title: "Éxito", description: "El PDF se generó correctamente." });
      } else {
        notify.error({ title: "Error", description: "No se encontró el detalle de la cotización." });
      }
    } catch (error) {
      console.error(error);
      notify.error({ title: "Error", description: "Ocurrió un error al generar el PDF." });
    }
  };

  if (!open || !cliente) return null;

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
              <h2 className="text-lg font-bold text-white">Cotizaciones Guardadas</h2>
              <p className="text-xs text-slate-400">Cliente: {cliente.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400">Cargando cotizaciones...</p>
            </div>
          ) : cotizaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
              <FileText className="w-12 h-12 text-slate-500" />
              <p className="text-slate-400 text-sm">Este cliente no tiene cotizaciones guardadas.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {cotizaciones.map((cotizacion) => (
                <div key={cotizacion.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-800/40 border border-white/5 rounded-xl hover:bg-slate-800/60 transition-colors gap-4">
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-200">
                        Folio #{cotizacion.id}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        cotizacion.estado === 'vigente' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        cotizacion.estado === 'aprobada' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {cotizacion.estado}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{new Date(cotizacion.fecha.replace(" ", "T")).toLocaleDateString("es-MX", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {cotizacion.notas && (
                        <>
                          <span className="w-1 h-1 bg-slate-600 rounded-full" />
                          <span className="truncate max-w-[200px]">{cotizacion.notas}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-0.5">Total</p>
                      <p className="font-bold text-emerald-400">${cotizacion.total.toFixed(2)}</p>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden sm:block" />

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleImprimir(cotizacion.id)}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20"
                        title="Exportar/Imprimir PDF"
                      >
                        <Download className="w-4 h-4" />
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
    document.body
  );
}
