import { useState, useEffect } from "react";
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { notify } from "../../../../../utils/sileo";
import DatePicker from "../../../../../components/ui/DatePicker";
import { Producto, api } from "../../../../../api/tauri";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoTorre from "../../../../../assets/torre.png";

interface ItemPedido {
  producto: Producto;
  cantidad: number;
}

interface NuevoPedidoModalProps {
  open: boolean;
  onClose: () => void;
  productosPreseleccionados?: Producto[];
  marcas: string[];
  proveedorFiltro?: string;
}

export function NuevoPedidoModal({
  open,
  onClose,
  productosPreseleccionados = [],
  marcas,
  proveedorFiltro = "",
}: NuevoPedidoModalProps) {
  const [proveedor, setProveedor] = useState("");
  const [marca, setMarca] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [guardandoEnSistema, setGuardandoEnSistema] = useState(false);

  // Sincronizar items cada vez que se abre el modal con nuevos productos
  useEffect(() => {
    if (open) {
      setItems(
        productosPreseleccionados.map((p) => ({ producto: p, cantidad: 1 })),
      );

      // Auto-capturar el proveedor del primer producto seleccionado
      if (
        productosPreseleccionados.length > 0 &&
        productosPreseleccionados[0].proveedor
      ) {
        setProveedor(productosPreseleccionados[0].proveedor);
      } else if (proveedorFiltro) {
        setProveedor(proveedorFiltro);
      }
    }
  }, [open, productosPreseleccionados, proveedorFiltro]);

  const handleClose = () => {
    setProveedor("");
    setMarca("");
    setFecha("");
    setNotas("");
    setItems([]);
    onClose();
  };

  const handleCantidadChange = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item,
      ),
    );
  };

  const handleCantidadDirecta = (index: number, val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 1) {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, cantidad: n } : item)),
      );
    }
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGuardarYGenerar = async () => {
    if (!proveedor.trim()) {
      notify.warning({
        title: "Proveedor requerido",
        description: "Selecciona o escribe el nombre del proveedor.",
        duration: 4000,
      });
      return;
    }
    if (items.length === 0) {
      notify.warning({
        title: "Sin productos",
        description: "Agrega al menos un producto al pedido.",
        duration: 4000,
      });
      return;
    }
    if (!fecha) {
      notify.warning({
        title: "Fecha requerida",
        description: "Selecciona la fecha del pedido.",
        duration: 4000,
      });
      return;
    }

    setGenerandoPdf(true);
    setGuardandoEnSistema(true);
    let nuevoIdPedido = "";

    try {
      // 1. Guardar en Sistema primero
      const res = await api.guardarPedido({
        proveedor: proveedor.trim(),
        marca: marca.trim() || undefined,
        notas: notas.trim() || undefined,
        items: items.map((i) => ({
          producto_id: i.producto.id,
          cantidad_pedida: i.cantidad,
          precio_estimado: undefined,
        })),
      });

      if (!res.success) {
        notify.error({
          title: "Error al guardar",
          description: res.message,
          duration: 6000,
        });
        setGenerandoPdf(false);
        setGuardandoEnSistema(false);
        return;
      }

      nuevoIdPedido = res.data?.toString() || "";

      // 2. Generar PDF con el ID Oficial
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
      doc.text(`Orden de Pedido #${nuevoIdPedido}`, 60, 32);

      doc.setFontSize(11);
      const rawTime = new Date().toLocaleTimeString("es-MX", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const timeStr = rawTime.replace(/:/g, "");

      doc.text(`Fecha: ${fecha} ${rawTime}`, 196, 24, { align: "right" });
      doc.text(`Proveedor: ${proveedor}`, 60, 40);
      doc.text(`Marca: ${marca || "N/A"}`, 60, 46);

      const tableData = items.map((item, index) => [
        index + 1,
        item.producto.nombre,
        item.producto.codigo_interno ?? item.producto.id,
        item.cantidad,
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

      if (notas) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text("Notas:", 14, finalY);
        doc.setFontSize(9);
        const splitNotas = doc.splitTextToSize(notas, 180);
        doc.text(splitNotas, 14, finalY + 5);
      }

      doc.save(
        `Pedido_${nuevoIdPedido}_${proveedor.replace(/\s+/g, "_")}_${fecha.replace(/\//g, "-")}_${timeStr}.pdf`,
      );

      notify.success({
        title: "Pedido Registrado",
        description: `El pedido #${nuevoIdPedido} se guardó y exportó correctamente.`,
        duration: 5000,
      });

      handleClose();
    } catch {
      notify.error({
        title: "Error al generar pedido",
        description: "Ocurrió un problema inesperado.",
        duration: 6000,
      });
    } finally {
      setGenerandoPdf(false);
      setGuardandoEnSistema(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Nueva Orden de Pedido
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Genera una lista de reabastecimiento para tu proveedor
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex flex-col gap-5">
            {/* Proveedor y marca */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Proveedor
                </label>
                <div className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-slate-300 select-none cursor-not-allowed">
                  {proveedor || "Cargando proveedor..."}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Marca
                </label>
                <input
                  list="marcas-list"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none"
                  placeholder="Marca (opcional)"
                />
                <datalist id="marcas-list">
                  {marcas.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Fecha del Pedido <span className="text-rose-500">*</span>
              </label>
              <DatePicker
                value={fecha}
                onChange={setFecha}
                className="w-full"
              />
            </div>

            {/* Lista de productos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Productos a Pedir{" "}
                  <span className="text-slate-400 font-normal">
                    ({items.length})
                  </span>
                </h3>
              </div>

              {items.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                  <ShoppingCart className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No hay productos en el pedido.</p>
                  <p className="text-xs">
                    Selecciona productos desde la tabla principal.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 border-b border-white/5">
                      <tr>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Cantidad</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr
                          key={item.producto.id}
                          className="border-b border-white/5 bg-slate-900/30"
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-200">
                                {item.producto.nombre}
                              </span>
                              <span className="text-xs text-slate-500 font-mono mt-0.5">
                                {item.producto.codigo_interno ??
                                  `#${item.producto.id}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-sm font-bold ${item.producto.stock === 0 ? "text-rose-500" : "text-amber-400"}`}
                            >
                              {item.producto.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCantidadChange(index, -1)}
                                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-3 h-3 text-white" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.cantidad}
                                onChange={(e) =>
                                  handleCantidadDirecta(index, e.target.value)
                                }
                                className="w-14 text-center bg-slate-800 border border-slate-700 rounded-lg py-1 text-white text-sm outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => handleCantidadChange(index, 1)}
                                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemove(index)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Notas adicionales (Opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none resize-none h-20"
                placeholder="Instrucciones especiales, condiciones de entrega, etc."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center flex-shrink-0">
          <p className="text-xs text-slate-500">
            {items.length} producto(s) · PDF con logo TorreFuerte
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardarYGenerar}
              disabled={guardandoEnSistema || generandoPdf}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {guardandoEnSistema || generandoPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {guardandoEnSistema || generandoPdf
                ? "Procesando..."
                : "Guardar y Generar PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
