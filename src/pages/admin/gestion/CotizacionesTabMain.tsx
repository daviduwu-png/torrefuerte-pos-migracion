import { useState, useEffect } from "react";
import {
  FileText,
  FileDown,
  User,
  FileX,
  Loader2,
  Package,
} from "lucide-react";
import { notify } from "../../../utils/sileo";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoTorre from "../../../assets/torre.png";
import { api } from "../../../api/tauri";
import { useClientes } from "./clientes/hooks/useClientes";

import { useCotizacion } from "./cotizaciones/hooks/useCotizacion";
import { BusquedaCotizacion } from "./cotizaciones/components/BusquedaCotizacion";
import { ItemCotizacionRow } from "./cotizaciones/components/ItemCotizacionRow";

export default function CotizacionesTab() {
  const [clienteId, setClienteId] = useState("");
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [guardandoEnSistema, setGuardandoEnSistema] = useState(false);
  const [creandoApartado, setCreandoApartado] = useState(false);
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const { clientes, loading: cargandoClientes } = useClientes();

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
    vaciar,
    cargarCotizacion,
    total,
  } = useCotizacion();

  useEffect(() => {
    const data = localStorage.getItem("cotizacion_a_cargar");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.items && Array.isArray(parsed.items)) {
          cargarCotizacion(parsed.items);
          if (parsed.clienteId) {
            setClienteId(parsed.clienteId.toString());
          }
        }
      } catch (e) {}
      localStorage.removeItem("cotizacion_a_cargar");
    }
  }, [cargarCotizacion]);

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

  const handleGuardarYGenerar = async () => {
    if (items.length === 0) {
      notify.warning({
        title: "Sin productos",
        description: "Agrega al menos un producto a la cotización.",
        duration: 4000,
      });
      return;
    }

    setGenerandoPdf(true);
    setGuardandoEnSistema(true);
    let nuevoIdCotizacion = "";

    try {
      // 1. Guardar en Sistema
      const clienteIdNum = clienteId ? parseInt(clienteId) : undefined;
      const res = await api.guardarCotizacion({
        cliente_id: !isNaN(clienteIdNum ?? NaN) ? clienteIdNum : undefined,
        cliente_ref:
          clienteId && isNaN(clienteIdNum ?? NaN) ? clienteId : undefined,
        items: items.map((i) => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
          precio_unitario: i.precioUnitario,
        })),
        notas: undefined,
      });

      if (!res.success) {
        notify.error({
          title: "Error",
          description: res.message,
          duration: 6000,
        });
        setGenerandoPdf(false);
        setGuardandoEnSistema(false);
        return;
      }

      nuevoIdCotizacion = res.data?.toString() || "";

      // 2. Generar PDF
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
      doc.text(`Cotización #${nuevoIdCotizacion}`, 60, 32);

      doc.setFontSize(11);
      const fechaActual = new Date();
      const fechaFormateada = fechaActual.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const horaFormateada = fechaActual.toLocaleTimeString("es-MX", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      let nombreClienteAMostrar = clienteId;
      if (clienteId && !isNaN(parseInt(clienteId))) {
        try {
          const cliRes = await api.obtenerCliente(parseInt(clienteId));
          if (cliRes.success && cliRes.data) {
            nombreClienteAMostrar = `CL-${String(cliRes.data.id).padStart(3, "0")} - ${cliRes.data.nombre}`;
          }
        } catch (e) {
          console.warn("No se pudo obtener el nombre del cliente", e);
        }
      }

      doc.text(`Fecha: ${fechaFormateada} ${horaFormateada}`, 196, 24, {
        align: "right",
      });
      if (nombreClienteAMostrar) {
        doc.text(`Cliente: ${nombreClienteAMostrar}`, 60, 40);
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
      doc.text(`Total de Cotización: $${total.toFixed(2)}`, 14, finalY);

      const idClienteFormat =
        clienteId && !isNaN(parseInt(clienteId))
          ? `CL-${String(clienteId).padStart(3, "0")}`
          : "Mostrador";
      const fechaArchivo = fechaActual
        .toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "-");
      const timeStr = horaFormateada.replace(/:/g, "");

      doc.save(
        `Cotizacion_${nuevoIdCotizacion}_${idClienteFormat}_${fechaArchivo}_${timeStr}.pdf`,
      );

      notify.success({
        title: "Cotización Generada",
        description: `Cotización #${nuevoIdCotizacion} guardada y exportada correctamente.`,
      });

      vaciar();
      setClienteId("");
    } catch (error) {
      console.error(error);
      notify.error({
        title: "Error",
        description: "Hubo un error al procesar la cotización.",
      });
    } finally {
      setGenerandoPdf(false);
      setGuardandoEnSistema(false);
    }
  };

  const handleConvertirApartado = async () => {
    if (items.length === 0) {
      notify.warning({
        title: "Sin productos",
        description: "Agrega al menos un producto.",
        duration: 4000,
      });
      return;
    }
    const clienteIdNum = parseInt(clienteId);
    if (isNaN(clienteIdNum)) {
      notify.warning({
        title: "Cliente Requerido",
        description:
          "Debes ingresar un ID de cliente válido (número) para crear un apartado.",
        duration: 5000,
      });
      return;
    }

    setCreandoApartado(true);
    try {
      const res = await api.crearApartado({
        cliente_id: clienteIdNum,
        items: items.map((i) => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
          precio_unitario: i.precioUnitario,
        })),
        notas: "Creado desde Cotización",
      });

      if (res.success) {
        notify.success({
          title: "Apartado Creado",
          description: res.message,
          duration: 6000,
        });
        vaciar();
        setClienteId("");
      } else {
        notify.error({
          title: "Error",
          description: res.message,
          duration: 6000,
        });
      }
    } catch {
      notify.error({
        title: "Error",
        description: "Fallo al conectar con el servidor.",
        duration: 6000,
      });
    } finally {
      setCreandoApartado(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 min-h-0">
      {/* Header */}
      <div className="shrink-0 pb-3 border-b border-white/10 mb-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={handleConvertirApartado}
              disabled={creandoApartado || items.length === 0 || !clienteId}
              title={
                !clienteId
                  ? "Selecciona un cliente registrado para apartar mercancía"
                  : undefined
              }
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {creandoApartado ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Package className="w-3.5 h-3.5" />
              )}
              {creandoApartado ? "Apartando..." : "Convertir"}
            </button>
            <button
              onClick={handleGuardarYGenerar}
              disabled={
                guardandoEnSistema || generandoPdf || items.length === 0
              }
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {guardandoEnSistema || generandoPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              {guardandoEnSistema || generandoPdf
                ? "Procesando..."
                : "Guardar y Exportar"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Lado izquierdo: Búsqueda y Cliente */}
        <div className="w-full md:w-[350px] shrink-0 flex flex-col gap-4 min-h-0">
          <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente
              </label>

              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setClienteDropdownOpen(!clienteDropdownOpen)}
                  disabled={cargandoClientes}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white hover:border-blue-500/50 focus:border-blue-500/50 outline-none transition-all disabled:opacity-50 text-left"
                >
                  <span className="truncate">
                    {cargandoClientes
                      ? "Cargando..."
                      : clienteId
                        ? `CL-${String(clienteId).padStart(3, "0")} - ${clientes.find((c) => c.id.toString() === clienteId)?.nombre || ""}`
                        : "-- Cliente de Mostrador --"}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${clienteDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {clienteDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setClienteDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                      <button
                        onClick={() => {
                          setClienteId("");
                          setClienteDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          !clienteId
                            ? "bg-blue-500/20 text-blue-400 font-bold border-l-2 border-blue-500"
                            : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                        }`}
                      >
                        -- Cliente de Mostrador --
                      </button>

                      {clientes.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setClienteId(c.id.toString());
                            setClienteDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            clienteId === c.id.toString()
                              ? "bg-blue-500/20 text-blue-400 font-bold border-l-2 border-blue-500"
                              : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                          }`}
                        >
                          <span className="font-mono text-xs opacity-60 mr-2">
                            CL-{String(c.id).padStart(3, "0")}
                          </span>
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
        <div className="w-full md:flex-1 bg-slate-900/50 border border-white/5 rounded-xl flex flex-col min-h-0 min-w-0">
          <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0">
            <h3 className="text-sm font-semibold text-white">
              Productos Seleccionados{" "}
              <span className="text-slate-400 font-normal">
                ({items.length})
              </span>
            </h3>
            <div className="text-lg font-bold text-emerald-400">
              Total: ${total.toFixed(2)}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                <FileX className="w-10 h-10 opacity-40" />
                <p className="text-sm">
                  Agrega productos para armar la cotización.
                </p>
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
