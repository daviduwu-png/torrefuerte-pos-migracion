import {
    Search,
    Edit,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Producto } from "../types";

interface ProductosTableProps {
    productos: Producto[];
    loading: boolean;
    currentPage: number;
    totalPages: number;
    onGoToPage: (p: number) => void;
    onEdit: (producto: Producto) => void;
    onDelete: (id: number) => void;
}

export function ProductosTable({
    productos,
    loading,
    currentPage,
    totalPages,
    onGoToPage,
    onEdit,
    onDelete,
}: ProductosTableProps) {
    return (
        <>
            {/* Table Area */}
            <div className="flex-1 overflow-auto relative">
                {loading && (
                    <div className="absolute inset-0 bg-slate-900/80 z-20 flex flex-col items-center justify-center ">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                        <p className="text-white font-medium">Cargando inventario...</p>
                    </div>
                )}

                <table className="w-full">
                    <thead className="bg-slate-800/80 sticky top-0 z-10 ">
                        <tr>
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase whitespace-nowrap">
                                Código / ID
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase whitespace-nowrap min-w-[200px]">
                                Producto
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase whitespace-nowrap">
                                Marca
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase whitespace-nowrap">
                                Proveed.
                            </th>
                            <th className="text-right py-3 px-4 text-xs font-bold text-slate-400 uppercase whitespace-nowrap">
                                Stock
                            </th>
                            <th className="text-right py-3 px-4 text-xs font-bold text-slate-400 uppercase whitespace-nowrap">
                                Precio
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-bold text-slate-400 uppercase w-20 whitespace-nowrap" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {productos.length > 0 ? (
                            productos.map((prod) => (
                                <tr
                                    key={prod.id}
                                    className="hover:bg-slate-800/40 transition-colors group"
                                >
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-amber-500 font-mono text-sm font-bold">
                                                {prod.codigo_interno || prod.codigo_barras || "S/C"}
                                            </span>
                                            <span className="text-slate-500 text-xs font-mono">
                                                ID:{prod.id}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-white text-sm font-medium">
                                        <div className="line-clamp-2">{prod.nombre}</div>
                                        {prod.descripcion && prod.descripcion !== prod.nombre && (
                                            <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[250px]">
                                                {prod.descripcion}
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-300 text-sm whitespace-nowrap">
                                        <span className="px-2 py-1 rounded bg-slate-800 text-xs">
                                            {prod.marca}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-400 text-sm whitespace-nowrap">
                                        {prod.proveedor}
                                    </td>
                                    <td
                                        className={`py-3 px-4 text-right text-sm font-bold whitespace-nowrap ${prod.stock <= 5 ? "text-red-400" : "text-slate-300"
                                            }`}
                                    >
                                        {prod.stock}
                                    </td>
                                    <td className="py-3 px-4 text-right text-emerald-400 text-sm font-bold whitespace-nowrap">
                                        ${prod.precio_venta.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEdit(prod)}
                                                className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                                                title="Editar"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(prod.id)}
                                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-500">
                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No se encontraron productos con los filtros actuales.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                    Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onGoToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage;
                        if (totalPages > 5) {
                            if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2)
                                pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;
                        } else {
                            pageNum = i + 1;
                        }

                        if (pageNum > totalPages || pageNum < 1) return null;

                        return (
                            <button
                                key={pageNum}
                                onClick={() => onGoToPage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${currentPage === pageNum
                                        ? "bg-amber-500 text-slate-900"
                                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}

                    <button
                        onClick={() => onGoToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </>
    );
}
