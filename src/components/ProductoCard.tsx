
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
  precio_compra_incluye_iva?: boolean;
}

interface ProductoCardProps {
  producto: ProductoCardData;
  variant?: "compact" | "detailed" | "search";
  showPriceType?: "venta" | "all";
  className?: string;
  precioCompraConIva?: boolean;
  size?: "sm" | "md";
}

export default function ProductoCard({
  producto,
  variant = "detailed",
  showPriceType = "all",
  className = "",
  precioCompraConIva = false,
  size = "sm",
}: ProductoCardProps) {
  // Usa el flag del objeto producto si existe, o el prop externo
  const tieneIva = producto.precio_compra_incluye_iva ?? precioCompraConIva;

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
        className={`glass-panel border border-slate-700/40 rounded-xl p-3 hover:bg-white/[0.02] transition-colors flex flex-col gap-2 text-left min-w-0 overflow-hidden relative ${className}`}
      >
        <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 min-w-0 break-words">
          {producto.nombre}
        </h4>
        
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5 min-w-0">
          {producto.codigo_interno && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0">
              {producto.codigo_interno}
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/40 border border-slate-600/50 text-slate-300 shrink-0">
            ID: {producto.id}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase shrink-0">
            {producto.tipo_medida}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${stockColor}`}>
            STOCK: {producto.stock}
          </span>
        </div>

        {showPriceType === "all" ? (
          <div className="flex flex-wrap gap-2 mt-1.5 min-w-0">
            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-white/5 whitespace-nowrap shrink-0">
              <span className={size === "md" ? "text-xs text-slate-400 font-medium" : "text-[10px] text-slate-400 font-medium"}>Público:</span>
              <span className={size === "md" ? "text-sm font-bold text-emerald-400" : "text-xs font-bold text-emerald-400"}>${producto.precio_venta.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {(producto.precio_mayoreo ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-white/5 whitespace-nowrap shrink-0">
                <span className={size === "md" ? "text-xs text-slate-400 font-medium" : "text-[10px] text-slate-400 font-medium"}>Mayoreo:</span>
                <span className={size === "md" ? "text-sm font-bold text-blue-400" : "text-xs font-bold text-blue-400"}>${producto.precio_mayoreo!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            
            {(producto.precio_distribuidor ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-white/5 whitespace-nowrap shrink-0">
                <span className={size === "md" ? "text-xs text-slate-400 font-medium" : "text-[10px] text-slate-400 font-medium"}>Dist:</span>
                <span className={size === "md" ? "text-sm font-bold text-purple-400" : "text-xs font-bold text-purple-400"}>${producto.precio_distribuidor!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-white/5 whitespace-nowrap shrink-0">
              <span className={size === "md" ? "text-xs text-slate-400 font-medium" : "text-[10px] text-slate-400 font-medium"}>Compra:</span>
              <span className={size === "md" ? "text-sm font-bold text-amber-400" : "text-xs font-bold text-amber-400"}>${producto.precio_compra.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {tieneIva && (
                <span className="text-[8px] bg-amber-500/30 text-amber-300 px-1 py-0.5 rounded font-bold">+IVA</span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <p className="text-sm font-black text-emerald-400">
              ${producto.precio_venta.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              ${producto.precio_venta.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── VARIANTE DETAILED (original, usada en VerificarPrecios) ─────────────────
    return (
      <div
        className={`glass-panel border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all flex flex-col gap-4 text-left min-w-0 overflow-hidden relative ${className}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-white mb-2 leading-tight break-words min-w-0">
              {producto.nombre}
            </h3>
            
            <div className="flex items-center gap-2 flex-wrap min-w-0 mb-2">
              {producto.codigo_interno && (
                <span className="text-sm font-mono font-bold px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0">
                  {producto.codigo_interno}
                </span>
              )}
              <span className="text-sm font-bold px-3 py-1 rounded-md bg-slate-700/40 border border-slate-600/50 text-slate-300 shrink-0">
                ID: {producto.id}
              </span>
              <span className="text-sm font-bold px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase shrink-0">
                {producto.tipo_medida}
              </span>
              <span className={`text-sm font-bold px-3 py-1 rounded-md border shrink-0 ${
                producto.stock === 0 ? "text-red-400 border-red-500/30 bg-red-500/10" : 
                producto.stock <= 5 ? "text-orange-400 border-orange-500/30 bg-orange-500/10" : 
                "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              }`}>
                STOCK: {producto.stock}
              </span>
            </div>

            {producto.descripcion && producto.descripcion !== producto.nombre && (
              <p className="text-sm text-slate-400 line-clamp-2">
                {producto.descripcion}
              </p>
            )}
          </div>
        </div>

        {/* Prices - Unified Pill Design */}
        {showPriceType === "all" ? (
          <div className="flex flex-wrap gap-3 mt-2 min-w-0">
            <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-2 rounded-lg border border-white/5 whitespace-nowrap">
              <span className="text-sm text-slate-400 font-medium">Público:</span>
              <span className="text-lg font-black text-emerald-400">${producto.precio_venta.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {(producto.precio_mayoreo ?? 0) > 0 && (
              <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-2 rounded-lg border border-white/5 whitespace-nowrap">
                <span className="text-sm text-slate-400 font-medium">Mayoreo:</span>
                <span className="text-lg font-black text-blue-400">${producto.precio_mayoreo!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            
            {(producto.precio_distribuidor ?? 0) > 0 && (
              <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-2 rounded-lg border border-white/5 whitespace-nowrap">
                <span className="text-sm text-slate-400 font-medium">Dist:</span>
                <span className="text-lg font-black text-purple-400">${producto.precio_distribuidor!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-2 rounded-lg border border-white/5 whitespace-nowrap">
              <span className="text-sm text-slate-400 font-medium">Compra:</span>
              <span className="text-lg font-black text-amber-400">${producto.precio_compra.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {tieneIva && (
                <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold">+IVA</span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-emerald-400 uppercase font-bold tracking-wider mb-1">
              Precio de Venta
            </p>
            <p className="text-3xl font-black text-emerald-400">
              ${producto.precio_venta.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
    );
}
