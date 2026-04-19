import { useEffect, useState } from "react";
import {
  useProductos,
  useProductosFiltros,
  ProductosSidebar,
  ProductosToolbar,
  ProductosTable,
  ProductoModal,
  EMPTY_FORM,
} from "./productos";
import { Producto, ProductoInput } from "./productos/types";

export default function Productos() {
  const {
    productos,
    categorias,
    marcas,
    proveedores,
    loading,
    cargarDatos,
    handleSave,
    handleDelete,
    saving,
  } = useProductos();

  const {
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
    goToPage,
    totalPages,
    filteredProductos,
    currentProductos,
  } = useProductosFiltros(productos);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [formData, setFormData] = useState<ProductoInput>(EMPTY_FORM);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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
    setModalOpen(true);
  };

  const openNewModal = () => {
    setProductoEditando(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setProductoEditando(null);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex gap-4 flex-1 min-h-0">
        <ProductosSidebar
          marcas={marcas}
          proveedores={proveedores}
          filtrosMarcas={filtrosMarcas}
          filtrosProveedores={filtrosProveedores}
          busquedaMarca={busquedaMarca}
          busquedaProveedor={busquedaProveedor}
          onBusquedaMarcaChange={setBusquedaMarca}
          onBusquedaProveedorChange={setBusquedaProveedor}
          onToggleMarca={toggleMarca}
          onToggleProveedor={toggleProveedor}
          onLimpiarFiltros={limpiarFiltros}
        />

        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col min-w-0 overflow-hidden">
          <ProductosToolbar
            busqueda={busqueda}
            totalFiltrados={filteredProductos.length}
            onBusquedaChange={setBusqueda}
            onNuevoProducto={openNewModal}
          />
          <ProductosTable
            productos={currentProductos}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onGoToPage={goToPage}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <ProductoModal
        open={modalOpen}
        productoEditando={productoEditando}
        formData={formData}
        saving={saving}
        categorias={categorias}
        marcas={marcas}
        proveedores={proveedores}
        onClose={closeModal}
        onFormChange={setFormData}
        onSave={handleSave}
      />
    </div>
  );
}