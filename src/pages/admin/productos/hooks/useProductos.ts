import { useState, useCallback } from "react";
import { api } from "../../../../api/tauri";
import { Producto, ProductoInput } from "../types";
import { EMPTY_FORM } from "../types";
import { StyledSwal as Swal } from "../../../../utils/swal";

interface UseProductosReturn {
    productos: Producto[];
    categorias: import("../../../../api/tauri").Categoria[];
    marcas: string[];
    proveedores: string[];
    loading: boolean;
    cargarDatos: () => Promise<void>;
    handleSave: (
        e: React.FormEvent,
        formData: ProductoInput,
        productoEditando: Producto | null,
        customMarca: boolean,
        nuevaMarca: string,
        customProveedor: boolean,
        nuevoProveedor: string,
        onSuccess: () => void
    ) => Promise<void>;
    handleDelete: (id: number) => Promise<void>;
    saving: boolean;
}

export function useProductos(): UseProductosReturn {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<
        import("../../../../api/tauri").Categoria[]
    >([]);
    const [marcas, setMarcas] = useState<string[]>([]);
    const [proveedores, setProveedores] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const [prodRes, catsRes, marcasRes, provRes] = await Promise.all([
                api.consultarProductos({ limit: 0 }),
                api.obtenerCategorias(),
                api.obtenerMarcas(),
                api.obtenerProveedores(),
            ]);

            if (prodRes.success && prodRes.data) setProductos(prodRes.data);
            if (catsRes.success && catsRes.data) setCategorias(catsRes.data);
            if (marcasRes.success && marcasRes.data) setMarcas(marcasRes.data);
            if (provRes.success && provRes.data) setProveedores(provRes.data);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSave = useCallback(
        async (
            e: React.FormEvent,
            formData: ProductoInput,
            productoEditando: Producto | null,
            customMarca: boolean,
            nuevaMarca: string,
            customProveedor: boolean,
            nuevoProveedor: string,
            onSuccess: () => void
        ) => {
            e.preventDefault();

            if (!formData.nombre.trim()) {
                Swal.fire("Error", "El nombre del producto es obligatorio", "error");
                return;
            }

            setSaving(true);
            Swal.fire({
                title: "Guardando...",
                text: "Por favor espere",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            try {
                const finalMarca = customMarca ? nuevaMarca.toUpperCase() : formData.marca;
                const finalProveedor = customProveedor
                    ? nuevoProveedor.toUpperCase()
                    : formData.proveedor;

                const payload: ProductoInput = {
                    ...formData,
                    marca: finalMarca,
                    proveedor: finalProveedor,
                };

                let res;
                if (productoEditando) {
                    payload.id = productoEditando.id;
                    res = await api.guardarProducto(payload);
                } else {
                    res = await api.ingresarProducto(payload);
                }

                if (res.success) {
                    await cargarDatos();
                    onSuccess();
                    Swal.fire({
                        icon: "success",
                        title: "Éxito",
                        text: productoEditando
                            ? "Producto actualizado correctamente"
                            : "Producto agregado correctamente",
                        timer: 2000,
                        showConfirmButton: false,
                    });
                } else {
                    Swal.fire("Error", res.message || "No se pudo guardar", "error");
                }
            } catch (error) {
                console.error(error);
                Swal.fire("Error", "Error de conexión o de servidor", "error");
            } finally {
                setSaving(false);
            }
        },
        [cargarDatos]
    );

    const handleDelete = useCallback(
        async (id: number) => {
            const result = await Swal.fire({
                title: "¿Estás seguro?",
                text: "Esta acción no se puede deshacer",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                cancelButtonColor: "#3085d6",
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
            });

            if (!result.isConfirmed) return;

            try {
                const res = await api.eliminarProducto(id);
                if (res.success) {
                    Swal.fire("Eliminado", "El producto ha sido eliminado.", "success");
                    cargarDatos();
                } else {
                    Swal.fire("Error", res.message, "error");
                }
            } catch (error) {
                console.error(error);
                Swal.fire("Error", "Ocurrió un error al intentar eliminar", "error");
            }
        },
        [cargarDatos]
    );

    return {
        productos,
        categorias,
        marcas,
        proveedores,
        loading,
        cargarDatos,
        handleSave,
        handleDelete,
        saving,
    };
}

export { EMPTY_FORM };
