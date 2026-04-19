import { useState } from "react";
import {
  Download,
  Upload,
  Info,
  FolderOpen,
  Database,
  RotateCcw,
} from "lucide-react";
import { StyledSwal as Swal } from "../../utils/swal";
import { api } from "../../api/tauri";

export default function BaseDatos() {
  const [loading, setLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const handleBackup = async () => {
    const result = await Swal.fire({
      title: "¿Generar Respaldo Manual?",
      text: "Se guardará en tu carpeta personal: TorreFuerte/Respaldos/Manuales",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0f766e",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, crear",
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const res = await api.crearRespaldo("manual");

        if (res.success) {
          await Swal.fire({
            title: "¡Respaldo Creado!",
            html: `El respaldo se ha generado exitosamente.<br/><br/><small className="text-slate-400">Ubicación: ${res.data || ""}</small>`,
            icon: "success",
            confirmButtonColor: "#3b82f6",
          });
        } else {
          throw new Error(res.message);
        }
      } catch (error: any) {
        console.error(error);
        await Swal.fire({
          title: "Error",
          text: error.message || "No se pudo generar el respaldo.",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const filePath = (file as any).path || file.name;
      const fileWithPath = new File([arrayBuffer], file.name);
      (fileWithPath as any).path = filePath;

      setRestoreFile(fileWithPath);
    } catch (error) {
      console.error("Error al procesar archivo:", error);
      setRestoreFile(file);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      await Swal.fire({
        title: "Atención",
        text: "Selecciona un archivo primero",
        icon: "warning",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    const result = await Swal.fire({
      title: "¿Restaurar Base de Datos?",
      html: `Se reemplazará la información actual por la del archivo: <b>${restoreFile.name}</b>.<br><br>
             <span class='text-red-400'>Se creará un respaldo de seguridad automático antes de proceder.</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, restaurar",
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(restoreFile);

        reader.onload = async () => {
          const base64 = reader.result?.toString().split(",")[1];

          if (!base64) {
            throw new Error("Error al leer el archivo");
          }

          try {
            const res = await api.restaurarBaseDatos(base64);

            if (res.success) {
              await Swal.fire({
                title: "¡Éxito!",
                text: "Base de datos restaurada. El sistema se reiniciará ahora.",
                icon: "success",
                confirmButtonColor: "#3b82f6",
              }).then(() => {
                window.location.reload();
              });
            } else {
              throw new Error(res.message);
            }
          } catch (error: any) {
            console.error(error);
            await Swal.fire({
              title: "Error",
              text: error.message || "Fallo en la restauración",
              icon: "error",
            });
          } finally {
            setLoading(false);
          }
        };

        reader.onerror = () => {
          setLoading(false);
          Swal.fire({
            title: "Error",
            text: "Error al leer el archivo",
            icon: "error",
          });
        };
      } catch (error: any) {
        console.error(error);
        await Swal.fire({
          title: "Error",
          text: error.message || "Fallo en la restauración",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Operations Card */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden border border-amber-500/20">
          <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-amber-500">Operaciones Críticas</h3>
          </div>

          <div className="p-6 space-y-8">
            {/* Manual Backup Section */}
            <div className="space-y-4 pb-8 border-b border-white/5">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl flex-shrink-0">
                  <Download className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">
                    Respaldo Manual
                  </h4>
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                    Genera una copia completa de la base de datos en tu carpeta{" "}
                    <code className="bg-slate-900 px-2 py-1 rounded text-slate-300">
                      TorreFuerte/Respaldos/Manuales
                    </code>
                    . Es recomendable hacer esto antes de realizar cambios
                    importantes.
                  </p>
                  <button
                    onClick={handleBackup}
                    disabled={loading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    Generar Copia de Seguridad
                  </button>
                </div>
              </div>
            </div>

            {/* Restore Section */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/20 rounded-xl flex-shrink-0">
                  <Upload className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0"> {/* min-w-0 ayuda a que el truncate funcione bien en flex */}
                  <h4 className="text-lg font-bold text-red-400 mb-2">
                    Restaurar Sistema
                  </h4>
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                    Carga un archivo <code>.db</code> o <code>.sqlite</code>{" "}
                    previamente respaldado. <br />
                    <span className="text-red-400 font-bold">
                      ADVERTENCIA:
                    </span>{" "}
                    Esta acción reemplazará todos los datos actuales
                    (inventario, ventas, etc).
                  </p>

                  {/* Rediseño: Apilado vertical para dar más espacio horizontal */}
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="w-full">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                        Seleccionar archivo de respaldo
                      </label>
                      <div className="relative group cursor-pointer">
                        <input
                          type="file"
                          accept=".db,.sqlite,.sqlite3"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center w-full">
                          <div className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2.5 rounded-l-lg group-hover:bg-slate-700 transition-colors flex items-center gap-2 shrink-0">
                            <FolderOpen className="w-4 h-4" /> Examinar
                          </div>
                          <div className="bg-slate-900 border-y border-r border-slate-700 text-slate-400 px-4 py-2.5 rounded-r-lg flex-1 truncate text-sm">
                            {restoreFile
                              ? restoreFile.name
                              : "Ningún archivo seleccionado"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botón alineado a la derecha */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleRestore}
                        disabled={loading}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-5 h-5" />
                        )}
                        Restaurar Ahora
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="glass-card p-6 rounded-2xl h-fit">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
            <div>
              <h6 className="font-bold text-white mb-2">
                Información Automática
              </h6>
              <p className="text-sm text-slate-400 leading-relaxed">
                El sistema realiza un respaldo automático seguro todos los días al{" "}
                <span className="text-blue-300 font-bold">iniciar sesión</span> en la carpeta{" "}
                <code className="text-blue-300 bg-blue-500/10 px-1 rounded">
                  TorreFuerte/Respaldos/Automaticos
                </code>
                . Se guardan los últimos 7 días para mayor seguridad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}