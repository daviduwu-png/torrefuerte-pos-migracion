import { useMemo, useState, useCallback, memo } from "react";
import {
    Search, Loader2, ChevronLeft, ChevronRight,
    Package, CheckCircle2, XCircle, LayoutGrid,
    SlidersHorizontal, RefreshCw, X, Save, Undo2, Truck
} from "lucide-react";
import { useCatalogo, TabFacturable } from "./hooks/useCatalogo";
import type { Producto, Categoria } from "../../../api/tauri";
import { api } from "../../../api/tauri";
import { notify } from "../../../utils/sileo";
import { Select } from "../../../components/ui/Select";
import { globalPendingState } from "../../../utils/pendingState";

// ─── Props ────────────────────────────────────────────────────────────────────
interface CatalogoProductosProps {
    onPendingChangesChange?: (count: number) => void;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function TabBtn({
    active, onClick, icon, label, count, colorActive,
}: {
    active: boolean; onClick: () => void; icon: React.ReactNode;
    label: string; count: number; colorActive: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                active
                    ? `${colorActive} border-transparent ring-1 ring-white/10`
                    : "bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
        >
            <div className="flex items-center gap-2">{icon}{label}</div>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"}`}>
                {count.toLocaleString()}
            </span>
        </button>
    );
}

function FiltroCategoria({ categorias, selected, onChange }: {
    categorias: Categoria[]; selected: number | null; onChange: (id: number | null) => void;
}) {
    const options = [
        { value: "", label: "Todas las categorías" },
        ...categorias.map(cat => ({ value: cat.id.toString(), label: cat.nombre }))
    ];

    return (
        <div className="min-h-0">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />Categoría
            </h3>
            <Select 
                value={selected?.toString() || ""}
                onChange={(val) => onChange(val ? Number(val) : null)}
                options={options}
            />
        </div>
    );
}

function FiltroMarca({ marcas, selected, onChange }: {
    marcas: string[]; selected: string; onChange: (m: string) => void;
}) {
    const options = [
        { value: "", label: "Todas las marcas" },
        ...marcas.map(m => ({ value: m, label: m }))
    ];

    return (
        <div className="min-h-0">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 shrink-0" />Marca
            </h3>
            <Select 
                value={selected}
                onChange={onChange}
                options={options}
            />
        </div>
    );
}

function FiltroProveedor({ proveedores, selected, onChange }: {
    proveedores: string[]; selected: string; onChange: (p: string) => void;
}) {
    const options = [
        { value: "", label: "Todos los proveedores" },
        ...proveedores.map(p => ({ value: p, label: p }))
    ];

    return (
        <div className="min-h-0">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 shrink-0" />Proveedor
            </h3>
            <Select 
                value={selected}
                onChange={onChange}
                options={options}
            />
        </div>
    );
}

const ProductoRow = memo(function ProductoRow({
    producto: p, pendingFacturable, onToggleFacturable,
}: {
    producto: Producto;
    pendingFacturable: boolean | undefined;
    onToggleFacturable: (id: number, current: boolean) => void;
}) {
    const currentFacturable = pendingFacturable !== undefined ? pendingFacturable : p.facturable;
    const isDirty = pendingFacturable !== undefined;

    return (
        <tr className={`hover:bg-slate-800/40 transition-colors group ${isDirty ? "bg-violet-500/5" : ""}`}>
            <td className="py-2.5 px-3 whitespace-nowrap">
                <div className="flex flex-col gap-0.5">
                    <span className="text-amber-400 font-mono text-xs font-bold">{p.codigo_interno || p.codigo_barras || "—"}</span>
                    <span className="text-slate-600 text-[10px] font-mono">ID:{p.id}</span>
                </div>
            </td>
            <td className="py-2.5 px-3 text-white text-sm font-medium max-w-[260px]">
                <div className="line-clamp-2 leading-tight">{p.nombre}</div>
                {p.descripcion && p.descripcion !== p.nombre && (
                    <p className="text-slate-500 text-[11px] mt-0.5 truncate">{p.descripcion}</p>
                )}
            </td>
            <td className="py-2.5 px-3 whitespace-nowrap">
                {p.marca
                    ? <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">{p.marca}</span>
                    : <span className="text-slate-600 text-xs">—</span>}
            </td>
            {/* Facturable — toggle interactivo */}
            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                <button
                    onClick={() => onToggleFacturable(p.id, currentFacturable)}
                    title={`Clic para marcar como ${currentFacturable ? "No Facturable" : "Facturable"}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 ${
                        currentFacturable
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                    } ${isDirty ? "ring-2 ring-violet-400/50" : ""}`}
                >
                    {currentFacturable
                        ? <><CheckCircle2 className="w-3 h-3" />Sí</>
                        : <><XCircle className="w-3 h-3" />No</>}
                </button>
                {isDirty && <span className="block text-[9px] text-violet-400/80 mt-0.5">pendiente</span>}
            </td>
            <td className={`py-2.5 px-3 text-right text-sm font-bold whitespace-nowrap ${p.stock <= 0 ? "text-rose-400" : p.stock <= 5 ? "text-amber-400" : "text-slate-300"}`}>
                {p.stock % 1 === 0 ? p.stock.toFixed(0) : p.stock.toFixed(2)}
                <span className="text-slate-600 font-normal text-[10px] ml-1">{p.tipo_medida}</span>
            </td>
        </tr>
    );
});

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CatalogoProductos({ onPendingChangesChange }: CatalogoProductosProps) {
    const {
        productos, loading, total, totalPages, page, conteo,
        categorias, marcas, proveedores, filtros,
        setTab, setCategoriaId, setMarca, setProveedor, setBusqueda, setPage,
        limpiarFiltros, recargar,
    } = useCatalogo();

    // ── Cambios pendientes de facturable ──────────────────────────────────────
    const [pendingChanges, setPendingChanges] = useState<Map<number, boolean>>(new Map());
    const [applying, setApplying] = useState(false);

    const notifyPending = useCallback((map: Map<number, boolean>) => {
        onPendingChangesChange?.(map.size);
        globalPendingState.count = map.size;
    }, [onPendingChangesChange]);

    const toggleFacturable = useCallback((id: number, current: boolean) => {
        setPendingChanges((prev) => {
            const next = new Map(prev);
            const original = productos.find((p) => p.id === id)?.facturable;
            const newVal = !current;
            if (newVal === original) {
                next.delete(id);
            } else {
                next.set(id, newVal);
            }
            notifyPending(next);
            return next;
        });
    }, [productos, notifyPending]);

    const descartarCambios = useCallback(() => {
        setPendingChanges(new Map());
        onPendingChangesChange?.(0);
        globalPendingState.count = 0;
    }, [onPendingChangesChange]);

    // Registrar globalPendingState.discard
    useMemo(() => {
        globalPendingState.discard = descartarCambios;
    }, [descartarCambios]);

    const handleSetTab = useCallback((tab: TabFacturable) => {
        setTab(tab);
    }, [setTab]);

    const handleSetCategoria = useCallback((id: number | null) => {
        setCategoriaId(id);
    }, [setCategoriaId]);

    const handleSetMarca = useCallback((m: string) => {
        setMarca(m);
    }, [setMarca]);

    const handleSetProveedor = useCallback((p: string) => {
        setProveedor(p);
    }, [setProveedor]);

    const handleLimpiarFiltros = useCallback(() => {
        limpiarFiltros();
    }, [limpiarFiltros]);
    
    const handleSetPage = useCallback((p: number) => {
        setPage(p);
    }, [setPage]);

    // Aplicar cambios
    const aplicarCambios = useCallback(async () => {
        if (pendingChanges.size === 0) return;
        setApplying(true);
        try {
            const cambios = Array.from(pendingChanges.entries()).map(([id, facturable]) => ({ id, facturable }));
            const res = await api.actualizarFacturableProducto(cambios);
            if (res.success) {
                notify.success({ title: "Cambios aplicados", description: `${res.data ?? cambios.length} producto(s) actualizados.`, duration: 3000 });
                setPendingChanges(new Map());
                onPendingChangesChange?.(0);
                recargar();
            } else {
                notify.error({ title: "Error", description: res.message || "No se pudieron aplicar los cambios", duration: 5000 });
            }
        } catch {
            notify.error({ title: "Error", description: "Error de conexión al aplicar cambios", duration: 5000 });
        } finally {
            setApplying(false);
        }
    }, [pendingChanges, recargar, onPendingChangesChange]);

    // ── Tabs config ───────────────────────────────────────────────────────────
    const tabsConfig = useMemo(() => [
        { key: "todos" as TabFacturable, label: "Todos", icon: <LayoutGrid className="w-3.5 h-3.5" />, count: conteo?.total ?? 0, colorActive: "bg-indigo-600 text-white" },
        { key: "facturables" as TabFacturable, label: "Facturables", icon: <CheckCircle2 className="w-3.5 h-3.5" />, count: conteo?.facturables ?? 0, colorActive: "bg-emerald-600 text-white" },
        { key: "no_facturables" as TabFacturable, label: "No Facturables", icon: <XCircle className="w-3.5 h-3.5" />, count: conteo?.no_facturables ?? 0, colorActive: "bg-rose-600 text-white" },
    ], [conteo]);

    const hayFiltros = filtros.tab !== "todos" || filtros.categoriaId !== null || filtros.marca !== "" || filtros.proveedor !== "" || filtros.busqueda !== "";

    const pageButtons = useMemo(() => {
        const t = Math.max(1, totalPages);
        const start = Math.max(1, Math.min(page - 2, t - 4));
        const end = Math.min(t, start + 4);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, [page, totalPages]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex gap-4 flex-1 min-h-0 animate-in fade-in duration-300">

            {/* ── Sidebar ── */}
            <div className="glass-panel rounded-2xl shadow-lg border border-white/10 shrink-0 w-60 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-h-0">

                    {/* Estado */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />Estado
                        </h3>
                        <div className="flex flex-col gap-1.5">
                            {tabsConfig.map((t) => (
                                <TabBtn
                                    key={t.key}
                                    active={filtros.tab === t.key}
                                    onClick={() => handleSetTab(t.key)}
                                    icon={t.icon}
                                    label={t.label}
                                    count={t.count}
                                    colorActive={t.colorActive}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-white/5" />

                    <FiltroCategoria categorias={categorias} selected={filtros.categoriaId} onChange={handleSetCategoria} />

                    <div className="border-t border-white/5" />

                    <FiltroMarca marcas={marcas} selected={filtros.marca} onChange={handleSetMarca} />

                    <div className="border-t border-white/5" />

                    <FiltroProveedor proveedores={proveedores} selected={filtros.proveedor} onChange={handleSetProveedor} />

                    {/* Acciones */}
                    <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-white/5">
                        {hayFiltros && (
                            <button onClick={handleLimpiarFiltros} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all">
                                <X className="w-3.5 h-3.5" />Limpiar filtros
                            </button>
                        )}
                        <button onClick={recargar} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-white/10 rounded-xl transition-all">
                            <RefreshCw className="w-3.5 h-3.5" />Recargar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Contenido ── */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 glass-panel rounded-2xl border border-white/10 overflow-hidden">

                {/* Toolbar */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate-900/40 shrink-0 flex-wrap">
                    {/* Búsqueda */}
                    <div className="relative group flex-1 min-w-40 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar nombre, código..."
                            value={filtros.busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                            }}
                            className="w-full pl-9 pr-8 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all"
                        />
                        {filtros.busqueda && (
                            <button onClick={() => {
                                setBusqueda("");
                            }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Cambios pendientes */}
                    {pendingChanges.size > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-xl animate-in slide-in-from-right-4 duration-300">
                            <span className="text-violet-300 text-xs font-bold">{pendingChanges.size} cambio{pendingChanges.size > 1 ? "s" : ""} pendiente{pendingChanges.size > 1 ? "s" : ""}</span>
                            <button
                                onClick={aplicarCambios}
                                disabled={applying}
                                className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-60 shadow-sm shadow-violet-900/20"
                            >
                                {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Aplicar
                            </button>
                            <button onClick={descartarCambios} className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-violet-400/70 hover:text-violet-300 rounded-lg transition-colors">
                                <Undo2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* Info */}
                    <div className="text-xs text-slate-500 shrink-0 ml-auto">
                        <span className="text-white font-bold">{total.toLocaleString()}</span> productos
                        {hayFiltros && <span className="text-indigo-400 ml-1">(filtrados)</span>}
                    </div>
                </div>

                {/* Tabla */}
                <div className="flex-1 overflow-auto relative">
                    {loading && (
                        <div className="absolute inset-0 bg-slate-900/70 z-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            <p className="text-slate-400 text-sm">Cargando catálogo...</p>
                        </div>
                    )}
                    <table className="w-full">
                        <thead className="bg-slate-800/80 sticky top-0 z-10 shadow-md">
                            <tr>
                                {["Código", "Producto", "Marca", "Facturable", "Stock"].map((h, i) => (
                                    <th key={h} className={`py-3 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${i >= 3 ? "text-center" : "text-left"} ${i >= 4 ? "text-right" : ""}`}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {productos.length > 0 ? (
                                productos.map((p) => (
                                    <ProductoRow
                                        key={p.id}
                                        producto={p}
                                        pendingFacturable={pendingChanges.get(p.id)}
                                        onToggleFacturable={toggleFacturable}
                                    />
                                ))
                            ) : !loading ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center">
                                        <Search className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                                        <p className="text-slate-500 text-sm">No se encontraron productos.</p>
                                        {hayFiltros && (
                                            <button onClick={handleLimpiarFiltros} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline">
                                                Limpiar filtros
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-slate-900/40">
                    <p className="text-xs text-slate-500">
                        Página <span className="text-white font-bold">{page}</span> de <span className="text-white font-bold">{Math.max(1, totalPages)}</span>
                        <span className="ml-2 text-slate-600">({Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} de {total.toLocaleString()})</span>
                    </p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => handleSetPage(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {pageButtons.map((n) => (
                            <button key={n} onClick={() => handleSetPage(n)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-indigo-600 text-white" : "bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-white"}`}>
                                {n}
                            </button>
                        ))}
                        <button onClick={() => handleSetPage(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
