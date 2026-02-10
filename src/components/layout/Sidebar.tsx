import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  RotateCcw,
  Upload,
  BarChart3,
  Search,
  Wallet,
  User,
  LogOut,
  PackagePlus,
  Database,
  ShoppingBag,
  Receipt,
} from "lucide-react";
import torreLogo from "../../assets/torre.png";
interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  userType: "admin" | "vendedor";
}

const adminNavItems: NavItem[] = [
  {
    path: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-6 h-6" />,
  },
  {
    path: "/admin/productos",
    label: "Productos",
    icon: <ShoppingBag className="w-6 h-6" />,
  },
  {
    path: "/admin/importar-productos",
    label: "Importar Productos",
    icon: <Upload className="w-6 h-6" />,
  },
  {
    path: "/admin/rellenar-stock",
    label: "Rellenar Stock",
    icon: <PackagePlus className="w-6 h-6" />,
  },
  {
    path: "/admin/devoluciones",
    label: "Devoluciones",
    icon: <RotateCcw className="w-6 h-6" />,
  },
  {
    path: "/admin/ventas",
    label: "Ventas / Tickets",
    icon: <Receipt className="w-6 h-6" />,
  },
  {
    path: "/admin/reportes",
    label: "Reportes",
    icon: <BarChart3 className="w-6 h-6" />,
  },
  {
    path: "/admin/base-datos",
    label: "Base de Datos",
    icon: <Database className="w-6 h-6" />,
  },
];

const vendedorNavItems: NavItem[] = [
  {
    path: "/vendedor/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-6 h-6" />,
  },
  {
    path: "/vendedor/verificar-precios",
    label: "Verificar Precios",
    icon: <Search className="w-6 h-6" />,
  },
  {
    path: "/vendedor/corte-caja",
    label: "Corte de Caja",
    icon: <Wallet className="w-6 h-6" />,
  },
];

export default function Sidebar({ userType }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = userType === "admin" ? adminNavItems : vendedorNavItems;

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <aside className="w-20 glass-panel border-r-0 border-r-white/5 flex flex-col h-screen flex-shrink-0 z-20 items-center py-4 gap-4 sticky top-0 overflow-visible">
      {/* Logo Section */}
      <div className="w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 group relative cursor-help border border-transparent hover:bg-white/5">
        <img
          src={torreLogo}
          alt="TorreFuerte Logo"
          className="w-100 h-100 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
        />

        <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10">
          TorreFuerte POS
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-white/10"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="w-full space-y-2 flex flex-col items-center px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center justify-center w-12 h-12 rounded-xl
                transition-all duration-300 group relative
                ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-900/10 border border-blue-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }
              `}
            >
              {item.icon}
              {isActive && (
                <div className="absolute inset-0 bg-blue-500/10 blur-md rounded-xl -z-10" />
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10">
                {item.label}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-white/10"></div>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Spacer para empujar los botones al final */}
      <div className="flex-1"></div>

      {/* User Info Section */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-xl transition-colors group relative"
        >
          <LogOut className="w-5 h-5" />
          {/* Tooltip */}
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-red-900/80 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
            Cerrar Sesión
          </div>
        </button>

        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/10 group relative cursor-default">
          <User className="w-5 h-5 text-slate-400" />
          {/* Tooltip User */}
          <div className="absolute left-full ml-4 px-4 py-2 bg-slate-800 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10">
            <p className="text-sm font-bold">Usuario</p>
            <p className="text-xs text-slate-400 capitalize">{userType}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
