import { useState } from "react";
import { Box, X, Check, Loader2 } from "lucide-react";
import { Categoria } from "../../../../api/tauri";
import { Producto, ProductoInput } from "../types";
import { ProductoForm } from "./ProductoForm";

interface ProductoModalProps {
    open: boolean;
    productoEditando: Producto | null;
    formData: ProductoInput;
    saving: boolean;
    categorias: Categoria[];
    marcas: string[];
    proveedores: string[];
    onClose: () => void;
    onFormChange: (updated: ProductoInput) => void;
    onSave: (
        e: React.FormEvent,
        formData: ProductoInput,
        productoEditando: Producto | null,
        customMarca: boolean,
        nuevaMarca: string,
        customProveedor: boolean,
        nuevoProveedor: string,
        onSuccess: () => void
    ) => Promise<void>;
}

export function ProductoModal({
    open,
    productoEditando,
    formData,
    saving,
    categorias,
    marcas,
    proveedores,
    onClose,
    onFormChange,
    onSave,
}: ProductoModalProps) {
    const [customMarca, setCustomMarca] = useState(false);
    const [customProveedor, setCustomProveedor] = useState(false);
    const [nuevaMarca, setNuevaMarca] = useState("");
    const [nuevoProveedor, setNuevoProveedor] = useState("");

    if (!open) return null;

    const handleClose = () => {
        setCustomMarca(false);
        setCustomProveedor(false);
        setNuevaMarca("");
        setNuevoProveedor("");
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) =>
        onSave(
            e,
            formData,
            productoEditando,
            customMarca,
            nuevaMarca,
            customProveedor,
            nuevoProveedor,
            handleClose
        );

    return (
        <div
            onClick={handleClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Box className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {productoEditando ? "Editar Producto" : "Nuevo Producto"}
                            </h2>
                            <p className="text-slate-400 text-xs">
                                Información del inventario
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/50">
                    <form id="productForm" onSubmit={handleSubmit}>
                        <ProductoForm
                            formData={formData}
                            onChange={onFormChange}
                            categorias={categorias}
                            marcas={marcas}
                            proveedores={proveedores}
                            customMarca={customMarca}
                            customProveedor={customProveedor}
                            nuevaMarca={nuevaMarca}
                            nuevoProveedor={nuevoProveedor}
                            onToggleCustomMarca={() => setCustomMarca((v) => !v)}
                            onToggleCustomProveedor={() => setCustomProveedor((v) => !v)}
                            onNuevaMarcaChange={setNuevaMarca}
                            onNuevoProveedorChange={setNuevoProveedor}
                        />
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="productForm"
                        disabled={saving}
                        className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Check className="w-5 h-5" />
                        )}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
