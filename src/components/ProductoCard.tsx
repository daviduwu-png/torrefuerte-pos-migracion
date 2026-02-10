import { DollarSign, TrendingUp, Users, Building2 } from "lucide-react";

export interface ProductoCardData {
  id: number;
  codigo_barras?: string;
  codigo_interno?: string;
  nombre: string;
  descripcion?: string;
  tipo_medida: string;
  stock: number;
  precio_compra: number;
  precio_venta: number;
  precio_mayoreo?: number;
  precio_distribuidor?: number;
}

interface ProductoCardProps {
  producto: ProductoCardData;
  variant?: "compact" | "detailed";
  showPriceType?: "venta" | "all";
  className?: string;
}

export default function ProductoCard({
  producto,
  variant = "detailed",
  showPriceType = "all",
  className = "",
}: ProductoCardProps) {
  if (variant === "compact") {
    return (
      <div
        className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 hover:bg-slate-800/70 transition-all ${className}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {/* Código Interno en badge naranja */}
              {producto.codigo_interno && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
                  <span className="text-xs text-orange-400 font-bold">
                    Código:
                  </span>
                  <span className="text-xs font-mono text-orange-400 font-bold">
                    {producto.codigo_interno}
                  </span>
                </div>
              )}

              {/* ID con texto */}
              <div className="flex items-center gap-1 text-slate-500">
                <span className="text-xs font-bold">ID:</span>
                <span className="text-xs font-mono font-bold">
                  {producto.id}
                </span>
              </div>

              {/* Tipo de medida */}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 uppercase">
                {producto.tipo_medida}
              </span>
            </div>

            <h4 className="text-sm font-bold text-white line-clamp-2">
              {producto.nombre}
            </h4>
            {producto.descripcion &&
              producto.descripcion !== producto.nombre && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                  {producto.descripcion}
                </p>
              )}
          </div>

          {/* Stock badge negro */}
          <div
            className={`px-2 py-1 rounded-lg border text-xs font-bold bg-slate-950/50 border-slate-700 ${
              producto.stock === 0
                ? "text-red-400"
                : producto.stock <= 5
                  ? "text-orange-400"
                  : "text-emerald-400"
            }`}
          >
            {producto.stock}
          </div>
        </div>

        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">
              Precio Venta
            </p>
            <p className="text-xl font-black text-emerald-400">
              ${producto.precio_venta.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass-panel border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Código Interno en badge naranja */}
            {producto.codigo_interno && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                <span className="text-sm text-orange-400 font-bold">
                  Código:
                </span>
                <span className="text-sm font-mono text-orange-400 font-bold">
                  {producto.codigo_interno}
                </span>
              </div>
            )}

            {/* ID con texto */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600">
              <span className="text-sm text-slate-400 font-bold">ID:</span>
              <span className="text-sm font-mono text-slate-300 font-bold">
                {producto.id}
              </span>
            </div>

            {/* Tipo de medida */}
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-bold">
              {producto.tipo_medida}
            </span>
          </div>
          <h3 className="text-xl font-black text-white mb-1 leading-tight">
            {producto.nombre}
          </h3>
          {producto.descripcion && producto.descripcion !== producto.nombre && (
            <p className="text-sm text-slate-400 line-clamp-2">
              {producto.descripcion}
            </p>
          )}
        </div>

        {/* Stock Badge negro */}
        <div className="ml-4 flex-shrink-0">
          <div
            className={`px-4 py-2 rounded-xl border bg-slate-950/50 border-slate-700 ${
              producto.stock === 0
                ? "text-red-400"
                : producto.stock <= 5
                  ? "text-orange-400"
                  : "text-emerald-400"
            }`}
          >
            <p className="text-[10px] text-current uppercase font-bold text-center mb-0.5">
              Stock
            </p>
            <p className="text-2xl font-black text-current text-center">
              {producto.stock}
            </p>
          </div>
        </div>
      </div>

      {/* Prices Grid */}
      {showPriceType === "all" ? (
        <div className="grid grid-cols-2 gap-3 mt-6">
          {/* Precio Público */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wide">
                Público
              </p>
            </div>
            <p className="text-2xl font-black text-emerald-400">
              ${producto.precio_venta.toFixed(2)}
            </p>
          </div>

          {/* Precio Distribuidor */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-[10px] text-purple-400 uppercase font-bold tracking-wide">
                Distribuidor
              </p>
            </div>
            <p className="text-2xl font-black text-purple-400">
              ${(producto.precio_distribuidor || 0).toFixed(2)}
            </p>
          </div>

          {/* Precio Mayoreo */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wide">
                Mayoreo
              </p>
            </div>
            <p className="text-2xl font-black text-blue-400">
              ${(producto.precio_mayoreo || 0).toFixed(2)}
            </p>
          </div>

          {/* Precio Compra */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wide">
                Compra
              </p>
            </div>
            <p className="text-2xl font-black text-amber-400">
              ${producto.precio_compra.toFixed(2)}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-4">
          <p className="text-xs text-emerald-400 uppercase font-bold tracking-wider mb-2 text-center">
            Precio de Venta
          </p>
          <p className="text-4xl font-black text-emerald-400 text-center">
            ${producto.precio_venta.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
