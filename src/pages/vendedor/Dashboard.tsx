import { useState, useEffect } from "react";
import {
  useCarrito,
  useBusqueda,
  useVenta,
  BusquedaPanel,
  CarritoPanel,
} from "./dashboard";
import { MetodoPago } from "./dashboard/types";
import VerificarPrecios from "./VerificarPrecios";

export default function VendedorDashboard() {
  const {
    carrito,
    agregarAlCarrito,
    eliminarDelCarrito,
    actualizarCantidad,
    editarPrecio,
    calcularTotal,
    vaciarCarrito,
  } = useCarrito();

  const {
    busqueda,
    resultados,
    searchInputRef,
    buscarProducto,
    handleKeyDown,
    limpiarBusqueda,
  } = useBusqueda();

  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Efectivo");
  const [dineroRecibido, setDineroRecibido] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [isVerificarPreciosOpen, setIsVerificarPreciosOpen] = useState(false);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [searchInputRef]);

  const handleSeleccionarProducto = (producto: Parameters<typeof agregarAlCarrito>[0]) => {
    agregarAlCarrito(producto);
    limpiarBusqueda();
  };

  const { procesarVenta } = useVenta({
    carrito,
    metodoPago,
    dineroRecibido,
    calcularTotal,
    onVentaExitosa: () => {
      vaciarCarrito();
      setDineroRecibido("");
      setMetodoPago("Efectivo");
      setProcesando(false);
    },
    focusSearch: () => searchInputRef.current?.focus(),
  });

  const handleProcesarVenta = async () => {
    setProcesando(true);
    await procesarVenta();
    setProcesando(false);
  };

  return (
    <>
      <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-4 p-1">
        <BusquedaPanel
          busqueda={busqueda}
          resultados={resultados}
          searchInputRef={searchInputRef}
          onBusquedaChange={buscarProducto}
          onKeyDown={(e) => handleKeyDown(e, handleSeleccionarProducto)}
          onSeleccionar={handleSeleccionarProducto}
          onVerificarPrecios={() => setIsVerificarPreciosOpen(true)}
        />

        <CarritoPanel
          carrito={carrito}
          metodoPago={metodoPago}
          dineroRecibido={dineroRecibido}
          total={calcularTotal()}
          procesando={procesando}
          onVaciarCarrito={vaciarCarrito}
          onEliminarItem={eliminarDelCarrito}
          onActualizarCantidad={actualizarCantidad}
          onEditarPrecio={editarPrecio}
          onMetodoPagoChange={setMetodoPago}
          onDineroRecibidoChange={setDineroRecibido}
          onProcesarVenta={handleProcesarVenta}
        />
      </div>

      <VerificarPrecios 
        isOpen={isVerificarPreciosOpen} 
        onClose={() => setIsVerificarPreciosOpen(false)} 
      />
    </>
  );
}
