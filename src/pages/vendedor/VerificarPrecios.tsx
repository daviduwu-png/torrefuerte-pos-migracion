import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ScanBarcode, X, PackageSearch } from "lucide-react";
import { api, Producto } from "../../api/tauri";
import { ProductoCard } from "../../components";
import { useNavigate } from "react-router-dom";

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function VerificarPrecios({ isOpen = true, onClose }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  // Referencia para el debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const interval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Ejecutar la búsqueda real contra el backend
  const ejecutarBusqueda = useCallback(async (val: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.buscarProducto(val);
      if (res.success && res.data && res.data.length > 0) {
        setProductos(res.data);
      } else {
        setProductos([]);
        setError("Producto no encontrado");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (val: string) => {
    setBusqueda(val);
    // Cancelar debounce previo para no disparar búsquedas obsoletas
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 1) {
      setProductos([]);
      setError("");
      return;
    }
    // Mostrar spinner inmediatamente para feedback visual
    setLoading(true);
    // Esperar 200ms antes de llamar al backend
    debounceRef.current = setTimeout(() => {
      ejecutarBusqueda(val);
    }, 200);
  };

  const clear = useCallback(() => {
    setBusqueda("");
    setProductos([]);
    setError("");
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  }, [onClose, navigate]);

  // Limpiar al cerrar y manejar ESC
  useEffect(() => {
    if (!isOpen) {
      clear();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (busqueda) {
          clear();
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, clear, busqueda, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200 dark:border-slate-800">
        
        {/* ── Encabezado Modal ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ScanBarcode className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Verificador de Precios
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Consulta los detalles antes de añadir al carrito
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-red-500/10 dark:bg-slate-800 dark:hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-colors group"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col p-5 md:p-8 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
          {/* ── Barra de búsqueda ─────────────────────────────────────────── */}
          <div className="flex-shrink-0 mb-6 bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4">
              <ScanBarcode className="w-7 h-7 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Escanea el código o escribe el nombre del producto..."
                className="flex-1 py-1 text-2xl font-bold bg-transparent border-none outline-none text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:ring-0"
              />

              {productos.length > 0 && !loading && (
                <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full flex-shrink-0">
                  <PackageSearch className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-blue-500 whitespace-nowrap">
                    {productos.length} coincidencia{productos.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {busqueda && (
                <button
                  onClick={clear}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 border border-slate-200 dark:border-slate-700 hover:border-red-500/30 rounded-xl transition-colors group flex-shrink-0"
                >
                  <X className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                  <kbd className="text-xs font-bold text-slate-400 group-hover:text-red-500 uppercase tracking-wider">
                    Limpiar
                  </kbd>
                </button>
              )}
            </div>
          </div>

          {/* ── Área de resultados con scroll ─────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full animate-pulse">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-blue-500" />
                </div>
                <p className="text-2xl text-blue-500 font-bold mb-2">Buscando...</p>
                <p className="text-slate-400 font-medium tracking-wide">Analizando catálogo de productos</p>
              </div>

            ) : productos.length > 0 ? (
              <div
                className={`
                  animate-in fade-in zoom-in duration-300 pb-8
                  ${productos.length === 1
                    ? "max-w-2xl mx-auto"
                    : "grid grid-cols-1 lg:grid-cols-2 gap-6"
                  }
                `}
              >
                {productos.map((prod) => (
                  <ProductoCard
                    key={prod.id}
                    producto={prod}
                    variant="detailed"
                    showPriceType="all"
                    className="h-full shadow-lg hover:shadow-xl transition-shadow"
                  />
                ))}
              </div>

            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50 dark:ring-red-900/10">
                  <X className="w-12 h-12 text-red-500" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                  Producto no encontrado
                </h3>
                <p className="text-slate-500 text-lg max-w-sm">
                  Intenta buscar por el nombre exacto o asegúrate que el código sea correcto.
                </p>
              </div>

            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-8 ring-8 ring-slate-50 dark:ring-slate-800/20">
                  <ScanBarcode className="w-16 h-16 text-slate-400 stroke-1" />
                </div>
                <p className="text-3xl font-bold text-slate-700 dark:text-slate-300 mb-3">
                  Listo para verificar
                </p>
                <p className="text-lg text-slate-500 font-medium">
                  Escanea un código de barras o escribe para buscar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
