import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Box,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  XOctagon,
} from "lucide-react";
import { api, Producto, ProductoInput, Categoria } from "../../api/tauri";
import { StyledSwal as Swal } from "../../utils/swal";

export default function Productos() {
  // Data State
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [busqueda, setBusqueda] = useState("");
  const [filtrosMarcas, setFiltrosMarcas] = useState<string[]>([]);
  const [filtrosProveedores, setFiltrosProveedores] = useState<string[]>([]);
  const [busquedaMarca, setBusquedaMarca] = useState("");
  const [busquedaProveedor, setBusquedaProveedor] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ProductoInput>({
    nombre: "",
    tipo_medida: "UNIDAD",
    categoria_id: 1,
    precio_compra: 0,
    precio_venta: 0,
    facturable: true,
    stock: 0,
  });

  // Custom Input State for Edit Form
  const [customMarca, setCustomMarca] = useState(false);
  const [customProveedor, setCustomProveedor] = useState(false);
  const [nuevaMarca, setNuevaMarca] = useState("");
  const [nuevoProveedor, setNuevoProveedor] = useState("");

  // Load Initial Data
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Parallel requests
      const [prodRes, catsRes, marcasRes, provRes] = await Promise.all([
        api.consultarProductos({ limit: 0 }), // Load ALL products (0 = no limit)
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
  };

  // Filter Logic
  const filteredProductos = useMemo(() => {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const searchNormalized = normalize(busqueda);

    // 1. Filtros básicos (Marca y Proveedor)
    const baseFilter = productos.filter((p) => {
      const matchesMarca =
        filtrosMarcas.length === 0 ||
        (p.marca && filtrosMarcas.includes(p.marca));

      const matchesProveedor =
        filtrosProveedores.length === 0 ||
        (p.proveedor && filtrosProveedores.includes(p.proveedor));

      return matchesMarca && matchesProveedor;
    });

    // 2. Si no hay búsqueda, retornar filtro base
    if (!searchNormalized) return baseFilter;

    // 3. Búsqueda con Prioridad:
    // 1°. Código Barras, 2°. Código Interno, 3°. ID, 4°. Nombre
    return baseFilter
      .map((p) => {
        let score = 0;
        const nombreNorm = normalize(p.nombre);
        const barrasNorm = p.codigo_barras ? normalize(p.codigo_barras) : "";
        const internoNorm = p.codigo_interno ? normalize(p.codigo_interno) : "";
        const idStr = p.id.toString();

        if (barrasNorm.includes(searchNormalized)) score += 10000;
        if (internoNorm.includes(searchNormalized)) score += 1000;
        if (idStr.includes(searchNormalized)) score += 100;
        if (nombreNorm.includes(searchNormalized)) score += 1;

        return { p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.p);
  }, [productos, busqueda, filtrosMarcas, filtrosProveedores]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
  const currentProductos = filteredProductos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Pagination Controls
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Filter Checkbox Handlers
  const toggleMarca = (marca: string) => {
    setFiltrosMarcas((prev) =>
      prev.includes(marca) ? prev.filter((m) => m !== marca) : [...prev, marca],
    );
    setCurrentPage(1);
  };

  const toggleProveedor = (prov: string) => {
    setFiltrosProveedores((prev) =>
      prev.includes(prov) ? prev.filter((p) => p !== prov) : [...prev, prov],
    );
    setCurrentPage(1);
  };

  // Modal Handlers
  const openEditModal = (producto: Producto) => {
    setProductoEditando(producto);
    setFormData({
      id: producto.id,
      codigo_barras: producto.codigo_barras,
      codigo_interno: producto.codigo_interno,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      marca: producto.marca,
      proveedor: producto.proveedor,
      tipo_medida: producto.tipo_medida,
      categoria_id: producto.categoria_id,
      precio_compra: producto.precio_compra,
      precio_venta: producto.precio_venta,
      precio_mayoreo: producto.precio_mayoreo,
      precio_distribuidor: producto.precio_distribuidor,
      facturable: producto.facturable,
      stock: producto.stock,
    });
    setCustomMarca(false);
    setCustomProveedor(false);
    setNuevaMarca("");
    setNuevoProveedor("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setProductoEditando(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      Swal.fire("Error", "El nombre del producto es obligatorio", "error");
      return;
    }

    setSaving(true);
    // Show loading
    Swal.fire({
      title: "Guardando...",
      text: "Por favor espere",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const finalMarca = customMarca
        ? nuevaMarca.toUpperCase()
        : formData.marca;
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
        closeModal();
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
  };

  const handleDelete = async (id: number) => {
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
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Sidebar Filters */}
        <div className="w-64 bg-slate-900 rounded-xl border border-slate-800 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900 z-10">
            <h6 className="font-bold text-slate-300 text-xs uppercase flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Filtros
            </h6>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {/* Marcas */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block px-2">
                Marcas
              </label>
              <div className="px-2 mb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-md py-1 pl-7 pr-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    value={busquedaMarca}
                    onChange={(e) => setBusquedaMarca(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto px-2">
                {marcas
                  .filter((m) =>
                    m.toLowerCase().includes(busquedaMarca.toLowerCase()),
                  )
                  .map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 text-sm text-slate-300 hover:text-white cursor-pointer select-none py-1"
                    >
                      <input
                        type="checkbox"
                        checked={filtrosMarcas.includes(m)}
                        onChange={() => toggleMarca(m)}
                        className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                      />
                      <span className="truncate">{m}</span>
                    </label>
                  ))}
              </div>
            </div>

            {/* Proveedores */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block px-2">
                Proveedores
              </label>
              <div className="px-2 mb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-md py-1 pl-7 pr-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    value={busquedaProveedor}
                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto px-2">
                {proveedores
                  .filter((p) =>
                    p.toLowerCase().includes(busquedaProveedor.toLowerCase()),
                  )
                  .map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 text-sm text-slate-300 hover:text-white cursor-pointer select-none py-1"
                    >
                      <input
                        type="checkbox"
                        checked={filtrosProveedores.includes(p)}
                        onChange={() => toggleProveedor(p)}
                        className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                      />
                      <span className="truncate">{p}</span>
                    </label>
                  ))}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-800 bg-slate-900">
            <button
              onClick={() => {
                setFiltrosMarcas([]);
                setFiltrosProveedores([]);
                setBusqueda("");
                setCurrentPage(1);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-red-400 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors"
            >
              <XOctagon className="w-4 h-4" /> Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-800 flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o clave..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="hidden lg:block">
              <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 flex items-center gap-3 backdrop-blur-sm">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Box className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-xl font-bold text-white leading-none">
                    {filteredProductos.length}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mt-1">
                    Total Productos
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setProductoEditando(null);
                setFormData({
                  nombre: "",
                  tipo_medida: "UNIDAD",
                  categoria_id: 1,
                  precio_compra: 0,
                  precio_venta: 0,
                  facturable: true,
                  stock: 0,
                });
                setModalOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" /> Nuevo
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-slate-900/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-white font-medium">Cargando inventario...</p>
              </div>
            )}

            <table className="w-full">
              <thead className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase">
                    Código / ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase">
                    Producto
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase">
                    Marca
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase">
                    Proveed.
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-400 uppercase">
                    Stock
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-400 uppercase">
                    Precio
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-slate-400 uppercase w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {currentProductos.length > 0 ? (
                  currentProductos.map((prod) => (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
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
                        {prod.nombre}
                        {prod.descripcion &&
                          prod.descripcion !== prod.nombre && (
                            <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[300px]">
                              {prod.descripcion}
                            </p>
                          )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">
                        <span className="px-2 py-1 rounded bg-slate-800 text-xs">
                          {prod.marca}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {prod.proveedor}
                      </td>
                      <td
                        className={`py-3 px-4 text-right text-sm font-bold ${prod.stock <= 5 ? "text-red-400" : "text-slate-300"}`}
                      >
                        {prod.stock}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 text-sm font-bold">
                        ${prod.precio_venta.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id)}
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
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-500"
                    >
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>
                        No se encontraron productos con los filtros actuales.
                      </p>
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
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Generar botones de paginación lógica simple */}
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
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      currentPage === pageNum
                        ? "bg-amber-500 text-slate-900"
                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDICIÓN */}
      {/* MODAL EDICIÓN */}
      {modalOpen && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
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
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 dark:bg-slate-900">
              <form
                id="productForm"
                onSubmit={handleSave}
                className="space-y-6"
              >
                {/* Section 1: Main Info */}
                <div>
                  <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Información Principal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    {/* Row 1: Nombre */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Nombre del Producto{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={(e) =>
                          setFormData({ ...formData, nombre: e.target.value })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>

                    {/* Row 2: Códigos */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Código Barras
                      </label>
                      <input
                        type="text"
                        value={formData.codigo_barras || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            codigo_barras: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Código Interno/Clave
                      </label>
                      <input
                        type="text"
                        value={formData.codigo_interno || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            codigo_interno: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Classification */}
                <div>
                  <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Clasificación
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase h-5 flex items-center">
                        Categoría
                      </label>
                      <select
                        value={formData.categoria_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            categoria_id: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none cursor-pointer transition-colors"
                      >
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Marca con Toggle */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase h-5 flex items-center justify-between">
                        Marca
                        <button
                          type="button"
                          onClick={() => setCustomMarca(!customMarca)}
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
                          onChange={(e) =>
                            setNuevaMarca(e.target.value.toUpperCase())
                          }
                          className="w-full bg-blue-500/10 border border-blue-500/50 rounded-lg px-3 py-2 text-white focus:border-blue-400 outline-none transition-colors"
                        />
                      ) : (
                        <select
                          value={formData.marca || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, marca: e.target.value })
                          }
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none cursor-pointer transition-colors"
                        >
                          <option value="">-- Seleccionar --</option>
                          {marcas.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Proveedor con Toggle */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase h-5 flex items-center justify-between">
                        Proveedor
                        <button
                          type="button"
                          onClick={() => setCustomProveedor(!customProveedor)}
                          className="text-blue-500 hover:text-blue-400 text-xs font-bold underline"
                        >
                          {customProveedor
                            ? "Seleccionar Existente"
                            : "+ Nuevo"}
                        </button>
                      </label>
                      {customProveedor ? (
                        <input
                          type="text"
                          placeholder="NUEVO PROVEEDOR"
                          value={nuevoProveedor}
                          onChange={(e) =>
                            setNuevoProveedor(e.target.value.toUpperCase())
                          }
                          className="w-full bg-blue-500/10 border border-blue-500/50 rounded-lg px-3 py-2 text-white focus:border-blue-400 outline-none transition-colors"
                        />
                      ) : (
                        <select
                          value={formData.proveedor || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              proveedor: e.target.value,
                            })
                          }
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none cursor-pointer transition-colors"
                        >
                          <option value="">-- Seleccionar --</option>
                          {proveedores.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase h-5 flex items-center">
                        Unidad Medida
                      </label>
                      <select
                        value={formData.tipo_medida}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tipo_medida: e.target.value,
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none cursor-pointer transition-colors"
                      >
                        {[
                          "UNIDAD",
                          "METRO",
                          "KILO",
                          "ROLLO",
                          "JUEGO",
                          "SET",
                          "LITRO",
                          "GALON",
                          "CAJA",
                          "TRAMO",
                        ].map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Descripción Detallada
                      </label>
                      <textarea
                        value={formData.descripcion || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            descripcion: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none resize-none transition-colors"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Section 3: Prices & Inventory */}
                <div>
                  <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                    Precios e Inventario
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Precio Compra
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={
                            formData.precio_compra === 0
                              ? ""
                              : formData.precio_compra
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              precio_compra:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-500 uppercase">
                        Precio Venta
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={
                            formData.precio_venta === 0
                              ? ""
                              : formData.precio_venta
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              precio_venta:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                          className="w-full bg-emerald-500/10 border border-emerald-500/50 rounded-lg pl-7 pr-3 py-2 text-emerald-400 font-bold focus:border-emerald-400 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Precio Mayoreo
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={
                            !formData.precio_mayoreo ||
                            formData.precio_mayoreo === 0
                              ? ""
                              : formData.precio_mayoreo
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              precio_mayoreo:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Stock Actual
                      </label>
                      <input
                        type="number"
                        value={formData.stock === 0 ? "" : formData.stock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            stock:
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Facturable
                      </label>
                      <select
                        value={formData.facturable ? "true" : "false"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            facturable: e.target.value === "true",
                          })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 outline-none cursor-pointer transition-colors"
                      >
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeModal}
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
      )}
    </div>
  );
}
