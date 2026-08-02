import { useState, useEffect } from "react";
import { api } from "../../../../api/tauri";
import { Estadisticas, ChartData } from "../types";

export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    ventas_hoy: 0,
    tickets_hoy: 0,
    devoluciones_hoy: 0,
    clientes_atendidos: 0,
    productos_vendidos: 0,
  });

  const [ventasDiarias, setVentasDiarias] = useState<ChartData[]>([]);
  const [ventasSemanales, setVentasSemanales] = useState<ChartData[]>([]);
  const [ventasMensuales, setVentasMensuales] = useState<ChartData[]>([]);
  const [ventasAnuales, setVentasAnuales] = useState<ChartData[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        const [statsRes, diariasRes, semanalesRes, mensualesRes, anualesRes] =
          await Promise.all([
            api.obtenerEstadisticas(),
            api.reporteVentasDiarias(),
            api.reporteVentasSemanales(),
            api.reporteVentasMensuales(),
            api.reporteVentasAnuales(),
          ]);

        if (statsRes.success && statsRes.data) {
          const data = statsRes.data;
          setEstadisticas({
            ventas_hoy: data.ventas_hoy || 0,
            tickets_hoy: data.tickets_hoy || 0,
            devoluciones_hoy: data.devoluciones_hoy || 0,
            clientes_atendidos: data.tickets_hoy || 0,
            productos_vendidos: data.productos_vendidos_hoy || 0,
          });
        }

        if (diariasRes.success && diariasRes.data) {
          const dData = diariasRes.data;
          setVentasDiarias(
            dData.labels.map((label: string, idx: number) => ({
              name: label,
              ventas: dData.ventas[idx],
            }))
          );
        }
        if (semanalesRes.success && semanalesRes.data) {
          const sData = semanalesRes.data;
          setVentasSemanales(
            sData.labels.map((label: string, idx: number) => ({
              name: label,
              ventas: sData.ventas[idx],
            }))
          );
        }
        if (mensualesRes.success && mensualesRes.data) {
          const mData = mensualesRes.data;
          setVentasMensuales(
            mData.labels.map((label: string, idx: number) => ({
              name: label,
              ventas: mData.ventas[idx],
            }))
          );
        }
        if (anualesRes.success && anualesRes.data) {
          const aData = anualesRes.data;
          setVentasAnuales(
            aData.labels.map((label: string, idx: number) => ({
              name: label,
              ventas: aData.ventas[idx],
            }))
          );
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  return {
    loading,
    estadisticas,
    ventasDiarias,
    ventasSemanales,
    ventasMensuales,
    ventasAnuales,
  };
}
