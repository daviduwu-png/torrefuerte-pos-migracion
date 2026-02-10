import { useState, useEffect } from "react";
import {
  DollarSign,
  Package,
  RotateCcw,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { api } from "../../api/tauri";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    ventas_hoy: 0,
    tickets_hoy: 0,
    devoluciones_hoy: 0,
    clientes_atendidos: 0,
    productos_vendidos: 0,
  });

  const [ventasDiarias, setVentasDiarias] = useState<{
    labels: string[];
    ventas: number[];
  }>({
    labels: [],
    ventas: [],
  });

  const [ventasSemanales, setVentasSemanales] = useState<{
    labels: string[];
    ventas: number[];
  }>({
    labels: [],
    ventas: [],
  });

  const [ventasMensuales, setVentasMensuales] = useState<{
    labels: string[];
    ventas: number[];
  }>({
    labels: [],
    ventas: [],
  });

  const [ventasAnuales, setVentasAnuales] = useState<{
    labels: string[];
    ventas: number[];
  }>({
    labels: [],
    ventas: [],
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Cargar estadísticas generales y gráficas en paralelo
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
          setVentasDiarias(diariasRes.data);
        }

        if (semanalesRes.success && semanalesRes.data) {
          setVentasSemanales(semanalesRes.data);
        }

        if (mensualesRes.success && mensualesRes.data) {
          setVentasMensuales(mensualesRes.data);
        }

        if (anualesRes.success && anualesRes.data) {
          setVentasAnuales(anualesRes.data);
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Construir array de stats para renderizar
  const statsDisplay = [
    {
      label: "Ventas del Día",
      value: `$${estadisticas.ventas_hoy.toFixed(2)}`,
      change: "Hoy",
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/20",
      border: "border-emerald-500/20",
    },
    {
      label: "Tickets / Clientes",
      value: estadisticas.tickets_hoy.toString(),
      change: "Hoy",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-500/20",
      border: "border-blue-500/20",
    },
    {
      label: "Devoluciones",
      value: estadisticas.devoluciones_hoy.toString(),
      change: "Hoy",
      icon: RotateCcw,
      color: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-500/20",
      border: "border-amber-500/20",
    },
    {
      label: "Productos Vendidos",
      value: estadisticas.productos_vendidos.toString(),
      change: "Hoy",
      icon: Package,
      color: "from-purple-500 to-purple-600",
      shadow: "shadow-purple-500/20",
      border: "border-purple-500/20",
    },
  ];

  // Preparar datos para las gráficas
  const dataDiarias = ventasDiarias.labels.map((label, idx) => ({
    name: label,
    ventas: ventasDiarias.ventas[idx],
  }));

  const dataSemanales = ventasSemanales.labels.map((label, idx) => ({
    name: label,
    ventas: ventasSemanales.ventas[idx],
  }));

  const dataMensuales = ventasMensuales.labels.map((label, idx) => ({
    name: label,
    ventas: ventasMensuales.ventas[idx],
  }));

  const dataAnuales = ventasAnuales.labels.map((label, idx) => ({
    name: label,
    ventas: ventasAnuales.ventas[idx],
  }));

  if (loading) {
    return (
      <div className="p-8 text-center text-white">Cargando dashboard...</div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {statsDisplay.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className={`glass-card p-6 rounded-2xl group border-l-4 ${stat.border}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 relative z-10">
                  <p className="text-slate-400 text-xs lg:text-sm font-medium truncate uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-white mt-3 tracking-tight">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white font-medium border border-white/5">
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300 flex-shrink-0 ml-4`}
                >
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
              </div>
              {/* Decorative blur behind */}
              <div
                className={`absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 blur-3xl rounded-full pointer-events-none group-hover:opacity-20 transition-opacity`}
              />
            </div>
          );
        })}
      </div>

      {/* Gráficas de Ventas */}
      <div className="grid grid-cols-1 gap-6">
        {/* Ventas Diarias (Últimos 7 días) */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Ventas Diarias</h2>
              <p className="text-slate-400 text-xs">
                Últimos 7 días - Ventas netas (con devoluciones)
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dataDiarias}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ventas"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 5 }}
                activeDot={{ r: 7 }}
                name="Ventas ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Grid para Semanales, Mensuales y Anuales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ventas Semanales */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Ventas Semanales
                </h2>
                <p className="text-slate-400 text-xs">Últimas 4 semanas</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dataSemanales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  style={{ fontSize: "11px" }}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar
                  dataKey="ventas"
                  fill="#10b981"
                  name="Ventas ($)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ventas Anuales */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Ventas Anuales</h2>
                <p className="text-slate-400 text-xs">Últimos 5 años</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dataAnuales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  style={{ fontSize: "11px" }}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: "11px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar
                  dataKey="ventas"
                  fill="#f59e0b"
                  name="Ventas ($)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas Mensuales - Vista completa */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ventas Mensuales</h2>
              <p className="text-slate-400 text-xs">
                Últimos 12 meses - Vista completa del año
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataMensuales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                style={{ fontSize: "11px" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: "11px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar
                dataKey="ventas"
                fill="#a855f7"
                name="Ventas ($)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
