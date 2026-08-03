import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../api/tauri";
import {
  Printer,
  RefreshCw,
  Save,
  ChevronDown,
  Check,
  Plus,
  X,
} from "lucide-react";
import { notify } from "../../../utils/sileo";

// --- CUSTOM SELECT COMPONENT ---
function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((o) => o.id === value)?.label || "Seleccionar...";

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between glass-input bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 transition-all text-left shadow-sm"
      >
        <span className="truncate pr-2">{selectedLabel}</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                Sin opciones
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${
                      value === opt.id
                        ? "bg-blue-600/20 text-blue-400 font-medium"
                        : "text-slate-300 hover:bg-slate-700/50"
                    }`}
                  >
                    <Check
                      size={16}
                      className={value === opt.id ? "opacity-100" : "opacity-0"}
                    />
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
// -------------------------------

export function ImpresorasConfig() {
  const [impresorasList, setImpresorasList] = useState<string>(
    "Cargando información...",
  );
  const [loadingList, setLoadingList] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<
    { id: string; label: string }[]
  >([]);
  const [availableUris, setAvailableUris] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrinterName, setNewPrinterName] = useState("Etiquetas");
  const [selectedUri, setSelectedUri] = useState("");
  const [registering, setRegistering] = useState(false);

  const [printerTickets, setPrinterTickets] = useState<string>("auto");
  const [printerEtiquetas, setPrinterEtiquetas] = useState<string>("auto");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Cargar config actual de localStorage
    const savedTickets = localStorage.getItem("printer_tickets") || "auto";
    const savedEtiquetas = localStorage.getItem("printer_etiquetas") || "auto";
    setPrinterTickets(savedTickets);
    setPrinterEtiquetas(savedEtiquetas);

    cargarImpresoras();
  }, []);

  async function cargarImpresoras() {
    setLoadingList(true);
    try {
      const res = await api.listarImpresoras();
      if (res.success && res.data) {
        setImpresorasList(res.data);
        parsePrinters(res.data);
      } else {
        setImpresorasList(
          "No se pudo obtener la lista de impresoras.\n" + (res.message || ""),
        );
      }
    } catch (error) {
      setImpresorasList("Error de conexión al buscar impresoras.");
    } finally {
      setLoadingList(false);
    }
  }

  function parsePrinters(data: string) {
    const printers: { id: string; label: string }[] = [];
    const uris: string[] = [];

    // Parse CUPS printers
    const lines = data.split("\n");
    let inCupsSection = false;

    for (const line of lines) {
      if (line.startsWith("[CUPS] Impresoras registradas:")) {
        inCupsSection = true;
        continue;
      }
      if (inCupsSection && line.startsWith("[")) {
        inCupsSection = false;
      }
      if (
        inCupsSection &&
        line.trim().length > 0 &&
        !line.includes("Sin impresoras")
      ) {
        const printerName = line.split(" ")[0];
        if (printerName) {
          printers.push({ id: printerName, label: `CUPS: ${printerName}` });
        }
      }

      // Parse URIs para el modal
      if (line.startsWith("direct ")) {
        const uri = line.replace("direct ", "").trim();
        // Ignorar el driver HPLIP genérico que siempre aparece en Linux Mint
        if (uri && uri !== "hp" && uri !== "hpfax") {
          uris.push(uri);
        }
      }

      if (line.startsWith("[Dispositivos detectados] ")) {
        const pathsStr = line.replace("[Dispositivos detectados] ", "").trim();
        if (pathsStr && pathsStr !== "Ninguno detectado.") {
          const paths = pathsStr.split(",").map((p) => p.trim());
          for (const p of paths) {
            if (p.startsWith("/dev/ttyS") || p.startsWith("/dev/lp")) {
              continue;
            }
            printers.push({ id: p, label: `Directo: ${p}` });
          }
        }
      }
    }

    setAvailablePrinters(printers);
    setAvailableUris(uris);
    if (uris.length > 0 && !selectedUri) {
      setSelectedUri(uris[0]);
    }
  }

  function handleGuardar() {
    setSaving(true);
    try {
      localStorage.setItem("printer_tickets", printerTickets);
      localStorage.setItem("printer_etiquetas", printerEtiquetas);
      notify.success({
        title: "Configuración guardada",
        description: "Se han actualizado las impresoras por defecto.",
      });
    } catch (error) {
      notify.error({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración local.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestTickets() {
    try {
      const target = printerTickets === "auto" ? undefined : printerTickets;
      const res = await api.imprimirTest(target);
      if (res.success) {
        notify.success({
          title: "Prueba exitosa",
          description: "Enviado a impresora de tickets.",
        });
      } else {
        notify.error({ title: "Error en prueba", description: res.message });
      }
    } catch {
      notify.error({
        title: "Error",
        description: "No se pudo enviar la prueba.",
      });
    }
  }

  async function handleTestEtiquetas() {
    try {
      const target = printerEtiquetas === "auto" ? undefined : printerEtiquetas;
      const res = await api.imprimirTest(target);
      if (res.success) {
        notify.success({
          title: "Prueba exitosa",
          description: "Enviado a impresora de etiquetas.",
        });
      } else {
        notify.error({ title: "Error en prueba", description: res.message });
      }
    } catch {
      notify.error({
        title: "Error",
        description: "No se pudo enviar la prueba.",
      });
    }
  }

  async function handleRegistrarCups(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrinterName || !selectedUri) {
      notify.error({
        title: "Faltan datos",
        description: "Completa el nombre y selecciona un dispositivo USB.",
      });
      return;
    }
    setRegistering(true);
    try {
      const fullPrinterName = "POS58_" + newPrinterName;
      const res = await api.registrarImpresoraCups(
        fullPrinterName,
        selectedUri,
      );
      if (res.success) {
        notify.success({
          title: "Impresora registrada",
          description: res.message,
        });
        setShowAddModal(false);
        cargarImpresoras(); // Recargar la lista automáticamente
      } else {
        notify.error({ title: "Error al registrar", description: res.message });
      }
    } catch (e) {
      notify.error({
        title: "Error",
        description: "Fallo la comunicación con el sistema.",
      });
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col gap-6 relative">
      {/* ADD PRINTER MODAL */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <form
              onSubmit={handleRegistrarCups}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in duration-200"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus size={20} className="text-blue-500" />
                  Registrar Impresora (CUPS)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Dispositivo Físico Detectado
                  </label>
                  <CustomSelect
                    value={selectedUri}
                    onChange={setSelectedUri}
                    options={
                      availableUris.length === 0
                        ? [
                            {
                              id: "",
                              label: "No se encontraron dispositivos USB...",
                            },
                          ]
                        : availableUris.map((uri) => ({ id: uri, label: uri }))
                    }
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Conecta la impresora por USB antes de registrarla.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Nombre en el Sistema (CUPS)
                  </label>
                  <div className="flex items-stretch">
                    <div className="flex items-center px-3 bg-slate-800 border border-slate-700 border-r-0 rounded-l-lg text-slate-400 font-mono text-sm">
                      POS58_
                    </div>
                    <input
                      type="text"
                      value={newPrinterName}
                      onChange={(e) =>
                        setNewPrinterName(e.target.value.replace(/\s+/g, "_"))
                      }
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-r-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      placeholder="Ej: Etiquetas"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Sin espacios. Este nombre aparecerá en los selectores.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registering || availableUris.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  {registering ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Registrar
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400">
            <Printer size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Configuración de Impresoras
            </h2>
            <p className="text-sm text-slate-400">
              Define qué impresora se usa para cada tarea
            </p>
          </div>
        </div>
        <button
          onClick={handleGuardar}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0">
        {/* Asignaciones */}
        <div className="flex flex-col gap-4 min-w-0">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Impresora para Tickets / Cortes
            </label>
            <div className="flex gap-3">
              <CustomSelect
                value={printerTickets}
                onChange={setPrinterTickets}
                options={[
                  {
                    id: "auto",
                    label: "Automático (Buscar en todos los puertos)",
                  },
                  ...availablePrinters,
                  { id: "1", label: "Antigua Config 1 (/dev/usb/lp0)" },
                  { id: "2", label: "Antigua Config 2 (/dev/usb/lp1 o lp2)" },
                ]}
              />
              <button
                onClick={handleTestTickets}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                Test
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Usada al vender y hacer cortes de caja.
            </p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Impresora para Etiquetas
            </label>
            <div className="flex gap-3">
              <CustomSelect
                value={printerEtiquetas}
                onChange={setPrinterEtiquetas}
                options={[
                  {
                    id: "auto",
                    label: "Automático (Buscar en todos los puertos)",
                  },
                  ...availablePrinters,
                  { id: "1", label: "Antigua Config 1 (/dev/usb/lp0)" },
                  { id: "2", label: "Antigua Config 2 (/dev/usb/lp1 o lp2)" },
                ]}
              />
              <button
                onClick={handleTestEtiquetas}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                Test
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Usada en el módulo de generación de etiquetas.
            </p>
          </div>
        </div>

        {/* Diagnóstico */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 flex flex-col overflow-hidden min-w-0 h-[400px] xl:h-auto">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              Diagnóstico del Sistema
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus size={14} />
                Añadir a CUPS
              </button>
              <button
                onClick={cargarImpresoras}
                disabled={loadingList}
                className="text-slate-400 hover:text-blue-400 transition-colors p-1"
              >
                <RefreshCw
                  size={14}
                  className={loadingList ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {loadingList ? (
              <div className="flex items-center gap-3 text-slate-400 h-full justify-center">
                <RefreshCw size={20} className="animate-spin text-blue-500" />
                <span className="text-sm">
                  Analizando hardware y configuración de CUPS...
                </span>
              </div>
            ) : (
              <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-words min-w-0">
                {impresorasList}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
