import {
    Banknote,
    CreditCard,
    ArrowRightLeft,
    Printer,
    Loader2,
} from "lucide-react";
import { MetodoPago } from "../types";

interface PagoZonaProps {
    metodoPago: MetodoPago;
    dineroRecibido: string;
    total: number;
    procesando: boolean;
    carritoVacio: boolean;
    onMetodoPagoChange: (metodo: MetodoPago) => void;
    onDineroRecibidoChange: (value: string) => void;
    onProcesarVenta: () => void;
}

const METODOS: { value: MetodoPago; label: string; Icon: React.ElementType; activeColor: string; hoverColor: string }[] = [
    {
        value: "Efectivo",
        label: "Efectivo",
        Icon: Banknote,
        activeColor: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-emerald-400 scale-105",
        hoverColor: "bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-emerald-400 hover:border-emerald-500/30",
    },
    {
        value: "Tarjeta",
        label: "Tarjeta",
        Icon: CreditCard,
        activeColor: "bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-blue-400 scale-105",
        hoverColor: "bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-blue-400 hover:border-blue-500/30",
    },
    {
        value: "Transferencia",
        label: "Transf.",
        Icon: ArrowRightLeft,
        activeColor: "bg-purple-500 text-white shadow-lg shadow-purple-500/20 border-purple-400 scale-105",
        hoverColor: "bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-purple-400 hover:border-purple-500/30",
    },
];

export function PagoZona({
    metodoPago,
    dineroRecibido,
    total,
    procesando,
    carritoVacio,
    onMetodoPagoChange,
    onDineroRecibidoChange,
    onProcesarVenta,
}: PagoZonaProps) {
    const formatDisplay = (val: string) => {
        if (!val) return "";
        const [intPart, decPart] = val.split('.');
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
    };

    const handleDineroChange = (val: string) => {
        // Eliminar todo menos números y un punto decimal
        let rawValue = val.replace(/[^0-9.]/g, '');
        const parts = rawValue.split('.');
        if (parts.length > 2) {
            rawValue = parts[0] + '.' + parts.slice(1).join('');
        }
        onDineroRecibidoChange(rawValue);
    };

    return (
        <div className="p-4 border-t border-white/10 bg-slate-900/40 z-20 shrink-0">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end w-full">
                {/* Método de Pago */}
                <div className="flex-none">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">
                        Método de Pago
                    </label>
                    <div className="flex gap-2">
                        {METODOS.map(({ value, label, Icon, activeColor, hoverColor }) => (
                            <button
                                key={value}
                                onClick={() => onMetodoPagoChange(value)}
                                className={`flex flex-col items-center justify-center min-w-[80px] py-2 rounded-lg border transition-all duration-300 ${metodoPago === value ? activeColor : hoverColor
                                    }`}
                            >
                                <Icon className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] font-bold">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dinero Recibido o Mensaje de Referencia */}
                <div className="flex-1">
                    {metodoPago === "Efectivo" ? (
                        <>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">
                                Dinero Recibido
                            </label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg group-focus-within:text-emerald-400 transition-colors">
                                    $
                                </span>
                                <input
                                    type="text"
                                    value={formatDisplay(dineroRecibido)}
                                    onChange={(e) => handleDineroChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !procesando && !carritoVacio) {
                                            onProcesarVenta();
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-3 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-xl font-bold outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 text-white transition-all shadow-inner h-[52px]"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="h-[52px] flex items-center text-slate-500 text-xs italic bg-slate-950/20 border border-slate-800 rounded-lg px-4 mt-[22px]">
                            Referencia generada automáticamente en ticket
                        </div>
                    )}
                </div>

                {/* Total y Botón Cobrar */}
                <div className="flex-none flex items-center justify-end gap-6">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            Total a Pagar
                        </p>
                        <div className="flex justify-end items-baseline gap-1">
                            <span className="text-lg text-slate-400 font-light">$</span>
                            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-lg leading-none">
                                {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onProcesarVenta}
                        disabled={procesando || carritoVacio}
                        className="px-6 h-[52px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-t border-white/20"
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
    );
}
