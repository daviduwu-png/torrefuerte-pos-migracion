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

        if (diariasRes.success && diariasRes.data) setVentasDiarias(diariasRes.data);
        if (semanalesRes.success && semanalesRes.data) setVentasSemanales(semanalesRes.data);
        if (mensualesRes.success && mensualesRes.data) setVentasMensuales(mensualesRes.data);
        if (anualesRes.success && anualesRes.data) setVentasAnuales(anualesRes.data);

      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const statsDisplay = [
    {
      label: "Ventas del Día",
      value: `$${estadisticas.ventas_hoy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
      label: "Prods. Vendidos",
      value: estadisticas.productos_vendidos.toString(),
      change: "Hoy",
      icon: Package,
      color: "from-purple-500 to-purple-600",
      shadow: "shadow-purple-500/20",
      border: "border-purple-500/20",
    },
  ];

  const dataDiarias = ventasDiarias.labels.map((label, idx) => ({ name: label, ventas: ventasDiarias.ventas[idx] }));
  const dataSemanales = ventasSemanales.labels.map((label, idx) => ({ name: label, ventas: ventasSemanales.ventas[idx] }));
  const dataMensuales = ventasMensuales.labels.map((label, idx) => ({ name: label, ventas: ventasMensuales.ventas[idx] }));
  const dataAnuales = ventasAnuales.labels.map((label, idx) => ({ name: label, ventas: ventasAnuales.ventas[idx] }));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-slate-400">
        <div className="animate-pulse flex flex-col items-center">
          <TrendingUp className="w-10 h-10 mb-4 opacity-50" />
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Estilos comunes para los tooltips de recharts
  const tooltipStyle = {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "12px"
  };

  return (
    <div className="space-y-4 pb-6">

      {/* Stats Grid - Tarjetas más compactas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className={`glass-card p-4 rounded-2xl group border-l-4 ${stat.border} relative overflow-hidden`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 relative z-10">
                  <p className="text-slate-400 text-[10px] md:text-xs font-bold truncate uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-xl xl:text-2xl font-black text-white mt-1.5 tracking-tight truncate">
                    {stat.value}
                  </p>
                  <div className="mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white font-bold border border-white/5 uppercase">
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow} group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}
                >
                  <IconComponent className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                </div>
              </div>
              {/* Decorative blur */}
              <div
                className={`absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full pointer-events-none group-hover:opacity-20 transition-opacity`}
              />
            </div>
          );
        })}
      </div>

      {/* Gráficas de Ventas - Grid 2x2 para aprovechar ancho y ahorrar alto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Ventas Diarias */}
        <div className="glass-card p-4 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ventas Diarias</h2>
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">Últimos 7 días</p>
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataDiarias}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "10px" }} tickMargin={8} />
                <YAxis stroke="#94a3b8" style={{ fontSize: "10px" }} tickFormatter={(val) => `$${val}`} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val: number | undefined) => [`$${(val ?? 0).toFixed(2)}`, "Ventas"]} />
                <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={3} dot={{ fill: "#3b82f6", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas Semanales */}
        <div className="glass-card p-4 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ventas Semanales</h2>
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">Últimas 4 semanas</p>
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataSemanales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "10px" }} tickMargin={8} />
                <YAxis stroke="#94a3b8" style={{ fontSize: "10px" }} tickFormatter={(val) => `$${val}`} width={60} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#334155', opacity: 0.4 }} formatter={(val: number | undefined) => [`$${(val ?? 0).toFixed(2)}`, "Ventas"]} />
                <Bar dataKey="ventas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas Mensuales */}
        <div className="glass-card p-4 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ventas Mensuales</h2>
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">Vista anual</p>
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataMensuales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "10px" }} tickMargin={8} angle={-35} textAnchor="end" height={40} />
                <YAxis stroke="#94a3b8" style={{ fontSize: "10px" }} tickFormatter={(val) => `$${val}`} width={60} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#334155', opacity: 0.4 }} formatter={(val: number | undefined) => [`$${(val ?? 0).toFixed(2)}`, "Ventas"]} />
                <Bar dataKey="ventas" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas Anuales */}
        <div className="glass-card p-4 rounded-2xl flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ventas Anuales</h2>
              <p className="text-slate-400 text-[10px] uppercase tracking-wide">Últimos 5 años</p>
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataAnuales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "10px" }} tickMargin={8} />
                <YAxis stroke="#94a3b8" style={{ fontSize: "10px" }} tickFormatter={(val) => `$${val}`} width={60} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#334155', opacity: 0.4 }} formatter={(val: number | undefined) => [`$${(val ?? 0).toFixed(2)}`, "Ventas"]} />
                <Bar dataKey="ventas" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}