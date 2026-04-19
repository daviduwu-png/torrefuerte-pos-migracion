import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { api } from "../api/tauri";
import torrelogo from "../assets/torre.png";

// type UserRole = "admin" | "vendedor"; // Commented out as per instruction

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.login(usuario, password);

      if (response.success && response.user) {
        // Guardar sesión básica
        localStorage.setItem("user", JSON.stringify(response.user));

        // Trigger automatic backup
        api.crearRespaldo("auto").catch((err) => {
          console.error("Error creating automatic backup:", err);
        });

        // Redirigir según rol
        const ruta =
          response.user.rol === "admin"
            ? "/admin/dashboard"
            : "/vendedor/dashboard";

        navigate(ruta);
      } else {
        setError(response.message || "Usuario o contraseña incorrectos");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      // Mostrar el mensaje de error específico si existe (útil para Tauri no detectado)
      const errorMsg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Error de conexión con el sistema";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Card Container con Glassmorphism */}
      <div className="w-full max-w-[900px] glass-panel rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[500px]">
          {/* Left Side - Branding */}
          <div className="relative md:w-[42%] bg-gradient-to-br from-slate-800/80 to-slate-950/80 flex items-center justify-center p-8 md:p-10 overflow-hidden">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15)_0%,transparent_70%)]" />

            {/* Content */}
            <div className="relative z-10 text-center">
              <img
                src={torrelogo}
                alt="Logo Torre Fuerte"
                className="w-[200px] md:w-[220px] mx-auto mb-4 drop-shadow-2xl"
              />
              <h2 className="text-[24px] font-bold text-white tracking-widest mt-4">
                Torre Fuerte
              </h2>
              <p className="text-slate-300 text-[14px] mt-2 px-4 max-w-xs mx-auto leading-relaxed">
                Sistema de Punto de Venta Profesional para Ferreterías
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 flex flex-col justify-center p-8 md:p-10 lg:p-12 bg-slate-900/30 ">
            <div className="mb-6">
              <h4 className="text-[24px] font-bold text-white mb-2">
                Bienvenido de nuevo
              </h4>
              <p className="text-slate-300 text-[15px]">
                Ingresa tus credenciales para acceder al sistema.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl ">
                  <p className="text-red-300 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Usuario Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-3">
                  Usuario
                </label>
                <div className="flex group">
                  <span className="flex items-center justify-center w-14 bg-slate-800/50 border border-r-0 border-slate-600/50 rounded-l-xl text-slate-400 group-focus-within:bg-slate-700/50 group-focus-within:border-blue-500/50 group-focus-within:text-blue-400 transition-all">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    required
                    autoFocus
                    className="flex-1 px-5 py-4 bg-slate-800/50 border border-l-0 border-slate-600/50 rounded-r-xl text-white text-[15px] placeholder-slate-400 focus:bg-slate-700 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-3">
                  Contraseña
                </label>
                <div className="flex group">
                  <span className="flex items-center justify-center w-14 bg-slate-800/50 border border-r-0 border-slate-600/50 rounded-l-xl text-slate-400 group-focus-within:bg-slate-700/50 group-focus-within:border-blue-500/50 group-focus-within:text-blue-400 transition-all">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    required
                    className="flex-1 px-5 py-4 bg-slate-800/50 border-y border-slate-600/50 text-white text-[15px] placeholder-slate-400 focus:bg-slate-700 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center justify-center w-14 bg-slate-800/50 border border-l-0 border-slate-600/50 rounded-r-xl text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-all"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-[14px] mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-600 disabled:to-slate-600 text-white text-[15px] font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none disabled:translate-y-0 transition-all duration-200 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  <>
                    Ingresar
                    <LogIn className="w-6 h-6" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-center gap-2 mt-10 pt-8 border-t border-slate-700/50">
              <div className="flex justify-center">
            <a
              href="https://insolus.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-2 rounded-xl border border-white/5"
            >
              <div className="text-right">
                <p
                  className="uppercase tracking-widest text-[10px] text-white/40 group-hover:text-purple-500 transition-colors"
                >
                  Powered By
                </p>
              </div>
              <img
                src="/insolus.png"
                alt="Insolus"
                className="h-12 w-auto opacity-60 group-hover:opacity-100 transition-opacity"
              />
            </a>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
