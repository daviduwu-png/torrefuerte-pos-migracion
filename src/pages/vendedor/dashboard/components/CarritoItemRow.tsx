import { X, Edit, Plus, Minus } from "lucide-react";
import { CarritoItem } from "../types";
import { esUnidadDecimal } from "../hooks/useCarrito";

interface CarritoItemRowProps {
    item: CarritoItem;
    onEliminar: (id: number) => void;
    onActualizarCantidad: (id: number, delta: number) => void;
    onEditarPrecio: (id: number, precioActual: number) => void;
}

export function CarritoItemRow({
    item,
    onEliminar,
    onActualizarCantidad,
    onEditarPrecio,
}: CarritoItemRowProps) {
    const esDecimal = esUnidadDecimal(item.producto.tipo_medida);
    const step = esDecimal ? 0.25 : 1;

    return (
        <div className="glass-card p-3 rounded-xl flex flex-col gap-2 group hover:bg-slate-800/80 border border-white/5 hover:border-blue-500/30 transition-all relative">
            {/* Fila Superior: Cantidad, Nombre, Total y Eliminar */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="px-2 h-8 shrink-0 rounded-lg bg-slate-900/50 flex items-center justify-center text-slate-300 font-bold text-xs font-mono border border-slate-700/50 min-w-[32px]">
                        {item.cantidad}{esDecimal ? "" : "x"}
                    </div>
                    <div className="flex flex-col min-w-0 pr-2">
                        <h4 className="font-bold text-slate-200 text-sm leading-snug truncate">
                            {item.producto.nombre}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400">
                                Código: {item.producto.codigo_interno || item.producto.id}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase">
                                {item.producto.tipo_medida || "UNIDAD"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <p className="font-bold text-base text-emerald-400 min-w-[70px] text-right">
                        ${(item.producto.precio_venta * item.cantidad).toFixed(2)}
                    </p>
                    <button
                        onClick={() => onEliminar(item.id)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar producto"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Fila Inferior: Precio Unitario, Badges y Controles */}
            <div className="flex items-center justify-between pl-11 pr-8 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-400">
                        ${item.producto.precio_venta.toFixed(2)} c/u
                    </span>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditarPrecio(item.id, item.producto.precio_venta);
                        }}
                        className="p-1 text-blue-400 hover:bg-blue-500/20 rounded-md opacity-60 hover:opacity-100 transition-all"
                        title="Cambiar Precio (Preferencial)"
                    >
                        <Edit className="w-3 h-3" />
                    </button>

                    {item.producto.stock <= item.cantidad ? (
                        <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/30 font-mono" title="¡La cantidad pedida iguala o supera el stock actual!">
                            Stock: {item.producto.stock}
                        </span>
                    ) : item.producto.stock < 10 ? (
                        <span className="text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/30 font-mono">
                            Stock: {item.producto.stock}
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50 font-mono">
                            Disp: {item.producto.stock}
                        </span>
                    )}
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center bg-slate-950/50 rounded-lg p-0.5 border border-slate-800">
                    <button
                        onClick={() => onActualizarCantidad(item.id, -step)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title={esDecimal ? "Restar 0.25" : "Restar 1"}
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-center text-xs font-bold text-slate-300 min-w-[32px] font-mono">
                        {item.cantidad}
                    </span>
                    <button
                        onClick={() => onActualizarCantidad(item.id, step)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title={esDecimal ? "Sumar 0.25" : "Sumar 1"}
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
