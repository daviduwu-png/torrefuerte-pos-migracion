import { useState, useEffect, useRef } from "react";
import {
  ScanBarcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Loader2,
  X,
  Edit,
} from "lucide-react";
import Swal from "sweetalert2";
import { api, Producto, TicketInput, ItemCarrito } from "../../api/tauri";
import { ProductoCard } from "../../components";

// Interface local para el carrito
interface CarritoItem {
  id: number;
  producto: Producto;
  cantidad: number;
}

export default function VendedorDashboard() {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<
    "Efectivo" | "Tarjeta" | "Transferencia"
  >("Efectivo");
  const [dineroRecibido, setDineroRecibido] = useState<string>("");
  const [procesando, setProcesando] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus en el input al cargar
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Buscar productos
  const buscarProducto = async (query: string) => {
    setBusqueda(query);
    if (query.length < 1) {
      setResultados([]);
      return;
    }

    try {
      const res = await api.buscarProducto(query);
      if (res.success && res.data && res.data.length > 0) {
        setResultados([res.data[0]]);
      } else {
        setResultados([]);
      }
    } catch (error) {
      console.error("Error buscando producto:", error);
      setResultados([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (resultados.length > 0) {
        agregarAlCarrito(resultados[0]);
      } else if (busqueda.trim().length > 0) {
        api.buscarProducto(busqueda).then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            agregarAlCarrito(res.data[0]);
          }
        });
      }
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      return [
        ...prev,
        { id: producto.id, producto: { ...producto }, cantidad: 1 },
      ];
    });
    setResultados([]);
    setBusqueda("");
    searchInputRef.current?.focus();
  };

  const eliminarDelCarrito = (id: number) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const actualizarCantidad = (id: number, delta: number) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nuevaCantidad = Math.max(1, item.cantidad + delta);
          return { ...item, cantidad: nuevaCantidad };
        }
        return item;
      }),
    );
  };

  // Función para editar precio manualmente (Estilizada)
  const editarPrecio = async (id: number, precioActual: number) => {
    const { value: nuevoPrecio } = await Swal.fire({
      title: "Precio Preferencial",
      input: "number",
      inputLabel: "Ingrese el nuevo precio unitario",
      inputValue: precioActual,
      showCancelButton: true,
      confirmButtonText: "Aplicar",
      cancelButtonText: "Cancelar",
      // Estilos Dark Mode
      background: "#0f172a",
      color: "#fff",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#64748b",
      customClass: {
        input: "bg-slate-700 text-white border-slate-600 focus:ring-blue-500", // Input oscuro
      },
      inputValidator: (value) => {
        if (!value || parseFloat(value) < 0) {
          return "El precio no puede ser negativo";
        }
        return null;
      },
    });

    if (nuevoPrecio) {
      const precioFinal = parseFloat(nuevoPrecio);
      setCarrito((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              producto: {
                ...item.producto,
                precio_venta: precioFinal,
              },
            };
          }
          return item;
        }),
      );

      await Swal.fire({
        icon: "success",
        title: "Precio Actualizado",
        html: `
          <div style="background: #ffffff10; padding: 15px; border-radius: 10px; margin-top: 10px;">
             <p style="color: #94a3b8; font-size: 0.9em; margin: 0;">Nuevo precio establecido:</p>
             <p style="color: #34d399; font-size: 1.5em; font-weight: bold; margin: 0;">$${precioFinal.toFixed(2)}</p>
          </div>
        `,
        timer: 1500,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#fff",
      });
    }
  };

  const calcularTotal = () => {
    return carrito.reduce(
      (total, item) => total + item.producto.precio_venta * item.cantidad,
      0,
    );
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) return;

    const total = calcularTotal();
    const recibido = parseFloat(dineroRecibido) || 0;
    const cambio =
      metodoPago === "Efectivo" ? Math.max(0, recibido - total) : 0;

    // --- ALERTA PAGO INSUFICIENTE (Estilizada) ---
    if (metodoPago === "Efectivo" && recibido < total) {
      await Swal.fire({
        icon: "warning",
        title: "Pago insuficiente",
        html: `
          <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
            <div style="background: #ffffff10; padding: 15px; border-radius: 10px; width: 100%; display: flex; justify-content: space-between; align-items: center;">
               <span style="color: #94a3b8; font-size: 0.9em;">Total a pagar:</span>
               <span style="font-size: 1.2em; font-weight: bold; color: #fff;">$${total.toFixed(2)}</span>
            </div>
            
            <div style="background: #ffffff05; padding: 15px; border-radius: 10px; width: 100%; display: flex; justify-content: space-between; align-items: center; border: 1px solid #ffffff10;">
               <span style="color: #64748b; font-size: 0.9em;">Recibido:</span>
               <span style="font-size: 1.2em; font-weight: bold; color: #94a3b8;">$${recibido.toFixed(2)}</span>
            </div>

            <div style="margin-top: 5px;">
               <p style="margin: 0; font-size: 0.9em; color: #fca5a5;">Faltan para completar:</p>
               <p style="margin: 0; font-size: 1.4em; font-weight: bold; color: #f87171;">$${(total - recibido).toFixed(2)}</p>
            </div>
          </div>
        `,
        confirmButtonColor: "#f59e0b",
        confirmButtonText: "Corregir monto",
        background: "#0f172a",
        color: "#fff",
        allowEnterKey: false,
        stopKeydownPropagation: true,
      });
      return;
    }

    setProcesando(true);
    try {
      const items: ItemCarrito[] = carrito.map((c) => ({
        id: c.producto.id,
        cantidad: c.cantidad,
        precio_venta: c.producto.precio_venta,
      }));

      const ticketInput: TicketInput = {
        productos: items,
        total,
        metodo_pago: metodoPago,
        dinero_recibido: metodoPago === "Efectivo" ? recibido : total,
        cambio,
      };

      const res = await api.generarTicket(ticketInput);

      if (res.success && res.data) {
        let printErrorMsg = "";
        try {
          const printRes = await api.imprimirTicket(res.data.id);
          if (!printRes.success) {
            printErrorMsg = printRes.message;
          }
        } catch (e) {
          printErrorMsg = "Error de comunicación con impresora";
        }

        // --- ALERTA ERROR IMPRESIÓN (Estilizada) ---
        if (printErrorMsg) {
          await Swal.fire({
            icon: "warning",
            title: "Venta registrada (Sin Impresión)",
            html: `
              <div style="text-align: center;">
                  <div style="background: #ffffff10; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                    <p style="margin:0; color: #94a3b8; font-size: 0.9em;">Cambio a entregar:</p>
                    <p style="margin:0; font-size: 1.8em; font-weight: bold; color: #34d399;">$${cambio.toFixed(2)}</p>
                  </div>
                  <div style="background: #f8717120; padding: 10px; border-radius: 8px; border: 1px solid #f8717150;">
                    <p style="margin:0; color: #fca5a5; font-size: 0.85em;">⚠️ ${printErrorMsg}</p>
                  </div>
              </div>
            `,
            confirmButtonText: "Aceptar",
            confirmButtonColor: "#f59e0b",
            background: "#0f172a",
            color: "#fff",
            allowOutsideClick: false,
            didOpen: () => {
              const confirmBtn = Swal.getConfirmButton();
              if (confirmBtn) confirmBtn.focus();
              const popup = Swal.getPopup();
              if (popup) {
                popup.onkeydown = (e) => {
                  if (e.key === "Enter") Swal.clickConfirm();
                };
              }
            },
          });
        } else {
          // --- ALERTA ÉXITO TOTAL (La que te gustó) ---
          await Swal.fire({
            icon: "success",
            title: "¡Venta Completada!",
            html: `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                  <div style="background: #ffffff10; padding: 15px; border-radius: 10px; width: 100%;">
                      <p style="margin: 0; font-size: 0.9em; color: #94a3b8;">Su cambio es:</p>
                      <p style="margin: 0; font-size: 2.5em; font-weight: bold; color: #34d399; line-height: 1.2;">
                          $${cambio.toFixed(2)}
                      </p>
                  </div>
                  <div style="margin-top: 5px; font-size: 0.8em; opacity: 0.6;">
                      Presiona <kbd style="background: #475569; color: #fff; padding: 2px 6px; border-radius: 4px; border-bottom: 2px solid #1e293b;">ENTER</kbd> para continuar
                  </div>
              </div>
            `,
            showConfirmButton: true,
            confirmButtonText: "Siguiente Venta",
            confirmButtonColor: "#10b981",
            background: "#0f172a",
            color: "#fff",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
              const confirmBtn = Swal.getConfirmButton();
              if (confirmBtn) confirmBtn.focus();
              const popup = Swal.getPopup();
              if (popup) {
                popup.onkeydown = (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    Swal.clickConfirm();
                  }
                };
              }
            },
          });
        }

        setCarrito([]);
        setDineroRecibido("");
        setMetodoPago("Efectivo");
      } else {
        // --- ALERTA ERROR BACKEND ---
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: res.message,
          confirmButtonColor: "#ef4444",
          background: "#0f172a",
          color: "#fff",
        });
      }
    } catch (error) {
      console.error(error);
      // --- ALERTA ERROR SISTEMA ---
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Fallo de sistema",
        confirmButtonColor: "#ef4444",
        background: "#0f172a",
        color: "#fff",
      });
    } finally {
      setProcesando(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
    }
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-1">
      {/* Panel Izquierdo: Búsqueda y Resultados */}
      <div className="lg:col-span-5 flex flex-col gap-6 h-full min-h-0">
        <div className="glass-panel rounded-3xl flex flex-col h-full overflow-hidden border border-white/10 shadow-2xl">
          {/* Header Panel */}
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 backdrop-blur-md border border-blue-500/20">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Agregar Productos
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">
                  Escanea o busca por nombre
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col min-h-0 gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="text-slate-400 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={busqueda}
                onChange={(e) => buscarProducto(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escanear código o buscar..."
                className="w-full pl-12 pr-4 py-4 glass-input rounded-2xl text-lg font-medium outline-none transition-all shadow-inner"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="text-[10px] font-bold bg-white/10 text-slate-400 px-2 py-1 rounded border border-white/5 hidden sm:block">
                  ENTER
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {resultados.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => agregarAlCarrito(prod)}
                  className="cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200"
                >
                  <ProductoCard
                    producto={prod}
                    variant="detailed"
                    showPriceType="all"
                  />
                </div>
              ))}

              {busqueda && resultados.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                    <Search className="w-10 h-10 opacity-50" />
                  </div>
                  <p className="text-lg font-medium text-slate-400">
                    No se encontraron productos
                  </p>
                  <p className="text-sm opacity-60 mt-1">
                    Intenta con otro término o código
                  </p>
                </div>
              )}

              {!busqueda && resultados.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500/40 p-8 text-center">
                  <ScanBarcode className="w-24 h-24 opacity-20 mb-4" />
                  <p className="text-lg font-medium">Listo para escanear</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho: Carrito */}
      <div className="lg:col-span-7 h-full min-h-0">
        <div className="glass-panel rounded-3xl flex flex-col h-full overflow-hidden border border-white/10 shadow-2xl relative">
          {/* Header Carrito */}
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/10 backdrop-blur-md border border-orange-500/20">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Carrito de Venta
                </h2>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                  {carrito.length} artículos
                </span>
              </div>
            </div>
            {carrito.length > 0 && (
              <button
                onClick={() => setCarrito([])}
                className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            )}
          </div>

          {/* Lista Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 relative">
            {carrito.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500/50">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
                  <ShoppingCart
                    className="w-32 h-32 relative z-10 opacity-80"
                    strokeWidth={1}
                  />
                </div>
                <p className="text-2xl font-bold text-slate-400">
                  El carrito está vacío
                </p>
                <p className="text-sm mt-2 text-slate-500">
                  Escanea productos para comenzar
                </p>
              </div>
            ) : (
              carrito.map((item) => (
                <div
                  key={item.id}
                  className="glass-card p-4 rounded-xl flex items-center gap-4 group hover:bg-slate-800/80 border border-white/5 hover:border-blue-500/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-900/50 flex items-center justify-center text-slate-400 font-bold text-sm border border-slate-700/50">
                    {item.cantidad}x
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-200 text-lg truncate">
                      {item.producto.nombre}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-mono text-slate-400 group-hover:text-white transition-colors">
                        ${item.producto.precio_venta.toFixed(2)} c/u
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          editarPrecio(item.id, item.producto.precio_venta);
                        }}
                        className="p-1 text-blue-400 hover:bg-blue-500/20 rounded-md opacity-60 group-hover:opacity-100 transition-all"
                        title="Cambiar Precio (Preferencial)"
                      >
                        <Edit className="w-3 h-3" />
                      </button>

                      {item.producto.stock < 10 && (
                        <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 rounded border border-red-500/20">
                          STOCK BAJO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center bg-slate-950/50 rounded-lg p-1 border border-slate-800">
                    <button
                      onClick={() => actualizarCantidad(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => actualizarCantidad(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <p className="font-bold text-xl text-emerald-400">
                      ${(item.producto.precio_venta * item.cantidad).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => eliminarDelCarrito(item.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Zona de Pago */}
          <div className="p-4 border-t border-white/10 bg-slate-900/40 backdrop-blur-xl z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Selectores Método Pago */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setMetodoPago("Efectivo")}
                    className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all duration-300 ${
                      metodoPago === "Efectivo"
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-emerald-400 scale-105"
                        : "bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-emerald-400 hover:border-emerald-500/30"
                    }`}
                  >
                    <Banknote className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Efectivo</span>
                  </button>
                  <button
                    onClick={() => setMetodoPago("Tarjeta")}
                    className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all duration-300 ${
                      metodoPago === "Tarjeta"
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-blue-400 scale-105"
                        : "bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-blue-400 hover:border-blue-500/30"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Tarjeta</span>
                  </button>
                  <button
                    onClick={() => setMetodoPago("Transferencia")}
                    className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all duration-300 ${
                      metodoPago === "Transferencia"
                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20 border-purple-400 scale-105"
                        : "bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-purple-400 hover:border-purple-500/30"
                    }`}
                  >
                    <ArrowRightLeft className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Transf.</span>
                  </button>
                </div>
              </div>

              {/* Input Dinero & Cambio */}
              {metodoPago === "Efectivo" ? (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">
                    Dinero Recibido
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg group-focus-within:text-emerald-400 transition-colors">
                      $
                    </span>
                    <input
                      type="number"
                      value={dineroRecibido}
                      onChange={(e) => setDineroRecibido(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (!procesando && carrito.length > 0) {
                            procesarVenta();
                          }
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950/50 border border-slate-700 rounded-lg text-xl font-bold outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 text-white transition-all shadow-inner"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center text-slate-500 text-xs italic">
                  Referencia generada automáticamente en ticket
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-right flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                  Total a Pagar
                </p>
                <div className="flex justify-end items-baseline gap-1">
                  <span className="text-xl text-slate-400 font-light">$</span>
                  <p className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">
                    {calcularTotal().toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                onClick={procesarVenta}
                disabled={procesando || carrito.length === 0}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-t border-white/20"
              >
                {procesando ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Printer className="w-5 h-5" />
                )}
                COBRAR TICKET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
