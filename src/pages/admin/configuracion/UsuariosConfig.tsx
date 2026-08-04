import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, Save, X, RefreshCw } from "lucide-react";
import { api, Usuario, UsuarioInput } from "../../../api/tauri";
import { notify } from "../../../utils/sileo";
import { Select } from "../../../components/ui/Select";

export function UsuariosConfig() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("normal");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  async function cargarUsuarios() {
    setLoading(true);
    try {
      const res = await api.listarUsuarios();
      if (res.success && res.data) {
        setUsuarios(res.data);
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (error) {
      console.error("Error al cargar usuarios", error);
      notify.error({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleOpenNew = () => {
    setEditingId(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setRol("normal");
    setShowModal(true);
  };

  const handleOpenEdit = (u: Usuario) => {
    setEditingId(u.id);
    setNombre(u.nombre);
    setEmail(u.email);
    setPassword("");
    setRol(u.rol);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    notify.warning({
      title: "Eliminar Usuario",
      description: "¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.",
      button: {
        title: "Sí, eliminar",
        onClick: async () => {
          try {
            const res = await api.eliminarUsuario(id);
            if (res.success) {
              notify.success({
                title: "Eliminado",
                description: "Usuario eliminado correctamente.",
              });
              cargarUsuarios();
            } else {
              notify.error({ title: "Error", description: res.message });
            }
          } catch (error) {
            notify.error({
              title: "Error",
              description: "No se pudo eliminar el usuario.",
            });
          }
        },
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: UsuarioInput = {
        id: editingId || undefined,
        nombre,
        email,
        rol,
      };

      if (password) {
        payload.password = password;
      }

      const res = await api.guardarUsuario(payload);

      if (res.success) {
        notify.success({
          title: "Guardado",
          description: "Usuario guardado correctamente.",
        });
        setShowModal(false);
        cargarUsuarios();
      } else {
        notify.error({ title: "Error", description: res.message });
      }
    } catch (error) {
      notify.error({
        title: "Error",
        description: "Ocurrió un error al guardar el usuario.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col gap-6 h-full min-h-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-900/30 flex items-center justify-center text-orange-400">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Administración de Usuarios
            </h2>
            <p className="text-sm text-slate-400">
              Gestiona los accesos y perfiles de los vendedores
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nuevo Usuario
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 min-h-0 border border-slate-800/50 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-y border-slate-700/50">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email / Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  Cargando usuarios...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {u.nombre}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.rol === "admin"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingId ? "Editar Usuario" : "Nuevo Usuario"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors border border-slate-700 bg-slate-800/80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Email / Usuario
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors border border-slate-700 bg-slate-800/80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Contraseña{" "}
                  {editingId && (
                    <span className="text-slate-500 font-normal">
                      (Dejar en blanco para no cambiar)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors border border-slate-700 bg-slate-800/80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                  <span>Rol</span>
                  {editingId && usuarios.find((u) => u.id === editingId)?.rol === "admin" && (
                    <span className="text-amber-400/80 font-normal text-[10px] bg-amber-900/20 px-2 py-0.5 rounded">No se puede cambiar el rol de un Administrador</span>
                  )}
                </label>
                <Select
                  value={rol}
                  onChange={(val) => setRol(val)}
                  disabled={editingId ? usuarios.find((u) => u.id === editingId)?.rol === "admin" : false}
                  options={[
                    { value: "normal", label: "Vendedor (Normal)" },
                    { value: "admin", label: "Administrador" },
                  ]}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
              >
                {saving ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
