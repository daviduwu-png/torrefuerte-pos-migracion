import { X, Edit, Plus, Minus } from "lucide-react";
import { CarritoItem } from "../types";

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
    return (
        <div className="glass-card p-3 rounded-xl flex flex-col gap-2 group hover:bg-slate-800/80 border border-white/5 hover:border-blue-500/30 transition-all relative">
            {/* Fila Superior: Cantidad, Nombre, Total y Eliminar */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-900/50 flex items-center justify-center text-slate-300 font-bold text-sm border border-slate-700/50">
                        {item.cantidad}x
                    </div>
                    <h4 className="font-bold text-slate-200 text-sm pr-2">
                        {item.producto.nombre}
                    </h4>
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
            <div className="flex items-center justify-between pl-11 pr-8">
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

                    {item.producto.stock < 10 && (
                        <span className="text-[9px] text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            STOCK BAJO
                        </span>
                    )}
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center bg-slate-950/50 rounded-lg p-0.5 border border-slate-800">
                    <button
                        onClick={() => onActualizarCantidad(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-300">
                        {item.cantidad}
                    </span>
                    <button
                        onClick={() => onActualizarCantidad(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
