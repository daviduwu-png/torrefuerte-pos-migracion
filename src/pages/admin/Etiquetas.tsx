import { useEffect, useState, useMemo } from "react";
import { api, Producto } from "../../api/tauri";
import { PanelEtiqueta } from "./etiquetas/PanelEtiqueta";
import { AlertTriangle, CheckCircle, Tag } from "lucide-react";

type Filtro = "todos" | "sin_barras" | "con_barras";

export default function Etiquetas() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null);

  async function cargar() {
    setLoading(true);
    try {
      const res = await api.consultarProductos();
      if (res.success && res.data) setProductos(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // Aplicar filtros y memorizar para optimizar rendimiento
  const { productosFiltrados, sinBarras } = useMemo(() => {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const searchNormalized = normalize(busqueda.trim());
    const tokens = searchNormalized.split(/\s+/).filter(Boolean);

    let sinBarrasCount = 0;

    const filtrados = productos.filter((p) => {
      if (!p.codigo_barras) sinBarrasCount++;

      const matchFiltro =
        filtro === "todos" ||
        (filtro === "sin_barras" && !p.codigo_barras) ||
        (filtro === "con_barras" && !!p.codigo_barras);

      if (!matchFiltro) return false;
      if (!searchNormalized) return true;

      const barrasNorm = normalize(p.codigo_barras ?? "");
      const internoNorm = normalize(p.codigo_interno ?? "");
      const nombreNorm = normalize(p.nombre);

      const matchCodigo =
        barrasNorm.includes(searchNormalized) ||
        internoNorm.includes(searchNormalized);

      const matchNombre = tokens.every((t) => nombreNorm.includes(t));

      return matchCodigo || matchNombre;
    });

    return {
      productosFiltrados: filtrados,
      sinBarras: sinBarrasCount,
    };
  }, [productos, busqueda, filtro]);

  //Limitado a 100 resultados
  const productosRender = productosFiltrados.slice(0, 100);

  function handleAsignado(updated: Producto) {
    setProductos((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
    setSeleccionado(updated);
  }

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">
            Etiquetas de Productos
          </h1>
          <p className="text-slate-400 text-sm">
            Genera y asigna códigos de barras · imprime etiquetas POS-58
          </p>
        </div>
        {sinBarras > 0 && (
          <div className="flex items-center gap-2 bg-amber-900/40 border border-amber-700/50 rounded-lg px-3 py-1.5">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-amber-400 text-sm font-semibold">
              {sinBarras} producto{sinBarras !== 1 ? "s" : ""} sin código
            </span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, código…"
          className="flex-1 min-w-52 glass-input rounded-lg px-3 py-2 text-sm"
        />
        {(["todos", "sin_barras", "con_barras"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtro === f
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}
          >
            {f === "todos"
              ? "Todos"
              : f === "sin_barras"
                ? "Sin código"
                : "Con código"}
          </button>
        ))}
      </div>

      {/* Body: lista + panel */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        {/* Lista de productos */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Cargando productos…
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Sin resultados
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">
                      Producto
                    </th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">
                      Código barras
                    </th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">
                      Interno
                    </th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productosRender.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSeleccionado(p)}
                      className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                        seleccionado?.id === p.id
                          ? "bg-blue-600/20 border-l-2 border-l-blue-500"
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-slate-200 font-medium truncate max-w-xs">
                          {p.nombre}
                        </p>
                        <p className="text-slate-500 text-xs">ID #{p.id}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {p.codigo_barras ? (
                          <span className="font-mono text-slate-300 text-xs">
                            {p.codigo_barras}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs italic">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-mono text-slate-400 text-xs">
                          {p.codigo_interno ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.codigo_barras ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400 text-xs border border-emerald-800">
                            <CheckCircle size={12} /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 text-xs border border-amber-800">
                            <AlertTriangle size={12} /> Sin código
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pie de tabla */}
          <div className="border-t border-slate-800 px-4 py-2 flex items-center justify-between">
            <span className="text-slate-500 text-xs">
              Mostrando {productosRender.length} de {productosFiltrados.length}{" "}
              productos
            </span>
            {productosFiltrados.length > productosRender.length && (
              <span className="text-amber-500/70 text-xs italic">
                Usa el buscador para filtrar más resultados.
              </span>
            )}
          </div>
        </div>

        {/* Panel derecho: detalle / asignación */}
        <div className="w-full md:w-72 shrink-0 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col overflow-y-auto">
          {seleccionado ? (
            <PanelEtiqueta
              key={seleccionado.id}
              producto={seleccionado}
              onAsignado={handleAsignado}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-slate-500 p-6">
              <Tag size={48} className="text-slate-600" />
              <p className="text-sm">
                Selecciona un producto de la lista para generar o asignar su
                código de barras
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
