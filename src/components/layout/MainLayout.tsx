import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { formatFecha } from "../../utils/dateFormat";
import {
  LayoutDashboard,
  Package,
  Receipt,
  RotateCcw,
  Upload,
  Archive,
  BarChart3,
  Database,
  Monitor,
  Search,
  Wallet,
  Store,
} from "lucide-react";

interface MainLayoutProps {
  userType: "admin" | "vendedor";
}

const getPageInfo = (pathname: string) => {
  // Admin Routes
  if (pathname.includes("/admin/dashboard"))
    return {
      title: "Dashboard",
      subtitle: "Resumen General",
      icon: LayoutDashboard,
      color: "blue",
    };
  if (pathname.includes("/admin/productos"))
    return {
      title: "Catálogo",
      subtitle: "Gestión de Inventario",
      icon: Package,
      color: "amber",
    };
  if (pathname.includes("/admin/ventas"))
    return {
      title: "Ventas",
      subtitle: "Historial de Tickets",
      icon: Receipt,
      color: "emerald",
    };
  if (pathname.includes("/admin/devoluciones"))
    return {
      title: "Devoluciones",
      subtitle: "Gestión de Retornos",
      icon: RotateCcw,
      color: "rose",
    };
  if (pathname.includes("/admin/importar-productos"))
    return {
      title: "Importar",
      subtitle: "Carga Masiva",
      icon: Upload,
      color: "cyan",
    };
  if (pathname.includes("/admin/rellenar-stock"))
    return {
      title: "Stock",
      subtitle: "Reabastecimiento",
      icon: Archive,
      color: "violet",
    };
  if (pathname.includes("/admin/reportes"))
    return {
      title: "Reportes",
      subtitle: "Análisis Financiero",
      icon: BarChart3,
      color: "indigo",
    };
  if (pathname.includes("/admin/base-datos"))
    return {
      title: "Sistema",
      subtitle: "Base de Datos",
      icon: Database,
      color: "slate",
    };

  // Vendedor Routes
  if (pathname.includes("/vendedor/dashboard"))
    return {
      title: "Punto de Venta",
      subtitle: "Caja Principal",
      icon: Monitor,
      color: "teal",
    };
  if (pathname.includes("/vendedor/verificar-precios"))
    return {
      title: "Verificador",
      subtitle: "Consulta de Precios",
      icon: Search,
      color: "pink",
    };
  if (pathname.includes("/vendedor/corte-caja"))
    return {
      title: "Corte",
      subtitle: "Cierre de Turno",
      icon: Wallet,
      color: "orange",
    };

  return {
    title: "TorreFuerte",
    subtitle: "POS Profesional",
    icon: Store,
    color: "amber",
  };
};

function DateTimeDisplay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const hora = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="px-5 py-2.5 rounded-xl bg-slate-950/50 border border-white/5 shadow-inner flex items-center gap-3">
      <p className="text-xs font-bold text-slate-200 uppercase tracking-[0.2em]">
        {formatFecha(now)}
      </p>
      <div className="w-px h-4 bg-white/10" />
      <p className="text-xs font-bold text-slate-300 font-mono tracking-widest tabular-nums">
        {hora}
      </p>
    </div>
  );
}

export default function MainLayout({ userType }: MainLayoutProps) {
  const location = useLocation();
  const { title, subtitle, icon: Icon, color } = getPageInfo(location.pathname);

  // Helper to get color classes safely since Tailwind doesn't support dynamic class construction fully
  // But we can map common color names if needed, or use style={{}}.
  // For safety with JIT, let's use style for colors or a map if strictness is needed.
  // Or simple class names if they are safely purged. Assuming standard colors are safe.
  // Actually, constructing `text-${color}-500` works if those classes are used elsewhere or safelisted.
  // To be safe, let's use a lookup or inline styles for the colors.
  // Or just trust JIT sees full strings? No, string interpolation hides them.
  // Let's use a small map for the dynamic parts to be safe.

  const colorMap: Record<string, { bg: string; text: string; border: string }> =
  {
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      border: "border-blue-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      border: "border-amber-500/20",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      border: "border-emerald-500/20",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-500",
      border: "border-rose-500/20",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-500",
      border: "border-cyan-500/20",
    },
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-500",
      border: "border-violet-500/20",
    },
    indigo: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-500",
      border: "border-indigo-500/20",
    },
    slate: {
      bg: "bg-slate-500/10",
      text: "text-slate-500",
      border: "border-slate-500/20",
    },
    teal: {
      bg: "bg-teal-500/10",
      text: "text-teal-500",
      border: "border-teal-500/20",
    },
    pink: {
      bg: "bg-pink-500/10",
      text: "text-pink-500",
      border: "border-pink-500/20",
    },
    orange: {
      bg: "bg-orange-500/10",
      text: "text-orange-500",
      border: "border-orange-500/20",
    },
  };

  const colors = colorMap[color] || colorMap.amber;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Already Glass Panel */}
      <Sidebar userType={userType} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Decorative background elements for depth */}
        <div className="absolute top-0 left-0 w-full h-96 bg-blue-600/10 pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 pointer-events-none -z-10" />

        {/* Header - Card Style */}
        <header className="w-full px-4 lg:px-8 pt-6 pb-2 z-10 flex-shrink-0">
          <div className="w-full glass-panel p-4 md:p-5 rounded-2xl flex items-center justify-between border border-white/10 shadow-2xl bg-slate-900/60 ">
            {/* Page Title & Icon - Left Side */}
            <div className="flex items-center gap-4 md:gap-5">
              <div
                className={`p-3 md:p-3.5 rounded-xl ${colors.bg} ${colors.border} border shadow-inner`}
              >
                <Icon className={`w-6 h-6 md:w-8 md:h-8 ${colors.text}`} />
              </div>
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
                  {title}
                </h1>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Date & Time Display - Right Side */}
            <DateTimeDisplay />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 lg:px-8 pb-8 overflow-y-auto py-4 md:py-6 custom-scrollbar scroll-smooth">
          <Outlet />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
