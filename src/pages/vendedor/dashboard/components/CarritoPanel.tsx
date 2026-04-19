import { ShoppingCart, Trash2 } from "lucide-react";
import { CarritoItem } from "../types";
import { CarritoItemRow } from "./CarritoItemRow";
import { PagoZona } from "./PagoZona";
import { MetodoPago } from "../types";

interface CarritoPanelProps {
    carrito: CarritoItem[];
    metodoPago: MetodoPago;
    dineroRecibido: string;
    total: number;
    procesando: boolean;
    onVaciarCarrito: () => void;
    onEliminarItem: (id: number) => void;
    onActualizarCantidad: (id: number, delta: number) => void;
    onEditarPrecio: (id: number, precioActual: number) => void;
    onMetodoPagoChange: (metodo: MetodoPago) => void;
    onDineroRecibidoChange: (value: string) => void;
    onProcesarVenta: () => void;
}

export function CarritoPanel({
    carrito,
    metodoPago,
    dineroRecibido,
    total,
    procesando,
    onVaciarCarrito,
    onEliminarItem,
    onActualizarCantidad,
    onEditarPrecio,
    onMetodoPagoChange,
    onDineroRecibidoChange,
    onProcesarVenta,
}: CarritoPanelProps) {
    return (
        <div className="md:col-span-7 h-full min-h-0">
            <div className="glass-panel rounded-3xl flex flex-col h-full overflow-hidden border border-white/10 shadow-2xl relative">
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between z-10 relative">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/10 border border-orange-500/20">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white">Carrito de Venta</h2>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                                {carrito.length} artículos
                            </span>
                        </div>
                    </div>
                    {carrito.length > 0 && (
                        <button
                            onClick={onVaciarCarrito}
                            className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Vaciar</span>
                        </button>
                    )}
                </div>

                {/* Lista de Items */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 relative">
                    {carrito.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500/50">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-orange-500/20 rounded-full" />
                                <ShoppingCart className="w-24 h-24 relative z-10 opacity-80" strokeWidth={1} />
                            </div>
                            <p className="text-xl font-bold text-slate-400">El carrito está vacío</p>
                            <p className="text-sm mt-2 text-slate-500">Escanea productos para comenzar</p>
                        </div>
                    ) : (
                        carrito.map((item) => (
                            <CarritoItemRow
                                key={item.id}
                                item={item}
                                onEliminar={onEliminarItem}
                                onActualizarCantidad={onActualizarCantidad}
                                onEditarPrecio={onEditarPrecio}
                            />
                        ))
                    )}
                </div>

                {/* Zona de Pago */}
                <PagoZona
                    metodoPago={metodoPago}
                    dineroRecibido={dineroRecibido}
                    total={total}
                    procesando={procesando}
                    carritoVacio={carrito.length === 0}
                    onMetodoPagoChange={onMetodoPagoChange}
                    onDineroRecibidoChange={onDineroRecibidoChange}
                    onProcesarVenta={onProcesarVenta}
                />
            </div>
        </div>
    );
}
