import { X, Edit, Plus, Minus } from "lucide-react";
import { ItemCotizacion } from "../types";
import { esUnidadDecimal } from "../hooks/useCotizacion";

interface ItemRowProps {
  item: ItemCotizacion;
  onEliminar: (id: number) => void;
  onActualizarCantidad: (id: number, delta: number) => void;
  onEditarPrecio: (id: number, precioActual: number) => void;
}

export function ItemCotizacionRow({
  item,
  onEliminar,
  onActualizarCantidad,
  onEditarPrecio,
}: ItemRowProps) {
  const esDecimal = esUnidadDecimal(item.producto.tipo_medida);
  const step = esDecimal ? 0.25 : 1;
  const subtotal = item.precioUnitario * item.cantidad;
  const precioEditado = item.precioUnitario !== item.producto.precio_venta;

  return (
    <div className="glass-card p-3 rounded-xl flex flex-col gap-2 group hover:bg-slate-800/80 border border-white/5 hover:border-blue-500/30 transition-all">
      {/* Fila superior */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="px-2 h-8 shrink-0 rounded-lg bg-slate-900/50 flex items-center justify-center text-slate-300 font-bold text-xs font-mono border border-slate-700/50 min-w-[36px]">
            {item.cantidad}{esDecimal ? "" : "x"}
          </div>
          <div className="flex flex-col min-w-0 pr-2">
            <h4 className="font-bold text-slate-200 text-sm leading-snug truncate">{item.producto.nombre}</h4>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                {item.producto.codigo_interno || item.producto.id}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase">
                {item.producto.tipo_medida || "UNIDAD"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <p className="font-bold text-base text-emerald-400 min-w-[70px] text-right">
            ${subtotal.toFixed(2)}
          </p>
          <button
            onClick={() => onEliminar(item.id)}
            className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Eliminar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fila inferior */}
      <div className="flex items-center justify-between pl-11 pr-8 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-mono ${precioEditado ? "text-amber-400 font-bold" : "text-slate-400"}`}>
            ${item.precioUnitario.toFixed(2)} c/u
            {precioEditado && (
              <span className="ml-1 text-[10px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                PREFERENCIAL
              </span>
            )}
          </span>

          <button
            onClick={() => onEditarPrecio(item.id, item.precioUnitario)}
            className="p-1 text-blue-400 hover:bg-blue-500/20 rounded-md opacity-60 hover:opacity-100 transition-all"
            title="Cambiar precio"
          >
            <Edit className="w-3 h-3" />
          </button>

          {/* Badge stock */}
          {item.producto.stock <= item.cantidad ? (
            <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 font-mono">
              Stock: {item.producto.stock}
            </span>
          ) : item.producto.stock < 10 ? (
            <span className="text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/30 font-mono">
              Stock: {item.producto.stock}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 font-mono">
              Disp: {item.producto.stock}
            </span>
          )}
        </div>

        {/* Controles cantidad */}
        <div className="flex items-center bg-slate-950/50 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => onActualizarCantidad(item.id, -step)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="px-2 text-center text-xs font-bold text-slate-300 min-w-[32px] font-mono">
            {item.cantidad}
          </span>
          <button
            onClick={() => onActualizarCantidad(item.id, step)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
