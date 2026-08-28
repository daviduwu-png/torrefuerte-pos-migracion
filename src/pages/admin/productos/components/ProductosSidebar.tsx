import { Search, SlidersHorizontal, XOctagon } from "lucide-react";

interface ProductosSidebarProps {
    marcas: string[];
    proveedores: string[];
    filtrosMarcas: string[];
    filtrosProveedores: string[];
    busquedaMarca: string;
    busquedaProveedor: string;
    onBusquedaMarcaChange: (v: string) => void;
    onBusquedaProveedorChange: (v: string) => void;
    onToggleMarca: (marca: string) => void;
    onToggleProveedor: (prov: string) => void;
    onLimpiarFiltros: () => void;
}

export function ProductosSidebar({
    marcas,
    proveedores,
    filtrosMarcas,
    filtrosProveedores,
    busquedaMarca,
    busquedaProveedor,
    onBusquedaMarcaChange,
    onBusquedaProveedorChange,
    onToggleMarca,
    onToggleProveedor,
    onLimpiarFiltros,
}: ProductosSidebarProps) {
    return (
        <div className="w-48 xl:w-56 bg-slate-900 rounded-xl border border-slate-800 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900 z-10">
                <h6 className="font-bold text-slate-300 text-xs uppercase flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" /> Filtros
                </h6>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {/* Marcas */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block px-2">
                        Marcas
                    </label>
                    <div className="px-2 mb-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-md py-1 pl-7 pr-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                                value={busquedaMarca}
                                onChange={(e) => onBusquedaMarcaChange(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto px-2">
                        {marcas
                            .filter((m) =>
                                m.toLowerCase().includes(busquedaMarca.toLowerCase())
                            )
                            .map((m) => (
                                <label
                                    key={m}
                                    className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white cursor-pointer select-none py-1.5 group transition-colors"
                                >
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={filtrosMarcas.includes(m)}
                                            onChange={() => onToggleMarca(m)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-4 h-4 rounded-full border border-slate-600 bg-slate-800 peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all flex items-center justify-center group-hover:border-amber-500/50">
                                            <svg className="w-2.5 h-2.5 text-slate-900 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="truncate group-hover:text-amber-100 transition-colors">{m}</span>
                                </label>
                            ))}
                    </div>
                </div>

                {/* Proveedores */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block px-2">
                        Proveedores
                    </label>
                    <div className="px-2 mb-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-md py-1 pl-7 pr-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                                value={busquedaProveedor}
                                onChange={(e) => onBusquedaProveedorChange(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto px-2">
                        {proveedores
                            .filter((p) =>
                                p.toLowerCase().includes(busquedaProveedor.toLowerCase())
                            )
                            .map((p) => (
                                <label
                                    key={p}
                                    className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white cursor-pointer select-none py-1.5 group transition-colors"
                                >
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={filtrosProveedores.includes(p)}
                                            onChange={() => onToggleProveedor(p)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-4 h-4 rounded-full border border-slate-600 bg-slate-800 peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all flex items-center justify-center group-hover:border-amber-500/50">
                                            <svg className="w-2.5 h-2.5 text-slate-900 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <span className="truncate group-hover:text-amber-100 transition-colors">{p}</span>
                                </label>
                            ))}
                    </div>
                </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900">
                <button
                    onClick={onLimpiarFiltros}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                >
                    <XOctagon className="w-4 h-4" /> Limpiar
                </button>
            </div>
        </div>
    );
}
