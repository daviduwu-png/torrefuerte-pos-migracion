import { useState } from "react";
import { api, ItemEtiqueta, Producto } from "../../../api/tauri";
import { generarEan13Interno, validarEan13 } from "./utils";
import { BarcodePreview } from "./BarcodePreview";
import {
  AlertTriangle,
  CheckCircle,
  Save,
  Printer,
  Minus,
  Plus,
} from "lucide-react";
import { notify } from "../../../utils/sileo";

export function PanelEtiqueta({
  producto,
  onAsignado,
}: {
  producto: Producto;
  onAsignado: (p: Producto) => void;
}) {
  const codigoGenerado = generarEan13Interno(producto.id);
  const [codigo, setCodigo] = useState(
    producto.codigo_barras ?? codigoGenerado,
  );
  const [copias, setCopias] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [impresoraDestino, setImpresoraDestino] = useState<"1" | "2">("2");

  const tieneCodigo = !!producto.codigo_barras;
  const codigoValido = codigo.trim().length >= 4;
  const esEan13 = /^\d{13}$/.test(codigo.trim());
  const ean13Ok = !esEan13 || validarEan13(codigo.trim());

  async function handleAsignar() {
    if (!codigoValido || tieneCodigo) return;
    setGuardando(true);
    try {
      const res = await api.asignarCodigoBarras(producto.id, codigo.trim());
      if (res.success) {
        notify.success({
          title: "¡Código asignado!",
          description:
            "El código de barras se ha vinculado correctamente al producto.",
        });
        onAsignado({ ...producto, codigo_barras: codigo.trim() });
      } else {
        notify.error({
          title: "No se pudo asignar",
          description:
            res.message ||
            "Verifica que el código no esté en uso por otro producto.",
        });
      }
    } catch {
      notify.error({
        title: "Error de conexión",
        description:
          "No se pudo establecer comunicación con el servidor. Inténtalo de nuevo.",
      });
    } finally {
      setGuardando(false);
    }
  }

  async function handleImprimir() {
    if (!codigoValido) return;
    setImprimiendo(true);
    try {
      const items: ItemEtiqueta[] = [
        {
          codigo: codigo.trim(),
          codigo_interno: producto.codigo_interno || null,
          copias,
        },
      ];
      const res = await api.imprimirCodigosBarras(items, impresoraDestino);
      if (res.success) {
        notify.success({
          title: "¡Enviado a imprimir!",
          description: `Se han enviado ${copias} copia(s) a la impresora de etiquetas.`,
        });
      } else {
        notify.error({
          title: "Error de impresión",
          description:
            res.message ||
            "Ocurrió un problema al intentar generar la etiqueta.",
        });
      }
    } catch {
      notify.error({
        title: "Error de impresora",
        description: "No se pudo comunicar con el servicio de impresión local.",
      });
    } finally {
      setImprimiendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Preview */}
      <div className="flex justify-center">
        <BarcodePreview
          codigo={codigo.trim()}
          codigoInterno={producto.codigo_interno || ""}
        />
      </div>

      {/* Nombre del producto */}
      <div className="text-center">
        <p className="text-slate-200 font-semibold text-sm truncate">
          {producto.nombre}
        </p>
        <p className="text-slate-500 text-xs">ID #{producto.id}</p>
      </div>

      {/* Input código */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">
          Código de barras
        </label>
        <div className="flex gap-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            readOnly={tieneCodigo}
            placeholder="EAN-13 o código propio"
            className={`flex-1 glass-input rounded-lg px-3 py-2 text-sm font-mono ${tieneCodigo ? "opacity-60 cursor-not-allowed bg-slate-800/50" : ""}`}
          />
          {!tieneCodigo && (
            <button
              onClick={() => setCodigo(codigoGenerado)}
              title="Generar EAN-13 interno"
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
            >
              Auto
            </button>
          )}
        </div>
        {tieneCodigo ? (
          <p className="text-slate-400 text-xs mt-1 italic">
            El código de barras ya está asignado.
          </p>
        ) : (
          <>
            {esEan13 && !ean13Ok && (
              <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                <AlertTriangle size={14} /> Dígito verificador incorrecto
              </p>
            )}
            {esEan13 && ean13Ok && (
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                <CheckCircle size={14} /> EAN-13 válido
              </p>
            )}
            {!esEan13 && codigoValido && (
              <p className="text-sky-400 text-xs mt-1">
                Código personalizado (Code128)
              </p>
            )}
          </>
        )}
      </div>

      {/* Controles de Impresión */}
      <div className="flex gap-4">
        {/* Copias */}
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">
            Copias a imprimir
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCopias((c) => Math.max(1, c - 1))}
              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="text-white font-bold text-lg w-6 text-center">
              {copias}
            </span>
            <button
              onClick={() => setCopias((c) => Math.min(20, c + 1))}
              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Selección de Impresora */}
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Impresora</label>
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setImpresoraDestino("1")}
              className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                impresoraDestino === "1"
                  ? "bg-slate-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              1
            </button>
            <button
              onClick={() => setImpresoraDestino("2")}
              className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                impresoraDestino === "2"
                  ? "bg-slate-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              2
            </button>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        {!tieneCodigo && (
          <button
            onClick={handleAsignar}
            disabled={guardando || !codigoValido}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} /> {guardando ? "Guardando…" : "Asignar"}
          </button>
        )}
        <button
          onClick={handleImprimir}
          disabled={imprimiendo || !codigoValido}
          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Printer size={16} /> {imprimiendo ? "Imprimiendo…" : "Imprimir"}
        </button>
      </div>
    </div>
  );
}
