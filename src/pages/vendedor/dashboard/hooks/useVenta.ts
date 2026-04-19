import { useCallback } from "react";
import { api, TicketInput, ItemCarrito } from "../../../../api/tauri";
import { StyledSwal as Swal } from "../../../../utils/swal";
import { CarritoItem, MetodoPago } from "../types";

interface UseVentaOptions {
    carrito: CarritoItem[];
    metodoPago: MetodoPago;
    dineroRecibido: string;
    calcularTotal: () => number;
    onVentaExitosa: () => void;
    focusSearch: () => void;
}

interface UseVentaReturn {
    procesarVenta: () => Promise<void>;
}

export function useVenta({
    carrito,
    metodoPago,
    dineroRecibido,
    calcularTotal,
    onVentaExitosa,
    focusSearch,
}: UseVentaOptions): UseVentaReturn {
    const procesarVenta = useCallback(async () => {
        if (carrito.length === 0) return;

        const total = calcularTotal();
        const recibido = parseFloat(dineroRecibido) || 0;
        const cambio = metodoPago === "Efectivo" ? Math.max(0, recibido - total) : 0;

        // Validar pago insuficiente
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
                    if (!printRes.success) printErrorMsg = printRes.message;
                } catch {
                    printErrorMsg = "Error de comunicación con impresora";
                }

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
                            if (popup) popup.onkeydown = (e) => { if (e.key === "Enter") Swal.clickConfirm(); };
                        },
                    });
                } else {
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
                                    if (e.key === "Enter") { e.preventDefault(); Swal.clickConfirm(); }
                                };
                            }
                        },
                    });
                }

                onVentaExitosa();
            } else {
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
            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "Fallo de sistema",
                confirmButtonColor: "#ef4444",
                background: "#0f172a",
                color: "#fff",
            });
        } finally {
            setTimeout(() => focusSearch(), 200);
        }
    }, [carrito, metodoPago, dineroRecibido, calcularTotal, onVentaExitosa, focusSearch]);

    return { procesarVenta };
}
