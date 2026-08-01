import { useState } from "react";
import { FileText, FileDown, User, FileX } from "lucide-react";
import { notify } from "../../../utils/sileo";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoTorre from "../../../assets/torre.png";

import { useCotizacion } from "./cotizaciones/hooks/useCotizacion";
import { BusquedaCotizacion } from "./cotizaciones/components/BusquedaCotizacion";
import { ItemCotizacionRow } from "./cotizaciones/components/ItemCotizacionRow";

export default function CotizacionesTab() {
  const [clienteId, setClienteId] = useState("");
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const {
    items,
    busqueda,
    resultados,
    buscando,
    searchInputRef,
    setBusqueda,
    agregarProducto,
    actualizarCantidad,
    editarPrecio,
    eliminar,
    total,
  } = useCotizacion();

  const getBase64Image = async (url: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerarPDF = async () => {
    if (items.length === 0) {
      notify.warning({
        title: "Sin productos",
        description: "Agrega al menos un producto a la cotización.",
        duration: 4000,
      });
      return;
    }

    setGenerandoPdf(true);
    try {
      const doc = new jsPDF();
      
      try {
        const logoBase64 = await getBase64Image(logoTorre);
        doc.addImage(logoBase64, "PNG", 14, 10, 40, 40);
      } catch (e) {
        console.warn("No se pudo cargar el logo:", e);
      }

      doc.setFontSize(22);
      doc.setTextColor(192, 57, 43);
      doc.text("Ferretería Torre Fuerte", 60, 24);
      
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text("Cotización de Productos", 60, 32);
      
      doc.setFontSize(11);
      doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 140, 24);
      if (clienteId) {
        doc.text(`Cliente (ID/Nombre): ${clienteId}`, 60, 40);
      }

      const tableData = items.map((item, index) => [
        index + 1,
        item.producto.nombre,
        item.producto.codigo_interno || item.producto.id,
        `$${item.precioUnitario.toFixed(2)}`,
        item.cantidad,
        `$${(item.precioUnitario * item.cantidad).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: 55,
        head: [["#", "Producto", "Código", "Precio Unit.", "Cantidad", "Subtotal"]],
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
        `Total de Cotización: $${total.toFixed(2)}`,
        14,
        finalY
      );

      doc.save(`Cotizacion_${new Date().getTime()}.pdf`);

      notify.success({
        title: "Cotización Generada",
        description: "El PDF se ha descargado correctamente.",
      });

    } catch (error) {
      console.error(error);
      notify.error({
        title: "Error",
        description: "Hubo un error al generar el PDF.",
      });
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 min-h-0">
      {/* Header */}
      <div className="shrink-0 pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                Generador de Cotizaciones
              </h2>
              <p className="text-xs text-slate-400">
                Crea cotizaciones con precios preferenciales y expórtalas a PDF.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleGenerarPDF}
            disabled={generandoPdf || items.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {generandoPdf ? "Generando..." : "Exportar a PDF"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Lado izquierdo: Búsqueda y Cliente */}
        <div className="w-1/3 flex flex-col gap-4 min-h-0">
          <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                <User className="w-4 h-4" />
                ID / Nombre del Cliente
              </label>
              <input
                type="text"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                placeholder="Ej. Juan Pérez o ID 123"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>

          <BusquedaCotizacion
            busqueda={busqueda}
            resultados={resultados}
            buscando={buscando}
            searchInputRef={searchInputRef}
            onBusquedaChange={setBusqueda}
            onSeleccionar={agregarProducto}
          />
        </div>

        {/* Lado derecho: Lista de productos en cotización */}
        <div className="w-2/3 bg-slate-900/50 border border-white/5 rounded-xl flex flex-col min-h-0">
          <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0">
            <h3 className="text-sm font-semibold text-white">
              Productos Seleccionados <span className="text-slate-400 font-normal">({items.length})</span>
            </h3>
            <div className="text-lg font-bold text-emerald-400">
              Total: ${total.toFixed(2)}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <FileX className="w-10 h-10 opacity-40" />
                <p className="text-sm">Agrega productos para armar la cotización.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <ItemCotizacionRow
                    key={item.id}
                    item={item}
                    onEliminar={eliminar}
                    onActualizarCantidad={actualizarCantidad}
                    onEditarPrecio={editarPrecio}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
