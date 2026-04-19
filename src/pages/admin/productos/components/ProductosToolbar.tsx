import { Search, Box, Plus } from "lucide-react";
import { ProductoInput } from "../types";
import { EMPTY_FORM } from "../types";

interface ProductosToolbarProps {
    busqueda: string;
    totalFiltrados: number;
    onBusquedaChange: (v: string) => void;
    onNuevoProducto: () => void;
}

export function ProductosToolbar({
    busqueda,
    totalFiltrados,
    onBusquedaChange,
    onNuevoProducto,
}: ProductosToolbarProps) {
    return (
        <div className="p-4 border-b border-slate-800 flex gap-4 items-center">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, código..."
                    value={busqueda}
                    onChange={(e) => onBusquedaChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
            </div>

            <div className="hidden lg:block">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 flex items-center gap-3 ">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Box className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <p className="text-xl font-bold text-white leading-none">
                            {totalFiltrados}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mt-1">
                            Productos
                        </p>
                    </div>
                </div>
            </div>

            <button
                onClick={onNuevoProducto}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
                <Plus className="w-5 h-5" /> Nuevo
            </button>
        </div>
    );
}

// Re-export for convenience
export { EMPTY_FORM };
export type { ProductoInput };
