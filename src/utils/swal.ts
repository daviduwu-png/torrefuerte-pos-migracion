import Swal from "sweetalert2";

export const StyledSwal = Swal.mixin({
  background: "#0f172a",
  color: "#fff",
  confirmButtonColor: "#3b82f6",
  cancelButtonColor: "#64748b",
  customClass: {
    popup: "rounded-xl border border-white/10 shadow-2xl glass-panel",
    title: "text-white font-bold",
    htmlContainer: "text-slate-300",
    confirmButton: "font-bold shadow-lg shadow-blue-500/20",
    cancelButton: "font-bold shadow-lg shadow-slate-500/20",
  },
});
