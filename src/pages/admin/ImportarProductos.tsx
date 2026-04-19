import { useState, useRef } from "react";
import {
  CloudUpload,
  CheckCircle,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { read, utils } from "xlsx";
import { api, ProductoInput } from "../../api/tauri";

interface ProductoPreview {
  codigo: string;
  nombre: string;
  precio: number;
  unidad: string;
}

export default function ImportarProductos() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [previsualizacion, setPrevisualizacion] = useState<ProductoPreview[]>(
    [],
  );
  const [datosProcesados, setDatosProcesados] = useState<ProductoInput[]>([]);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2)
        throw new Error("El archivo está vacío o no tiene formato válido.");

      // 1. Find Header Row
      let headerRowIndex = -1;
      let colMap: Record<string, number> = {};

      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i] as any[];
        const rowStr = row.map((c) => String(c).toLowerCase().trim());

        // Check if this row contains "codigo" and "descripcion"
        if (
          rowStr.some((c) => c.includes("codigo") || c.includes("código")) &&
          rowStr.some(
            (c) =>
              c.includes("descripcion") ||
              c.includes("descripción") ||
              c.includes("nombre"),
          )
        ) {
          headerRowIndex = i;
          // Build Map
          row.forEach((col: any, idx: number) => {
            const val = String(col).toLowerCase().trim();
            colMap[val] = idx;
          });
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error(
          "No se encontraron las columnas requeridas (Clave, Descripción...). Verifique el formato.",
        );
      }

      // Helper to find index by variations
      const getIdx = (variations: string[]) => {
        for (const v of variations) {
          // Exact match or partial? Let's try exact first then partial
          const found = Object.keys(colMap).find(
            (k) => k === v || k.includes(v),
          );
          if (found) return colMap[found];
        }
        return -1;
      };

      // IMPORTANTE: El Excel TRUPER tiene:
      // - "código" (primera columna) = codigo_interno en BD
      // - "ean" = codigo_barras en BD
      // - "clave" = NO se usa
      const idxCodigoInterno = getIdx(["código", "codigo"]);
      const idxDesc = getIdx(["descripción", "descripcion", "nombre"]);
      const idxEan = getIdx(["ean"]);
      const idxMarca = getIdx(["marca"]);
      const idxUnidad = getIdx(["unidad", "medida"]);

      // Prices (Truper specific columns usually)
      // FIX: Removed generic "precio" from PCompra to avoid matching "precio publico"
      const idxPCompra = getIdx([
        "precio distribuidor sin iva",
        "precio distribuidor",
        "precio compra",
        "costo",
        "distribuidor",
      ]);
      const idxPVenta = getIdx([
        "precio publico con iva",
        "precio público con iva",
        "precio venta",
        "publico",
        "público",
        "precio", // Generic "precio" usually implies Sale Price in this context
      ]);
      const idxPMayoreo = getIdx(["precio mayoreo con iva", "mayoreo"]);
      const idxPDistribuidor = getIdx([
        "precio distribuidor con iva",
        // "distribuidor", // Removed to avoid ambiguity with PCompra
      ]);

      if (idxCodigoInterno === -1 || idxDesc === -1) {
        throw new Error(
          "Faltan columnas obligatorias: Código (primera columna) y Descripción.",
        );
      }

      const processedData: ProductoInput[] = [];
      const previews: ProductoPreview[] = [];

      // Find 'FERRETERIA' category ID
      const catsRes = await api.obtenerCategorias();
      let ferreteriaId = 1; // Default
      if (catsRes.success && catsRes.data) {
        const cat = catsRes.data.find(
          (c) =>
            c.nombre.toUpperCase() === "FERRETERIA" ||
            c.nombre.toUpperCase() === "FERRETERÍA",
        );
        if (cat) {
          ferreteriaId = cat.id;
        } else {
          // Create it? Logic implies we should. For now let's try to assume it exists or use first one.
          // In real implementation we'd call api.crearCategoria('FERRETERIA').
          const newCat = await api.crearCategoria("FERRETERIA");
          if (newCat.success && newCat.data) ferreteriaId = newCat.data;
        }
      }

      const cleanPrice = (val: any) => {
        if (!val) return 0;
        if (typeof val === "number") return val;
        return parseFloat(String(val).replace(/[$,]/g, "")) || 0;
      };

      const getMedida = (val: any) => {
        const v = String(val || "").toLowerCase();
        if (v.includes("metro")) return "METRO";
        if (v.includes("kilo") || v.includes("kg")) return "KILO";
        if (v.includes("rollo")) return "ROLLO";
        if (v.includes("set")) return "SET";
        if (v.includes("juego")) return "JUEGO";
        if (v.includes("litro")) return "LITRO";
        if (v.includes("galon")) return "GALON";
        if (v.includes("caja")) return "CAJA";
        if (v.includes("tramo")) return "TRAMO";
        return "UNIDAD";
      };

      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0) continue;

        const codigoInterno = String(row[idxCodigoInterno] || "").trim();
        const nombre = String(row[idxDesc] || "").trim();

        if (!codigoInterno || !nombre) continue;

        // EAN logic
        let codigoBarras = "";
        if (idxEan !== -1) {
          const rawEan = String(row[idxEan] || "");
          // Simple check: if explicit E notation, fix it, else assume string
          // Excel ean might be number.
          if (rawEan.length >= 8 && rawEan.length <= 14) codigoBarras = rawEan;
        }

        const precioCompra = cleanPrice(
          idxPCompra !== -1 ? row[idxPCompra] : 0,
        );
        const precioVenta = cleanPrice(idxPVenta !== -1 ? row[idxPVenta] : 0);
        const precioMayoreo =
          idxPMayoreo !== -1 ? cleanPrice(row[idxPMayoreo]) : undefined;
        const precioDistribuidor =
          idxPDistribuidor !== -1
            ? cleanPrice(row[idxPDistribuidor])
            : undefined;
        const marca =
          idxMarca !== -1
            ? String(row[idxMarca] || "TRUPER").toUpperCase()
            : "TRUPER";
        const unidad = idxUnidad !== -1 ? getMedida(row[idxUnidad]) : "UNIDAD";

        const prod: ProductoInput = {
          codigo_barras: codigoBarras || undefined,
          codigo_interno: codigoInterno,
          nombre: nombre,
          descripcion: nombre, // Use name as description default
          marca: marca || "TRUPER",
          proveedor: "TRUPER",
          tipo_medida: unidad,
          categoria_id: ferreteriaId,
          precio_compra: precioCompra,
          precio_venta: precioVenta,
          precio_mayoreo: precioMayoreo,
          precio_distribuidor: precioDistribuidor,
          facturable: true,
          stock: 0, // New products default to 0 stock
        };

        processedData.push(prod);
        if (previews.length < 5) {
          previews.push({
            codigo: codigoInterno,
            nombre,
            precio: precioVenta,
            unidad,
          });
        }
      }

      setDatosProcesados(processedData);
      setPrevisualizacion(previews);
      setError(null);
      setStats(null);
    } catch (err: any) {
      setError(err.message || "Error al procesar el archivo.");
      setPrevisualizacion([]);
      setDatosProcesados([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      setArchivo(file);
      processFile(file);
    } else {
      setError("Por favor sube un archivo Excel válido (xlsx, xls)");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      processFile(file);
    }
  };

  const handleImportar = async () => {
    if (datosProcesados.length === 0) return;

    setImportando(true);
    setError(null);
    try {
      // Send in one chunk since we implemented bulk in Rust
      // If > 2000 items, maybe specific chunking is better, but Rust SQLite tx handles thousands easily.
      // IPC limit might be an issue (few MBs).
      // 5000 items * 200 bytes = 1MB. Should be fine.

      const response = await api.importarProductosTruper(datosProcesados);

      if (response.success) {
        setStats(response.message); // Should contain "Importación completada..."
        setArchivo(null);
        setPrevisualizacion([]);
        setDatosProcesados([]);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError("Error de comunicación: " + err.message);
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {stats && (
        <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-xl border border-emerald-500/30 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{stats}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 text-red-400 p-4 rounded-xl border border-red-500/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 lg:p-12 text-center cursor-pointer transition-all duration-300
          ${arrastrando
            ? "border-amber-500 bg-amber-500/10"
            : archivo
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-slate-700 hover:border-slate-600 bg-slate-900"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {archivo ? (
          <div className="space-y-3">
            <div className="w-14 h-14 lg:w-16 lg:h-16 mx-auto bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-7 h-7 lg:w-8 lg:h-8 text-emerald-400" />
            </div>
            <p className="text-sm lg:text-lg font-medium text-white">
              {archivo.name}
            </p>
            <p className="text-xs lg:text-sm text-slate-400">
              {(archivo.size / 1024).toFixed(1)} KB — {datosProcesados.length}{" "}
              productos detectados
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setArchivo(null);
                setPrevisualizacion([]);
                setDatosProcesados([]);
                setError(null);
                setStats(null);
              }}
              className="text-xs lg:text-sm text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-14 h-14 lg:w-16 lg:h-16 mx-auto bg-slate-800 rounded-xl flex items-center justify-center">
              <CloudUpload className="w-7 h-7 lg:w-8 lg:h-8 text-slate-500" />
            </div>
            <p className="text-sm lg:text-lg font-medium text-white">
              {arrastrando
                ? "Suelta el archivo aquí"
                : "Arrastra tu archivo Excel de Truper aquí"}
            </p>
            <p className="text-xs lg:text-sm text-slate-400">
              o haz clic para seleccionar
            </p>
          </div>
        )}
      </div>

      {/* Format Info */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 lg:p-5">
        <h3 className="text-sm lg:text-lg font-semibold text-white mb-3 lg:mb-4">
          Columnas Excel TRUPER
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            {
              col: "Código",
              example: "100048",
              desc: "1ra columna → Código Interno",
            },
            {
              col: "Descripción",
              example: "Llave ajustable MM00",
              desc: "Nombre del producto",
            },
            { col: "EAN", example: "7506244E+12", desc: "Código de barras" },
            { col: "Precio", example: "585", desc: "Precio de venta" },
          ].map((item) => (
            <div
              key={item.col}
              className="bg-slate-800/50 rounded-lg p-3 lg:p-4"
            >
              <span className="text-xs lg:text-sm font-bold text-amber-500 block mb-1">
                {item.col}
              </span>
              <p className="text-xs text-slate-400">{item.example}</p>
              <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Table */}
      {previsualizacion.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 lg:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm lg:text-lg font-semibold text-white">
                Previsualización
              </h3>
              <p className="text-xs lg:text-sm text-slate-400">
                Mostrando primeros {previsualizacion.length} de{" "}
                {datosProcesados.length} productos
              </p>
            </div>
            <button
              onClick={handleImportar}
              disabled={importando}
              className="flex items-center justify-center gap-2 px-4 lg:px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-400 text-slate-900 text-xs lg:text-sm font-bold rounded-lg transition-colors"
            >
              {importando ? (
                <>
                  <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                  Procesando Importación...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4 lg:w-5 lg:h-5" />
                  Confirmar e Importar
                </>
              )}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-3 lg:px-5 py-2 lg:py-3">
                    Código (Clave)
                  </th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-3 lg:px-5 py-2 lg:py-3">
                    Nombre
                  </th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-3 lg:px-5 py-2 lg:py-3">
                    Precio Venta
                  </th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-3 lg:px-5 py-2 lg:py-3">
                    Unidad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {previsualizacion.map((prod, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-3 lg:px-5 py-3 lg:py-4 text-xs lg:text-sm text-amber-500 font-mono font-medium">
                      {prod.codigo}
                    </td>
                    <td className="px-3 lg:px-5 py-3 lg:py-4 text-xs lg:text-sm text-white">
                      {prod.nombre}
                    </td>
                    <td className="px-3 lg:px-5 py-3 lg:py-4 text-xs lg:text-sm text-emerald-400 font-medium">
                      ${prod.precio.toFixed(2)}
                    </td>
                    <td className="px-3 lg:px-5 py-3 lg:py-4 text-xs lg:text-sm text-slate-300">
                      {prod.unidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
