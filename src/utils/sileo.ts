import { sileo, SileoOptions } from "sileo";

/**
 * Wrapper for Sileo notifications to allow a minimum reading time,
 * auto-dismiss after a while, or dismiss on click/keypress after the reading time.
 */
function showWithDismiss(
  fn: (opts: SileoOptions) => string,
  opts: SileoOptions,
) {
  // Por defecto dura 10 segundos
  const duration = opts.duration !== undefined ? opts.duration : 10000;

  const id = fn({ ...opts, duration });

  const clear = () => {
    sileo.dismiss(id);
    window.removeEventListener("keydown", clear);
    window.removeEventListener("mousedown", clear);
  };

  // 5 segundos de gracia antes de permitir que un click lo cierre
  setTimeout(() => {
    window.addEventListener("keydown", clear);
    window.addEventListener("mousedown", clear);
  }, 5000);

  // Limpiamos los eventos si se cierra por auto-dismiss
  if (duration !== null) {
    setTimeout(() => {
      window.removeEventListener("keydown", clear);
      window.removeEventListener("mousedown", clear);
    }, duration + 100);
  }

  return id;
}

function withTitleColor(colorClass: string, opts: SileoOptions): SileoOptions {
  return {
    ...opts,
    styles: {
      ...opts.styles,
      title: `${colorClass} !font-bold !text-xl ${opts.styles?.title || ''}`.trim()
    }
  };
}

export const notify = {
  success: (opts: SileoOptions) => showWithDismiss(sileo.success, withTitleColor("!text-emerald-500", opts)),
  error: (opts: SileoOptions) => showWithDismiss(sileo.error, withTitleColor("!text-red-500", opts)),
  info: (opts: SileoOptions) => showWithDismiss(sileo.info, withTitleColor("!text-blue-500", opts)),
  warning: (opts: SileoOptions) => {
    const coloredOpts = withTitleColor("!text-amber-500", opts);
    // Si tiene un botón, le damos aún más tiempo
    if (opts.button) {
      return sileo.warning({ ...coloredOpts, duration: 15000 });
    }
    return showWithDismiss(sileo.warning, coloredOpts);
  },
};
