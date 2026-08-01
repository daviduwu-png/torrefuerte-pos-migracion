import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Producto } from "../../../../../api/tauri";

type StockVariant = "critico" | "sin_stock" | "normal";

interface StockBadgeProps {
  stock: number;
}

export const StockBadge = memo(function StockBadge({ stock }: StockBadgeProps) {
  const variant: StockVariant =
    stock === 0 ? "sin_stock" : stock <= 5 ? "critico" : "normal";

  const styles: Record<StockVariant, string> = {
    sin_stock: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    critico: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    normal: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[variant]}`}>
      {stock}
    </span>
  );
});

// Fila memoizada individualmente — solo re-renderiza si cambia el producto o selección
const FilaProducto = memo(function FilaProducto({
  producto,
  seleccionado,
  onToggle,
}: {
  producto: Producto;
  seleccionado: boolean;
  onToggle: (id: number) => void;
}) {
  return (
    <tr
      onClick={() => onToggle(producto.id)}
      className={`border-b border-white/5 transition-colors cursor-pointer ${
        seleccionado
          ? "bg-emerald-500/10 hover:bg-emerald-500/15"
          : "hover:bg-slate-800/40"
      }`}
    >
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(producto.id); }}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
            seleccionado
              ? "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-900/40"
              : "border-slate-600 bg-slate-800/60 hover:border-emerald-500/60"
          }`}
        >
          {seleccionado && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="font-medium text-slate-200">{producto.nombre}</span>
          <span className="text-xs text-slate-500 font-mono mt-0.5">
            {producto.codigo_interno ?? `#${producto.id}`}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-400">{producto.proveedor || "—"}</td>
      <td className="px-4 py-3 text-slate-400">{producto.marca || "—"}</td>
      <td className="px-4 py-3 text-slate-300">${producto.precio_compra.toFixed(2)}</td>
      <td className="px-4 py-3">
        <StockBadge stock={producto.stock} />
      </td>
    </tr>
  );
});

interface ProductosTablaProps {
  /** Todos los productos del tab activo (sin paginar) */
  productos: Producto[];
  loading: boolean;
  seleccionados: Set<number>;
  onToggleSeleccion: (id: number) => void;
  onSelectAll: () => void;
  emptyIcon: React.ReactNode;
  emptyText: string;
  /** Página actual (1-indexed) */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const ProductosTabla = memo(function ProductosTabla({
  productos,
  loading,
  seleccionados,
  onToggleSeleccion,
  onSelectAll,
  emptyIcon,
  emptyText,
  page,
  pageSize,
  onPageChange,
}: ProductosTablaProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
        {emptyIcon}
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }

  // Slicing: solo renderizamos la página actual
  const totalPages = Math.ceil(productos.length / pageSize);
  const inicio = (page - 1) * pageSize;
  const fin = inicio + pageSize;
  const paginaActual = productos.slice(inicio, fin);

  const todosEnPaginaSeleccionados =
    paginaActual.length > 0 && paginaActual.every((p) => seleccionados.has(p.id));

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-slate-900/30 custom-scrollbar relative min-h-0">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 border-b border-white/5 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 w-10">
                <button
                  type="button"
                  onClick={onSelectAll}
                  title="Seleccionar página actual"
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                    todosEnPaginaSeleccionados
                      ? "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-900/40"
                      : "border-slate-600 bg-slate-800/60 hover:border-emerald-500/60"
                  }`}
                >
                  {todosEnPaginaSeleccionados && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">P. Compra</th>
              <th className="px-4 py-3">Stock</th>
            </tr>
          </thead>
          <tbody>
            {paginaActual.map((p) => (
              <FilaProducto
                key={p.id}
                producto={p}
                seleccionado={seleccionados.has(p.id)}
                onToggle={onToggleSeleccion}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-1 shrink-0">
          <p className="text-xs text-slate-500">
            Mostrando {inicio + 1}–{Math.min(fin, productos.length)} de{" "}
            <span className="font-semibold text-slate-400">{productos.length.toLocaleString()}</span> productos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Páginas visibles: max 5 botones */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 2) return true;
                return false;
              })
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                  acc.push("...");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-600 text-xs">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => onPageChange(item as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      page === item
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
