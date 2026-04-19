import { useState, useMemo } from "react";
import { Producto } from "../types";

const ITEMS_PER_PAGE = 20;

interface UseProductosFiltrosReturn {
    busqueda: string;
    setBusqueda: (v: string) => void;
    filtrosMarcas: string[];
    filtrosProveedores: string[];
    busquedaMarca: string;
    setBusquedaMarca: (v: string) => void;
    busquedaProveedor: string;
    setBusquedaProveedor: (v: string) => void;
    toggleMarca: (marca: string) => void;
    toggleProveedor: (prov: string) => void;
    limpiarFiltros: () => void;
    currentPage: number;
    setCurrentPage: (p: number) => void;
    goToPage: (p: number) => void;
    totalPages: number;
    filteredProductos: Producto[];
    currentProductos: Producto[];
}

export function useProductosFiltros(
    productos: Producto[]
): UseProductosFiltrosReturn {
    const [busqueda, setBusquedaRaw] = useState("");
    const [filtrosMarcas, setFiltrosMarcas] = useState<string[]>([]);
    const [filtrosProveedores, setFiltrosProveedores] = useState<string[]>([]);
    const [busquedaMarca, setBusquedaMarca] = useState("");
    const [busquedaProveedor, setBusquedaProveedor] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const setBusqueda = (v: string) => {
        setBusquedaRaw(v);
        setCurrentPage(1);
    };

    const toggleMarca = (marca: string) => {
        setFiltrosMarcas((prev) =>
            prev.includes(marca) ? prev.filter((m) => m !== marca) : [...prev, marca]
        );
        setCurrentPage(1);
    };

    const toggleProveedor = (prov: string) => {
        setFiltrosProveedores((prev) =>
            prev.includes(prov) ? prev.filter((p) => p !== prov) : [...prev, prov]
        );
        setCurrentPage(1);
    };

    const limpiarFiltros = () => {
        setFiltrosMarcas([]);
        setFiltrosProveedores([]);
        setBusquedaRaw("");
        setCurrentPage(1);
    };

    const filteredProductos = useMemo(() => {
        const normalize = (str: string) =>
            str
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

        const searchNormalized = normalize(busqueda.trim());

        const baseFilter = productos.filter((p) => {
            const matchesMarca =
                filtrosMarcas.length === 0 ||
                (p.marca && filtrosMarcas.includes(p.marca));
            const matchesProveedor =
                filtrosProveedores.length === 0 ||
                (p.proveedor && filtrosProveedores.includes(p.proveedor));
            return matchesMarca && matchesProveedor;
        });

        if (!searchNormalized) return baseFilter;

        const tokens = searchNormalized.split(/\s+/).filter(Boolean);

        return baseFilter
            .map((p) => {
                const barrasNorm = normalize(p.codigo_barras ?? "");
                const internoNorm = normalize(p.codigo_interno ?? "");
                const nombreNorm = normalize(p.nombre);

                if (barrasNorm && barrasNorm === searchNormalized)
                    return { p, score: 20000 };
                if (internoNorm && internoNorm === searchNormalized)
                    return { p, score: 10000 };

                let score = 0;
                if (barrasNorm && barrasNorm.includes(searchNormalized)) score += 5000;
                if (internoNorm && internoNorm.includes(searchNormalized)) score += 2000;

                const todasEnNombre = tokens.every((t) => nombreNorm.includes(t));
                if (todasEnNombre) score += 1;

                return { p, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((item) => item.p);
    }, [productos, busqueda, filtrosMarcas, filtrosProveedores]);

    const totalPages = Math.ceil(filteredProductos.length / ITEMS_PER_PAGE);

    const currentProductos = filteredProductos.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    return {
        busqueda,
        setBusqueda,
        filtrosMarcas,
        filtrosProveedores,
        busquedaMarca,
        setBusquedaMarca,
        busquedaProveedor,
        setBusquedaProveedor,
        toggleMarca,
        toggleProveedor,
        limpiarFiltros,
        currentPage,
        setCurrentPage,
        goToPage,
        totalPages,
        filteredProductos,
        currentProductos,
    };
}
