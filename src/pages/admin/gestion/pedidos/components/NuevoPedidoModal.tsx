import { useState, useEffect } from "react";
import { X, ShoppingCart, Plus, Minus, Trash2, FileDown } from "lucide-react";
import { createPortal } from "react-dom";
import { notify } from "../../../../../utils/sileo";
import DatePicker from "../../../../../components/ui/DatePicker";
import { Producto } from "../../../../../api/tauri";

interface ItemPedido {
  producto: Producto;
  cantidad: number;
}

interface NuevoPedidoModalProps {
  open: boolean;
  onClose: () => void;
  productosPreseleccionados?: Producto[];
  proveedores: string[];
  marcas: string[];
}

export function NuevoPedidoModal({
  open,
  onClose,
  productosPreseleccionados = [],
  proveedores,
  marcas,
}: NuevoPedidoModalProps) {
  const [proveedor, setProveedor] = useState("");
  const [marca, setMarca] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // Sincronizar items cada vez que se abre el modal con nuevos productos
  useEffect(() => {
    if (open) {
      setItems(productosPreseleccionados.map((p) => ({ producto: p, cantidad: 1 })));
    }
  }, [open, productosPreseleccionados]);

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
          : item
      )
    );
  };

  const handleCantidadDirecta = (index: number, val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 1) {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, cantidad: n } : item))
      );
    }
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerarPDF = async () => {
    if (!proveedor.trim()) {
      notify.warning({ title: "Proveedor requerido", description: "Selecciona o escribe el nombre del proveedor.", duration: 4000 });
      return;
    }
    if (items.length === 0) {
      notify.warning({ title: "Sin productos", description: "Agrega al menos un producto al pedido.", duration: 4000 });
      return;
    }
    if (!fecha) {
      notify.warning({ title: "Fecha requerida", description: "Selecciona la fecha del pedido.", duration: 4000 });
      return;
    }

    setGenerandoPdf(true);
    try {

      const contenidoHTML = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #1a1a2e; margin: 40px; }
            .logo-header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #c0392b; padding-bottom: 16px; margin-bottom: 24px; }
            .logo-title { font-size: 28px; font-weight: 900; color: #c0392b; letter-spacing: 1px; }
            .logo-subtitle { font-size: 13px; color: #555; margin-top: 2px; }
            h2 { color: #c0392b; margin-top: 0; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f5f5f5; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
            .meta span { color: #555; }
            .meta strong { color: #1a1a2e; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th { background: #c0392b; color: white; padding: 10px 12px; text-align: left; }
            td { padding: 9px 12px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) td { background: #fafafa; }
            .footer { margin-top: 32px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="logo-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
              </svg>
              <div class="logo-title">TorreFuerte POS</div>
            </div>
            <div class="logo-subtitle">Sistema de Punto de Venta</div>
            </div>
          </div>
          <h2>Orden de Pedido a Proveedor</h2>
          <div class="meta">
            <div><span>Proveedor: </span><strong>${proveedor}</strong></div>
            <div><span>Marca: </span><strong>${marca || "N/A"}</strong></div>
            <div><span>Fecha: </span><strong>${fecha}</strong></div>
            <div><span>Total productos: </span><strong>${items.length} artículos</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Código</th>
                <th>Stock Actual</th>
                <th>Cantidad Pedida</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.producto.nombre}</td>
                  <td>${item.producto.codigo_interno ?? item.producto.id}</td>
                  <td style="color: ${item.producto.stock === 0 ? "#c0392b" : "#e67e22"}; font-weight: bold;">${item.producto.stock}</td>
                  <td><strong>${item.cantidad}</strong></td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          ${notas ? `<div style="margin-top:20px;padding:12px 14px;background:#fff8e1;border-left:4px solid #f39c12;border-radius:4px;font-size:13px;"><strong>Notas:</strong> ${notas}</div>` : ""}
          <div class="footer">Generado por TorreFuerte POS · ${new Date().toLocaleString("es-MX")}</div>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
        </body>
        </html>
      `;

      const ventana = window.open("", "_blank", "width=900,height=700");
      if (ventana) {
        ventana.document.write(contenidoHTML);
        ventana.document.close();
        notify.success({
          title: "PDF generado",
          description: `Pedido a ${proveedor} listo para imprimir (${items.length} productos).`,
          duration: 5000,
        });
      } else {
        notify.error({
          title: "Error al abrir ventana",
          description: "El navegador bloqueó la ventana emergente. Permite ventanas emergentes.",
          duration: 6000,
        });
      }
    } catch {
      notify.error({
        title: "Error al generar PDF",
        description: "No se pudo generar el documento del pedido.",
        duration: 6000,
      });
    } finally {
      setGenerandoPdf(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nueva Orden de Pedido</h2>
              <p className="text-sm text-slate-400 mt-0.5">Genera una lista de reabastecimiento para tu proveedor</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
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
                  Proveedor <span className="text-rose-500">*</span>
                </label>
                <input
                  list="proveedores-list"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none"
                  placeholder="Nombre del proveedor"
                />
                <datalist id="proveedores-list">
                  {proveedores.map((p) => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Marca</label>
                <input
                  list="marcas-list"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none"
                  placeholder="Marca (opcional)"
                />
                <datalist id="marcas-list">
                  {marcas.map((m) => <option key={m} value={m} />)}
                </datalist>
              </div>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Fecha del Pedido <span className="text-rose-500">*</span>
              </label>
              <DatePicker value={fecha} onChange={setFecha} className="w-full" />
            </div>

            {/* Lista de productos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Productos a Pedir <span className="text-slate-400 font-normal">({items.length})</span>
                </h3>
              </div>

              {items.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                  <ShoppingCart className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No hay productos en el pedido.</p>
                  <p className="text-xs">Selecciona productos desde la tabla principal.</p>
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
                        <tr key={item.producto.id} className="border-b border-white/5 bg-slate-900/30">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-200">{item.producto.nombre}</span>
                              <span className="text-xs text-slate-500 font-mono mt-0.5">
                                {item.producto.codigo_interno ?? `#${item.producto.id}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-bold ${item.producto.stock === 0 ? "text-rose-500" : "text-amber-400"}`}>
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
                                onChange={(e) => handleCantidadDirecta(index, e.target.value)}
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
              <label className="block text-sm font-medium text-slate-400 mb-1">Notas adicionales (Opcional)</label>
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
          <p className="text-xs text-slate-500">{items.length} producto(s) · PDF con logo TorreFuerte</p>
          <div className="flex gap-3">
            <button onClick={handleClose} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleGenerarPDF}
              disabled={generandoPdf}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {generandoPdf ? "Generando..." : "Generar PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
