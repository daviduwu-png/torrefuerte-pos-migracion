import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Clock, Package, Eye, Filter, ChevronDown, FileDown } from "lucide-react";
import { api, PedidoProveedor } from "../../../../../api/tauri";
import { notify } from "../../../../../utils/sileo";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoTorre from "../../../../../assets/torre.png";
import DetallePedidoModal from "./DetallePedidoModal";

export default function HistorialPedidos() {
  const [pedidos, setPedidos] = useState<PedidoProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroProveedor, setFiltroProveedor] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
  const [dropdownEstadoOpen, setDropdownEstadoOpen] = useState(false);
  const [dropdownProveedorOpen, setDropdownProveedorOpen] = useState(false);
  const [proveedores, setProveedores] = useState<string[]>([]);

  useEffect(() => {
    api.obtenerProveedores().then((res) => {
      if (res.success && res.data) setProveedores(res.data);
    });
  }, []);

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
      const res = await api.listarPedidos(filtroProveedor || undefined, filtroEstado || undefined);
      if (res.success && res.data) {
        setPedidos(res.data);
      }
    } catch (error) {
      console.error(error);
      notify.error({ title: "Error", description: "No se pudieron cargar los pedidos." });
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroProveedor]);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  const verDetalles = (id: number) => {
    setSelectedPedidoId(id);
    setModalOpen(true);
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
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
      {/* Sidebar (Left) */}
      <div className="glass-panel rounded-2xl shadow-lg border border-white/10 shrink-0 w-full lg:w-72 flex flex-col relative z-20">
        <div className="p-4 sm:p-5 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar min-h-0">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              Filtros de Búsqueda
            </h3>
            
            <div className="flex flex-col gap-5">
              {/* Proveedor */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Proveedor</label>
                <div className="relative group w-full">
                  <button
                    onClick={() => setDropdownProveedorOpen(!dropdownProveedorOpen)}
                    className="w-full flex items-center justify-between pl-3 pr-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-white hover:border-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                  >
                    <span className="truncate pr-2 text-xs font-medium">
                      {filtroProveedor || "Todos los proveedores"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownProveedorOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownProveedorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setDropdownProveedorOpen(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          onClick={() => {
                            setFiltroProveedor("");
                            setDropdownProveedorOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                            !filtroProveedor
                              ? "bg-emerald-500/20 text-emerald-400 font-bold border-l-2 border-emerald-500"
                              : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                          }`}
                        >
                          Todos los proveedores
                        </button>
                        {proveedores.map((prov) => (
                          <button
                            key={prov}
                            onClick={() => {
                              setFiltroProveedor(prov);
                              setDropdownProveedorOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                              filtroProveedor === prov
                                ? "bg-emerald-500/20 text-emerald-400 font-bold border-l-2 border-emerald-500"
                                : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                            }`}
                          >
                            {prov}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Estado del Pedido</label>
                <div className="relative group w-full">
                  <button
                    onClick={() => setDropdownEstadoOpen(!dropdownEstadoOpen)}
                    className="w-full flex items-center justify-between pl-3 pr-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-white hover:border-blue-500/50 focus:border-blue-500/50 outline-none transition-all shadow-inner"
                  >
                    <span className="truncate pr-2 text-xs font-medium">
                      {opcionesFiltro.find(o => o.value === filtroEstado)?.label || "Todos los estados"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownEstadoOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownEstadoOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setDropdownEstadoOpen(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                        {opcionesFiltro.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setFiltroEstado(opt.value);
                              setDropdownEstadoOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
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
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 flex-1 flex flex-col min-h-0 relative z-10">
        <div className="flex-1 overflow-auto custom-scrollbar">
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
      </div>

      <DetallePedidoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedPedidoId(null);
        }}
        pedidoId={selectedPedidoId}
        onUpdate={cargarPedidos}
      />
    </div>
  );
}
