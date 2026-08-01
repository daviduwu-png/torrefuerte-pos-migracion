import { Search, AlertCircle, ScanBarcode } from "lucide-react";
import { Producto } from "../types";
import ProductoCard from "../../../../../components/ProductoCard";

interface BusquedaCotizacionProps {
  busqueda: string;
  resultados: Producto[];
  buscando: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onBusquedaChange: (q: string) => void;
  onSeleccionar: (producto: Producto) => void;
}

export function BusquedaCotizacion({
  busqueda,
  resultados,
  buscando,
  searchInputRef,
  onBusquedaChange,
  onSeleccionar,
}: BusquedaCotizacionProps) {
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-xl flex-1 flex flex-col min-h-0">
      <div className="p-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <ScanBarcode className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Buscar Producto</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Código de barras, nombre..."
            autoFocus
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {buscando ? (
          <div className="text-center py-6 text-slate-500 text-sm">Buscando...</div>
        ) : resultados.length > 0 ? (
          <div className="flex flex-col gap-2">
            {resultados.map((prod) => (
              <div
                key={prod.id}
                onClick={() => onSeleccionar(prod)}
                className="cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200"
              >
                <ProductoCard producto={prod} variant="search" showPriceType="all" />
              </div>
            ))}
          </div>
        ) : busqueda ? (
          <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 opacity-40" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <ScanBarcode className="w-7 h-7 text-blue-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-slate-400">Escanea o escribe</p>
            <p className="text-xs text-slate-600 mt-1">Código de barras o nombre</p>
          </div>
        )}
      </div>
    </div>
  );
}
