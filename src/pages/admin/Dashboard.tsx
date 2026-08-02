import {
  DollarSign,
  Package,
  RotateCcw,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  useDashboard,
  StatCard,
  ChartCard,
} from "./dashboard";

export default function AdminDashboard() {
  const {
    loading,
    estadisticas,
    ventasDiarias,
    ventasSemanales,
    ventasMensuales,
    ventasAnuales,
  } = useDashboard();

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

  const statsDisplay = [
    {
      label: "Ventas del Día",
      value: `$${estadisticas.ventas_hoy.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: "Hoy",
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/20",
      border: "border-emerald-500/20",
    },
    {
      label: "Tickets / Clientes",
      value: estadisticas.tickets_hoy.toLocaleString("en-US"),
      change: "Hoy",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-500/20",
      border: "border-blue-500/20",
    },
    {
      label: "Devoluciones",
      value: estadisticas.devoluciones_hoy.toLocaleString("en-US"),
      change: "Hoy",
      icon: RotateCcw,
      color: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-500/20",
      border: "border-amber-500/20",
    },
    {
      label: "Prods. Vendidos",
      value: estadisticas.productos_vendidos.toLocaleString("en-US"),
      change: "Hoy",
      icon: Package,
      color: "from-purple-500 to-purple-600",
      shadow: "shadow-purple-500/20",
      border: "border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Ventas Diarias"
          subtitle="Últimos 7 días"
          icon={TrendingUp}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/20"
          data={ventasDiarias}
          type="line"
          chartColor="#3b82f6"
        />
        <ChartCard
          title="Ventas Semanales"
          subtitle="Últimas 4 semanas (Lunes a Sábado)"
          icon={Calendar}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          data={ventasSemanales}
          type="bar"
          chartColor="#10b981"
        />
        <ChartCard
          title="Ventas Mensuales"
          subtitle="Vista anual"
          icon={TrendingUp}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/20"
          data={ventasMensuales}
          type="bar"
          chartColor="#a855f7"
          xAxisAngle={-35}
        />
        <ChartCard
          title="Ventas Anuales"
          subtitle="Últimos 5 años"
          icon={TrendingUp}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/20"
          data={ventasAnuales}
          type="bar"
          chartColor="#f59e0b"
        />
      </div>
    </div>
  );
}
