import { Categoria } from "../../../../api/tauri";
import { ProductoInput } from "../types";
import { UNIDADES_MEDIDA } from "../types";
import { ChevronDown } from "lucide-react";

interface ProductoFormProps {
    formData: ProductoInput;
    onChange: (updated: ProductoInput) => void;
    categorias: Categoria[];
    marcas: string[];
    proveedores: string[];
    customMarca: boolean;
    customProveedor: boolean;
    nuevaMarca: string;
    nuevoProveedor: string;
    onToggleCustomMarca: () => void;
    onToggleCustomProveedor: () => void;
    onNuevaMarcaChange: (v: string) => void;
    onNuevoProveedorChange: (v: string) => void;
}

const inputCls =
    "w-full bg-blue-500/10 border border-blue-500/50 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:border-blue-400 outline-none transition-colors";

const PriceInput = ({
    label,
    value,
    onChange,
    required = false,
    highlight = false,
}: {
    label: string;
    value: number | undefined;
    onChange: (v: number) => void;
    required?: boolean;
    highlight?: boolean;
}) => (
    <div className="space-y-1">
        <label
            className={`text-xs font-bold uppercase ${highlight ? "text-emerald-500" : "text-slate-500"
                }`}
        >
            {label}
        </label>
        <div className="relative">
            <span
                className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${highlight ? "text-emerald-500" : "text-slate-500"
                    }`}
            >
                $
            </span>
            <input
                type="number"
                step="0.01"
                required={required}
                value={!value || value === 0 ? "" : value}
                onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                className={`w-full rounded-lg pl-7 pr-3 py-2 outline-none transition-colors ${highlight
                    ? "bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 font-bold focus:border-emerald-400"
                    : "bg-blue-500/10 border border-blue-500/50 text-white focus:border-emerald-400"
                    }`}
            />
        </div>
    </div>
);

export function ProductoForm({
    formData,
    onChange,
    categorias,
    marcas,
    proveedores,
    customMarca,
    customProveedor,
    nuevaMarca,
    nuevoProveedor,
    onToggleCustomMarca,
    onToggleCustomProveedor,
    onNuevaMarcaChange,
    onNuevoProveedorChange,
}: ProductoFormProps) {
    const set = (partial: Partial<ProductoInput>) =>
        onChange({ ...formData, ...partial });

    return (
        <div className="space-y-6">
            {/* Section 1: Información Principal */}
            <div>
                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Información Principal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Nombre */}
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                            Nombre del Producto <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => set({ nombre: e.target.value })}
                            className={inputCls + " font-bold"}
                        />
                    </div>

                    {/* Código Barras */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                            Código Barras
                        </label>
                        <input
                            type="text"
                            value={formData.codigo_barras || ""}
                            onChange={(e) => set({ codigo_barras: e.target.value })}
                            className={inputCls}
                        />
                    </div>

                    {/* Código Interno */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                            Código Interno/Clave
                        </label>
                        <input
                            type="text"
                            value={formData.codigo_interno || ""}
                            onChange={(e) => set({ codigo_interno: e.target.value })}
                            className={inputCls}
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: Clasificación */}
            <div>
                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Clasificación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 items-start">
                    {/* Categoría */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase h-5 flex items-center">
                            Categoría
                        </label>
                        <div className="relative">
                            <select
                                value={formData.categoria_id}
                                onChange={(e) => set({ categoria_id: Number(e.target.value) })}
                                className={inputCls + " appearance-none cursor-pointer pr-10"}
                            >
                                {categorias.map((c) => (
                                    <option key={c.id} value={c.id} className="bg-slate-900">
                                        {c.nombre}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Marca */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase h-5 flex items-center justify-between">
                            Marca
                            <button
                                type="button"
                                onClick={onToggleCustomMarca}
                                className="text-blue-500 hover:text-blue-400 text-xs font-bold underline"
                            >
                                {customMarca ? "Seleccionar Existente" : "+ Nueva"}
                            </button>
                        </label>
                        {customMarca ? (
                            <input
                                type="text"
                                placeholder="NUEVA MARCA"
                                value={nuevaMarca}
                                onChange={(e) => onNuevaMarcaChange(e.target.value.toUpperCase())}
                                className="w-full bg-blue-500/10 border border-blue-500/50 rounded-lg px-3 py-2 text-white focus:border-blue-400 outline-none transition-colors"
                            />
                        ) : (
                            <div className="relative">
                                <select
                                    value={formData.marca || ""}
                                    onChange={(e) => set({ marca: e.target.value })}
                                    className={inputCls + " appearance-none cursor-pointer pr-10"}
                                >
                                    <option value="" className="bg-slate-900">-- Seleccionar --</option>
                                    {marcas.map((m) => (
                                        <option key={m} value={m} className="bg-slate-900">
                                            {m}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Proveedor */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase h-5 flex items-center justify-between">
                            Proveedor
                            <button
                                type="button"
                                onClick={onToggleCustomProveedor}
                                className="text-blue-500 hover:text-blue-400 text-xs font-bold underline"
                            >
                                {customProveedor ? "Seleccionar Existente" : "+ Nuevo"}
                            </button>
                        </label>
                        {customProveedor ? (
                            <input
                                type="text"
                                placeholder="NUEVO PROVEEDOR"
                                value={nuevoProveedor}
                                onChange={(e) =>
                                    onNuevoProveedorChange(e.target.value.toUpperCase())
                                }
                                className="w-full bg-blue-500/10 border border-blue-500/50 rounded-lg px-3 py-2 text-white focus:border-blue-400 outline-none transition-colors"
                            />
                        ) : (
                            <div className="relative">
                                <select
                                    value={formData.proveedor || ""}
                                    onChange={(e) => set({ proveedor: e.target.value })}
                                    className={inputCls + " appearance-none cursor-pointer pr-10"}
                                >
                                    <option value="" className="bg-slate-900">-- Seleccionar --</option>
                                    {proveedores.map((p) => (
                                        <option key={p} value={p} className="bg-slate-900">
                                            {p}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Unidad Medida */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase h-5 flex items-center">
                            Unidad Medida
                        </label>
                        <div className="relative">
                            <select
                                value={formData.tipo_medida}
                                onChange={(e) => set({ tipo_medida: e.target.value })}
                                className={inputCls + " appearance-none cursor-pointer pr-10"}
                            >
                                {UNIDADES_MEDIDA.map((u) => (
                                    <option key={u} value={u} className="bg-slate-900">
                                        {u}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="col-span-1 md:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                            Descripción Detallada
                        </label>
                        <textarea
                            value={formData.descripcion || ""}
                            onChange={(e) => set({ descripcion: e.target.value })}
                            rows={2}
                            className="w-full bg-blue-500/10 border border-blue-500/50 rounded-lg px-3 py-2 text-white focus:border-blue-400 outline-none resize-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Section 3: Precios e Inventario */}
            <div>
                <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Precios e Inventario
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                    <PriceInput
                        label="Precio Compra"
                        value={formData.precio_compra}
                        onChange={(v) => set({ precio_compra: v })}
                    />
                    <PriceInput
                        label="Precio Venta"
                        value={formData.precio_venta}
                        onChange={(v) => set({ precio_venta: v })}
                        required
                        highlight
                    />
                    <PriceInput
                        label="Precio Mayoreo"
                        value={formData.precio_mayoreo}
                        onChange={(v) => set({ precio_mayoreo: v })}
                    />

                    {/* Stock */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                            Stock Actual
                        </label>
                        <input
                            type="number"
                            value={formData.stock === 0 ? "" : formData.stock}
                            onChange={(e) =>
                                set({ stock: e.target.value === "" ? 0 : Number(e.target.value) })
                            }
                            className={inputCls + " font-bold"}
                        />
                    </div>

                    {/* Facturable */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                            Facturable
                        </label>
                        <div className="relative">
                            <select
                                value={formData.facturable ? "true" : "false"}
                                onChange={(e) => set({ facturable: e.target.value === "true" })}
                                className={inputCls + " appearance-none cursor-pointer pr-10"}
                            >
                                <option value="true" className="bg-slate-900">Sí</option>
                                <option value="false" className="bg-slate-900">No</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
