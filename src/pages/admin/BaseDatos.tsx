import { useState, useEffect } from "react";
import {
  Download,
  Upload,
  Info,
  FolderOpen,
  Database,
  RotateCcw,
  Cloud,
  Check,
  Save,
  Server
} from "lucide-react";
import { StyledSwal as Swal } from "../../utils/swal";
import { api } from "../../api/tauri";

export default function BaseDatos() {
  const [loading, setLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // R2 Config State
  const [r2Config, setR2Config] = useState({
    enabled: false,
    accessKey: "",
    secretKey: "",
    endpoint: "",
    bucketName: ""
  });
  const [testingR2, setTestingR2] = useState(false);
  const [savingR2, setSavingR2] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.obtenerConfiguracion();
        if (res.success && res.data) {
          setR2Config({
            enabled: res.data.r2_enabled === "true",
            accessKey: res.data.r2_access || "",
            secretKey: res.data.r2_secret || "",
            endpoint: res.data.r2_endpoint || "",
            bucketName: res.data.r2_bucket || ""
          });
        }
      } catch (err) {
        console.error("Error al cargar configuración", err);
      }
    };
    fetchConfig();
  }, []);

  const handleBackup = async () => {
    const result = await Swal.fire({
      title: "¿Generar Respaldo Manual?",
      text: "Se guardará localmente y, si está configurado, se enviará a R2.",
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
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = reader.result?.toString().split(",")[1];
            if (!b64) reject(new Error("Error al leer el archivo"));
            else resolve(b64);
          };
          reader.onerror = () => reject(new Error("Error al leer el archivo"));
          reader.readAsDataURL(restoreFile);
        });

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
    }
  };

  const handleTestR2 = async () => {
    setTestingR2(true);
    try {
      const res = await api.probarConexionR2(
        r2Config.accessKey,
        r2Config.secretKey,
        r2Config.endpoint,
        r2Config.bucketName
      );
      if (res.success) {
        Swal.fire({
          title: "Conexión Exitosa",
          text: "Las credenciales de Cloudflare R2 son correctas.",
          icon: "success",
          confirmButtonColor: "#10b981"
        });
      } else {
        throw new Error(res.message);
      }
    } catch(err: any) {
      Swal.fire("Error de Conexión", err.message || "No se pudo conectar a R2", "error");
    } finally {
      setTestingR2(false);
    }
  };

  const handleSaveR2 = async () => {
    setSavingR2(true);
    try {
      await api.guardarConfiguracion({
        r2_enabled: r2Config.enabled ? "true" : "false",
        r2_access: r2Config.accessKey,
        r2_secret: r2Config.secretKey,
        r2_endpoint: r2Config.endpoint,
        r2_bucket: r2Config.bucketName,
      });
      Swal.fire({
          title: "¡Guardado!",
          text: "Configuración R2 guardada correctamente.",
          icon: "success",
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
      });
    } catch(err: any) {
       Swal.fire("Error", err.message || "Fallo al guardar", "error");
    } finally {
      setSavingR2(false);
    }
  };

  return (
    <div className="w-full h-full pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full items-stretch animate-in fade-in duration-300">
        
        {/* Main Operations Card (Left) */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-amber-500/20 flex flex-col">
          <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 shrink-0">
            <Database className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-amber-500">Gestión Local de Base de Datos</h3>
          </div>

          <div className="p-6 space-y-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar min-h-0">
            {/* Manual Backup & Auto Info stacked */}
            <div className="flex flex-col gap-6 pb-6 border-b border-white/5">
              {/* Manual Backup Section */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl flex-shrink-0">
                  <Download className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">
                    Respaldo Manual
                  </h4>
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                    Genera una copia completa en tu carpeta{" "}
                    <code className="bg-slate-900 px-2 py-1 rounded text-slate-300 break-all inline-block mt-1">
                      TorreFuerte/Respaldos/Manuales
                    </code>
                    . Muy recomendable antes de cambios importantes.
                  </p>
                  <button
                    onClick={handleBackup}
                    disabled={loading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-fit text-sm"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Generar Copia Local
                  </button>
                </div>
              </div>

              {/* Automatic Info Section */}
              <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h6 className="font-bold text-blue-400 mb-2">
                    Respaldos Automáticos
                  </h6>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    El sistema realiza copias de seguridad solas todos los días al{" "}
                    <span className="text-blue-300 font-bold">iniciar sesión</span>.
                    <br />
                    Se guardan en:{" "}
                    <code className="text-blue-300 bg-blue-500/10 px-1 rounded break-all inline-block mt-1">
                      TorreFuerte/Respaldos/Automaticos
                    </code>
                    <br />
                    <span className="text-slate-500 mt-2 inline-block">Mantiene el historial de 7 días.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Restore Section */}
            <div className="pt-2 flex-1 flex flex-col">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-red-500/20 rounded-xl flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <h4 className="text-lg font-bold text-red-400 mb-2">
                    Restaurar Sistema
                  </h4>
                  <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                    Carga un archivo <code>.db</code> o <code>.sqlite</code>{" "}
                    previamente respaldado. <br />
                    <span className="text-red-400 font-bold">
                      ADVERTENCIA:
                    </span>{" "}
                    Esta acción reemplazará todos los datos actuales.
                  </p>

                  <div className="flex flex-col gap-4 mt-auto">
                    <div className="w-full">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                        Seleccionar archivo
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

                    <button
                      onClick={handleRestore}
                      disabled={loading}
                      className="w-full px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                      Restaurar Ahora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cloud Integration Card (Right) */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-cyan-500/20 flex flex-col">
          <div className="px-6 py-4 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-cyan-500" />
              <h3 className="font-bold text-cyan-500 truncate">Sincronización en Nube (S3 / R2)</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={r2Config.enabled}
                onChange={(e) => setR2Config({ ...r2Config, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar min-h-0">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 bg-cyan-500/20 rounded-xl flex-shrink-0 hidden sm:block">
                <Server className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1 flex flex-col">
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Configura tus credenciales de Cloudflare R2 o S3 para respaldar tus bases de datos automáticamente en la nube de manera silenciosa.
                </p>

                <div className="grid grid-cols-1 gap-4 flex-1">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Endpoint (URL)
                    </label>
                    <input
                      type="text"
                      value={r2Config.endpoint}
                      onChange={(e) => setR2Config({ ...r2Config, endpoint: e.target.value })}
                      placeholder="ej. https://<id>.r2.cloudflarestorage.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                      disabled={!r2Config.enabled}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Bucket Name
                    </label>
                    <input
                      type="text"
                      value={r2Config.bucketName}
                      onChange={(e) => setR2Config({ ...r2Config, bucketName: e.target.value })}
                      placeholder="ej. torrefuerte-backups"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                      disabled={!r2Config.enabled}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Access Key ID
                    </label>
                    <input
                      type="text"
                      value={r2Config.accessKey}
                      onChange={(e) => setR2Config({ ...r2Config, accessKey: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                      disabled={!r2Config.enabled}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Secret Access Key
                    </label>
                    <input
                      type="password"
                      value={r2Config.secretKey}
                      onChange={(e) => setR2Config({ ...r2Config, secretKey: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                      disabled={!r2Config.enabled}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-6 border-t border-white/5">
                  <button
                    onClick={handleTestR2}
                    disabled={!r2Config.enabled || testingR2 || !r2Config.accessKey}
                    className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {testingR2 ? (
                      <span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Probar Conexión
                  </button>
                  <button
                    onClick={handleSaveR2}
                    disabled={savingR2}
                    className="w-full sm:flex-1 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingR2 ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}