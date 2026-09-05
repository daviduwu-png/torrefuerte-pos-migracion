import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  DollarSign,
  Package,
  RotateCcw,
  Users,
  TrendingUp,
  Calendar,
  LayoutGrid,
  Receipt,
  Ban,
} from "lucide-react";
import { useDashboard, StatCard, ChartCard } from "./dashboard";
import DatePicker from "../../components/ui/DatePicker";

type DashboardTab = "general" | "facturables" | "no_facturables";

const TABS: {
  id: DashboardTab;
  label: string;
  icon: typeof LayoutGrid;
  color: string;
  activeColor: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: LayoutGrid,
    color: "text-slate-400 hover:text-slate-200 hover:bg-white/5",
    activeColor: "bg-blue-600 text-white shadow-sm shadow-blue-900/20",
  },
  {
    id: "facturables",
    label: "Solo Facturables",
    icon: Receipt,
    color: "text-slate-400 hover:text-slate-200 hover:bg-white/5",
    activeColor: "bg-emerald-600 text-white shadow-sm shadow-emerald-900/20",
  },
  {
    id: "no_facturables",
    label: "No Facturables",
    icon: Ban,
    color: "text-slate-400 hover:text-slate-200 hover:bg-white/5",
    activeColor: "bg-amber-600 text-white shadow-sm shadow-amber-900/20",
  },
];

function tabToFacturable(tab: DashboardTab): boolean | null {
  if (tab === "facturables") return true;
  if (tab === "no_facturables") return false;
  return null;
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD */
function hoyISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("general");
  const [fechaBase, setFechaBase] = useState<string>(hoyISO());
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("header-actions-portal"));
  }, []);

  const {
    loading,
    estadisticas,
    ventasDiarias,
    ventasSemanales,
    ventasMensuales,
    ventasAnuales,
  } = useDashboard(tabToFacturable(activeTab), fechaBase);

  const portalContent = (
    <div className="flex items-center gap-2">
      {/* Tabs de filtro */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-white/5 rounded-xl shadow-lg">
        {TABS.map(({ id, label, icon: Icon, color, activeColor }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
              activeTab === id ? activeColor : color
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Date picker */}
      <DatePicker
        value={fechaBase}
        onChange={setFechaBase}
        maxDate={hoyISO()}
        className="w-44"
      />
    </div>
  );

  if (loading) {
    return (
      <>
        {portalTarget && createPortal(portalContent, portalTarget)}
        <div className="flex h-full items-center justify-center p-8 text-center text-slate-400">
          <div className="animate-pulse flex flex-col items-center">
            <TrendingUp className="w-10 h-10 mb-4 opacity-50" />
            <p>Cargando dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  const statsDisplay = [
    {
      label: "Ventas del Día",
      value: `$${estadisticas.ventas_hoy.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
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
    <>
      {portalTarget && createPortal(portalContent, portalTarget)}
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
    </>
  );
}
