import { useState, useRef, useEffect } from "react";
import { Search, ScanBarcode, X } from "lucide-react";
import { api, Producto } from "../../api/tauri";
import { ProductoCard } from "../../components";

export default function VerificarPrecios() {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    // Auto-focus maintenance
    const interval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (val: string) => {
    setBusqueda(val);
    if (val.length < 3) {
      setProductos([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // First try to find exact match by barcode
      const res = await api.buscarProducto(val);

      if (res.success && res.data && res.data.length > 0) {
        setProductos(res.data);
      } else {
        setProductos([]);
        setError("Producto no encontrado");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setBusqueda("");
    setProductos([]);
    setError("");
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Search Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
          <ScanBarcode className="absolute left-10 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Escanea el código de barras aquí..."
            className="w-full pl-16 pr-16 py-4 text-3xl font-bold text-center bg-transparent border-none outline-none text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-700"
          />
          {busqueda && (
            <button
              onClick={clear}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X className="w-6 h-6 text-slate-500" />
            </button>
          )}
        </div>

        {/* Result Area */}
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/30">
          {loading ? (
            <div className="text-center animate-pulse">
              <Search className="w-20 h-20 mx-auto text-blue-300 mb-4" />
              <p className="text-xl text-blue-400 font-medium">Buscando...</p>
            </div>
          ) : productos.length > 0 ? (
            <div className="w-full max-w-4xl mx-auto animate-in fade-in zoom-in duration-300 grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto custom-scrollbar pr-2">
              {productos.map((prod) => (
                <div key={prod.id} className="h-full">
                  <ProductoCard
                    producto={prod}
                    variant="detailed"
                    showPriceType="all"
                    className="h-full"
                  />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                Producto no encontrado
              </h3>
              <p className="text-slate-400 mt-2">
                Intenta buscar por nombre o código interno
              </p>
            </div>
          ) : (
            <div className="text-center opacity-40">
              <ScanBarcode className="w-32 h-32 mx-auto text-slate-400 mb-4 stroke-1" />
              <p className="text-2xl font-medium text-slate-500">
                Esperando lectura...
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-8 text-slate-400 text-sm">
        Presiona{" "}
        <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-500 font-sans mx-1">
          ESC
        </kbd>{" "}
        para limpiar
      </p>
    </div>
  );
}
