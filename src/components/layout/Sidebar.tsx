import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  RotateCcw,
  Upload,
  BarChart3,
  Wallet,
  User,
  LogOut,
  Database,
  ShoppingBag,
  Receipt,
  Tag,
  Users,
  Truck,
  Settings,
} from "lucide-react";
import torreLogo from "../../assets/torre.png";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  userType: "admin" | "vendedor";
}

const adminNavItems: NavItem[] = [
  {
    path: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/admin/productos",
    label: "Productos",
    icon: ShoppingBag,
  },
  {
    path: "/admin/importar-productos",
    label: "Importar Productos",
    icon: Upload,
  },
  {
    path: "/admin/devoluciones",
    label: "Devoluciones",
    icon: RotateCcw,
  },
  {
    path: "/admin/ventas",
    label: "Ventas / Tickets",
    icon: Receipt,
  },
  {
    path: "/admin/reportes",
    label: "Reportes",
    icon: BarChart3,
  },
  {
    path: "/admin/base-datos",
    label: "Base de Datos",
    icon: Database,
  },
  {
    path: "/admin/etiquetas",
    label: "Etiquetas",
    icon: Tag,
  },
  {
    path: "/admin/gestion",
    label: "Gestión",
    icon: Users,
  },
  {
    path: "/admin/pedidos",
    label: "Pedidos",
    icon: Truck,
  },
  {
    path: "/admin/configuracion",
    label: "Configuración",
    icon: Settings,
  },
];

const vendedorNavItems: NavItem[] = [
  {
    path: "/vendedor/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/vendedor/corte-caja",
    label: "Corte de Caja",
    icon: Wallet,
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
    <aside className="w-20 [@media(max-height:768px)]:w-16 glass-panel border-r-0 border-r-white/5 flex flex-col h-screen flex-shrink-0 z-50 items-center py-4 gap-4 [@media(max-height:900px)]:py-2 [@media(max-height:900px)]:gap-1 [@media(max-height:768px)]:py-1 [@media(max-height:768px)]:gap-0.5 sticky top-0 overflow-visible transition-all">
      {/* Logo Section */}
      <div className="w-12 h-12 [@media(max-height:900px)]:w-10 [@media(max-height:900px)]:h-10 [@media(max-height:768px)]:w-8 [@media(max-height:768px)]:h-8 flex items-center justify-center rounded-xl transition-all duration-300 group relative cursor-help border border-transparent hover:bg-white/5 mb-1 [@media(max-height:768px)]:mb-0 shrink-0">
        <img
          src={torreLogo}
          alt="TorreFuerte Logo"
          className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
        />

        <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10 hidden md:block">
          TorreFuerte POS
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-white/10"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="w-full flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-2 [@media(max-height:900px)]:space-y-1 [@media(max-height:768px)]:space-y-0 flex flex-col items-center px-2 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={({ isActive }) => `
                flex items-center justify-center w-12 h-12 [@media(max-height:900px)]:w-10 [@media(max-height:900px)]:h-10 [@media(max-height:768px)]:w-9 [@media(max-height:768px)]:h-9 rounded-xl shrink-0
                transition-all duration-300 group relative
                ${isActive
                  ? "bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-900/10 border border-blue-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }
              `}
            >
              <IconComponent className="w-6 h-6 [@media(max-height:900px)]:w-5 [@media(max-height:900px)]:h-5 [@media(max-height:768px)]:w-4 [@media(max-height:768px)]:h-4 transition-all" />
              {isActive && (
                <div className="absolute inset-0 bg-blue-500/10 rounded-xl -z-10" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info Section */}
      <div className="flex flex-col items-center gap-4 [@media(max-height:900px)]:gap-2 [@media(max-height:768px)]:gap-1 shrink-0 pb-2">
        <button
          onClick={handleLogout}
          title="Cerrar Sesión"
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-xl transition-colors group relative [@media(max-height:900px)]:w-8 [@media(max-height:900px)]:h-8 [@media(max-height:768px)]:w-8 [@media(max-height:768px)]:h-8 shrink-0"
        >
          <LogOut className="w-5 h-5 [@media(max-height:900px)]:w-4 [@media(max-height:900px)]:h-4 [@media(max-height:768px)]:w-4 [@media(max-height:768px)]:h-4" />
        </button>

        <div 
          title={`Usuario: ${userType}`}
          className="w-10 h-10 [@media(max-height:900px)]:w-8 [@media(max-height:900px)]:h-8 [@media(max-height:768px)]:w-8 [@media(max-height:768px)]:h-8 bg-slate-800 rounded-full flex items-center justify-center border border-white/10 group relative cursor-default shrink-0"
        >
          <User className="w-5 h-5 text-slate-400 [@media(max-height:900px)]:w-4 [@media(max-height:900px)]:h-4 [@media(max-height:768px)]:w-4 [@media(max-height:768px)]:h-4" />
        </div>
      </div>
    </aside>
  );
}
