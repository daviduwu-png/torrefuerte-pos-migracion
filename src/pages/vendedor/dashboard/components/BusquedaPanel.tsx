import { ScanBarcode, Search } from "lucide-react";
import { ProductoCard } from "../../../../components";
import { Producto } from "../types";

interface BusquedaPanelProps {
    busqueda: string;
    resultados: Producto[];
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    onBusquedaChange: (query: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onSeleccionar: (producto: Producto) => void;
    onVerificarPrecios: () => void;
}

export function BusquedaPanel({
    busqueda,
    resultados,
    searchInputRef,
    onBusquedaChange,
    onKeyDown,
    onSeleccionar,
    onVerificarPrecios,
}: BusquedaPanelProps) {
    return (
        <div className="md:col-span-5 flex flex-col gap-4 h-full min-h-0">
            <div className="glass-panel rounded-3xl flex flex-col h-full overflow-hidden border border-white/10 shadow-2xl">
                {/* Header del panel */}
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 border border-blue-500/20">
                            <ScanBarcode className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">
                                Agregar Productos
                            </h2>
                            <p className="text-[10px] text-slate-400 font-medium">
                                Escanea o busca por nombre
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={onVerificarPrecios}
                        className="px-3 py-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 border border-blue-500/50"
                        title="Verificar Precio"
                    >
                        <ScanBarcode className="w-4 h-4" />
                        Verificar
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 flex flex-col min-h-0 gap-4">
                    {/* Input */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="text-slate-400 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={busqueda}
                            onChange={(e) => onBusquedaChange(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Escanear código o buscar..."
                            className="w-full pl-12 pr-4 py-4 glass-input rounded-2xl text-[13px] font-medium outline-none transition-all shadow-inner"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="text-[10px] font-bold bg-white/10 text-slate-400 px-2 py-1 rounded border border-white/5 hidden sm:block">
                                ENTER
                            </div>
                        </div>
                    </div>

                    {/* Resultados */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {resultados.map((prod) => (
                            <div
                                key={prod.id}
                                onClick={() => onSeleccionar(prod)}
                                className="cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200"
                            >
                                <ProductoCard producto={prod} variant="search" showPriceType="all" />
                            </div>
                        ))}

                        {busqueda && resultados.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                                <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                    <Search className="w-10 h-10 opacity-50" />
                                </div>
                                <p className="text-lg font-medium text-slate-400">
                                    No se encontraron productos
                                </p>
                                <p className="text-sm opacity-60 mt-1">
                                    Intenta con otro término o código
                                </p>
                            </div>
                        )}

                        {!busqueda && resultados.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500/40 p-8 text-center">
                                <ScanBarcode className="w-24 h-24 opacity-20 mb-4" />
                                <p className="text-lg font-medium">Listo para escanear</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
