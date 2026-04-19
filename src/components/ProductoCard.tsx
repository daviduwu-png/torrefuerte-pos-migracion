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
  variant?: "compact" | "detailed" | "search";
  showPriceType?: "venta" | "all";
  className?: string;
}

export default function ProductoCard({
  producto,
  variant = "detailed",
  showPriceType = "all",
  className = "",
}: ProductoCardProps) {

  // ─── VARIANTE SEARCH ────────────────────────────────────────────────────────
  if (variant === "search") {
    const stockColor =
      producto.stock === 0
        ? "text-red-400 border-red-500/30 bg-red-500/10"
        : producto.stock <= 5
          ? "text-orange-400 border-orange-500/30 bg-orange-500/10"
          : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";

    return (
      <div
        className={`glass-panel border border-slate-700/40 rounded-xl p-3 hover:border-blue-500/40 hover:bg-slate-800/60 transition-all flex flex-col gap-2.5 ${className}`}
      >
        {/* Fila superior: badges + stock */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {producto.codigo_interno && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400">
                Código: {producto.codigo_interno}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/40 border border-slate-600/50 text-slate-300">
              ID: {producto.id}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase">
              {producto.tipo_medida}
            </span>
          </div>
          
          {/* Stock badge */}
          <div className={`flex flex-col items-center justify-center px-2 py-0.5 rounded-md border min-w-[54px] ${stockColor}`}>
            <span className="text-[8px] uppercase tracking-wider opacity-80 font-bold mb-0.5">Stock</span>
            <span className="text-sm font-black leading-none">{producto.stock}</span>
          </div>
        </div>

        {/* Nombre del producto */}
        <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
          {producto.nombre}
        </h4>

        {/* Precios: Grid 2x2 con títulos arriba y precios abajo a todo lo ancho */}
        {showPriceType === "all" ? (
          <div className="grid grid-cols-2 gap-2 mt-1">
            
            {/* Precio Público */}
            <div className="flex flex-col justify-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wide opacity-90">Público</span>
              </div>
              <p className="text-[15px] font-black text-emerald-400 w-full truncate">
                ${producto.precio_venta.toFixed(2)}
              </p>
            </div>

            {/* Precio Distribuidor */}
            <div className="flex flex-col justify-center bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <Building2 className="w-3 h-3 text-purple-400" />
                <span className="text-[9px] text-purple-400 uppercase font-bold tracking-wide opacity-90">Dist.</span>
              </div>
              <p className="text-[15px] font-black text-purple-400 w-full truncate">
                ${(producto.precio_distribuidor || 0).toFixed(2)}
              </p>
            </div>

            {/* Precio Mayoreo */}
            <div className="flex flex-col justify-center bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <Users className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] text-blue-400 uppercase font-bold tracking-wide opacity-90">Mayor.</span>
              </div>
              <p className="text-[15px] font-black text-blue-400 w-full truncate">
                ${(producto.precio_mayoreo || 0).toFixed(2)}
              </p>
            </div>

            {/* Precio Compra */}
            <div className="flex flex-col justify-center bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3 h-3 text-amber-400" />
                <span className="text-[9px] text-amber-400 uppercase font-bold tracking-wide opacity-90">Compra</span>
              </div>
              <p className="text-[15px] font-black text-amber-400 w-full truncate">
                ${producto.precio_compra.toFixed(2)}
              </p>
            </div>

          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center mt-1">
            <p className="text-lg font-black text-emerald-400">
              ${producto.precio_venta.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── VARIANTE COMPACT ────────────────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <div
        className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 hover:bg-slate-800/70 transition-all ${className}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
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

              <div className="flex items-center gap-1 text-slate-500">
                <span className="text-xs font-bold">ID:</span>
                <span className="text-xs font-mono font-bold">
                  {producto.id}
                </span>
              </div>

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

          <div
            className={`px-2 py-1 rounded-lg border text-xs font-bold bg-slate-950/50 border-slate-700 ${producto.stock === 0
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

  // ─── VARIANTE DETAILED (original, usada en VerificarPrecios) ─────────────────
  return (
    <div
      className={`glass-panel border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
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

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600">
              <span className="text-sm text-slate-400 font-bold">ID:</span>
              <span className="text-sm font-mono text-slate-300 font-bold">
                {producto.id}
              </span>
            </div>

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
            className={`px-4 py-2 rounded-xl border bg-slate-950/50 border-slate-700 ${producto.stock === 0
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
