import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../../../../api/tauri";
import type { Producto, ConteoFacturable, Categoria } from "../../../../api/tauri";

export type TabFacturable = "todos" | "facturables" | "no_facturables";

export interface CatalogoFiltros {
    tab: TabFacturable;
    categoriaId: number | null;
    marca: string;
    proveedor: string;
    busqueda: string;
    page: number;
}

const PAGE_SIZE = 50;

interface UseCatalogoReturn {
    productos: Producto[];
    loading: boolean;
    total: number;
    totalPages: number;
    page: number;
    conteo: ConteoFacturable | null;
    categorias: Categoria[];
    marcas: string[];
    proveedores: string[];
    filtros: CatalogoFiltros;
    setTab: (tab: TabFacturable) => void;
    setCategoriaId: (id: number | null) => void;
    setMarca: (marca: string) => void;
    setProveedor: (proveedor: string) => void;
    setBusqueda: (q: string) => void;
    setPage: (p: number) => void;
    limpiarFiltros: () => void;
    recargar: () => void;
}

const FILTROS_INICIAL: CatalogoFiltros = {
    tab: "todos",
    categoriaId: null,
    marca: "",
    proveedor: "",
    busqueda: "",
    page: 1,
};

export function useCatalogo(): UseCatalogoReturn {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [conteo, setConteo] = useState<ConteoFacturable | null>(null);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [marcas, setMarcas] = useState<string[]>([]);
    const [proveedores, setProveedores] = useState<string[]>([]);
    const [filtros, setFiltros] = useState<CatalogoFiltros>(FILTROS_INICIAL);

    // Debounce ref para búsqueda
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track si la búsqueda ya está debounceada
    const [debouncedBusqueda, setDebouncedBusqueda] = useState("");

    // Cargar catálogos auxiliares solo una vez
    useEffect(() => {
        Promise.all([
            api.obtenerCategorias(),
            api.obtenerMarcas(),
            api.obtenerProveedores(),
            api.conteoProductosFacturable(),
        ]).then(([cats, mrcs, provs, cnt]) => {
            if (cats.success && cats.data) setCategorias(cats.data);
            if (mrcs.success && mrcs.data) setMarcas(mrcs.data);
            if (provs.success && provs.data) setProveedores(provs.data);
            if (cnt.success && cnt.data) setConteo(cnt.data);
        });
    }, []);

    const setBusqueda = useCallback((q: string) => {
        setFiltros((prev) => ({ ...prev, busqueda: q }));
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setFiltros((prev) => ({ ...prev, page: 1 }));
            setDebouncedBusqueda(q);
        }, 300);
    }, []);

    // Cargar página de productos cuando cambian los filtros
    const cargarProductos = useCallback(async () => {
        setLoading(true);
        try {
            const facturableParam =
                filtros.tab === "facturables"
                    ? true
                    : filtros.tab === "no_facturables"
                    ? false
                    : undefined;

            const res = await api.consultarProductosPaginado({
                facturable: facturableParam,
                categoria_id: filtros.categoriaId ?? undefined,
                marca: filtros.marca || undefined,
                proveedor: filtros.proveedor || undefined,
                busqueda: debouncedBusqueda || undefined,
                page: filtros.page,
                page_size: PAGE_SIZE,
            });

            if (res.success && res.data) {
                setProductos(res.data.productos);
                setTotal(res.data.total);
                setTotalPages(res.data.total_pages);
            } else {
                setProductos([]);
                setTotal(0);
                setTotalPages(1);
            }
        } catch (err) {
            console.error("Error cargando catálogo:", err);
        } finally {
            setLoading(false);
        }
    }, [filtros.tab, filtros.categoriaId, filtros.marca, filtros.proveedor, filtros.page, debouncedBusqueda]);

    useEffect(() => {
        cargarProductos();
    }, [cargarProductos]);

    // --- Setters que resetean la página ---
    const setTab = useCallback((tab: TabFacturable) => {
        setFiltros((prev) => ({ ...prev, tab, page: 1 }));
    }, []);

    const setCategoriaId = useCallback((id: number | null) => {
        setFiltros((prev) => ({ ...prev, categoriaId: id, page: 1 }));
    }, []);

    const setMarca = useCallback((marca: string) => {
        setFiltros((prev) => ({ ...prev, marca, page: 1 }));
    }, []);

    const setProveedor = useCallback((proveedor: string) => {
        setFiltros((prev) => ({ ...prev, proveedor, page: 1 }));
    }, []);

    const setPage = useCallback((p: number) => {
        setFiltros((prev) => ({ ...prev, page: p }));
    }, []);

    const limpiarFiltros = useCallback(() => {
        setFiltros(FILTROS_INICIAL);
        setDebouncedBusqueda("");
    }, []);

    const recargar = useCallback(() => {
        cargarProductos();
        // También recarga conteos
        api.conteoProductosFacturable().then((cnt) => {
            if (cnt.success && cnt.data) setConteo(cnt.data);
        });
    }, [cargarProductos]);

    return {
        productos,
        loading,
        total,
        totalPages,
        page: filtros.page,
        conteo,
        categorias,
        marcas,
        proveedores,
        filtros,
        setTab,
        setCategoriaId,
        setMarca,
        setProveedor,
        setBusqueda,
        setPage,
        limpiarFiltros,
        recargar,
    };
}
