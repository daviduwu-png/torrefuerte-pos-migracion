/**
 * Utilidades para formateo consistente de fechas en la aplicación
 * IMPORTANTE: Las fechas vienen del backend en formato "YYYY-MM-DD HH:MM:SS" (hora local de México)
 * Se deben interpretar como locales, NO como UTC
 */

/**
 * Convierte una fecha del backend a objeto Date sin desajuste de zona horaria
 * El backend envía fechas en formato "YYYY-MM-DD HH:MM:SS" que son LOCALES
 */
function parseFechaLocal(fecha: string | Date): Date {
  if (fecha instanceof Date) {
    return fecha;
  }

  // Si la fecha viene en formato "YYYY-MM-DD HH:MM:SS", interpretarla como local
  // Reemplazar espacio con "T" para que JavaScript la interprete como local
  const fechaStr = fecha.replace(" ", "T");

  // Si no tiene componente de tiempo, agregar medianoche para evitar desajustes
  if (!fechaStr.includes("T") && !fechaStr.includes(":")) {
    return new Date(fechaStr + "T00:00:00");
  }

  return new Date(fechaStr);
}

/**
 * Formatea una fecha a formato local legible (fecha y hora)
 * Ejemplo: "9/2/2026, 10:19:24"
 */
export function formatFechaHora(fecha: string | Date): string {
  return parseFechaLocal(fecha).toLocaleString("es-MX", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Formatea una fecha a formato local legible (solo fecha)
 * Ejemplo: "9 de febrero de 2026"
 */
export function formatFecha(fecha: string | Date): string {
  return parseFechaLocal(fecha).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

/**
 * Formatea una fecha a formato corto
 * Ejemplo: "09/02/2026"
 */
export function formatFechaCorta(fecha: string | Date): string {
  return parseFechaLocal(fecha).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Formatea una fecha a formato compacto con hora
 * Ejemplo: "09/02/2026 10:19"
 * ESTE ES EL FORMATO PRINCIPAL USADO EN LA APP
 */
export function formatFechaHoraCorta(fecha: string | Date): string {
  return parseFechaLocal(fecha).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // Formato 24 horas
  });
}

/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD)
 * Útil para inputs de tipo date
 * IMPORTANTE: Devuelve la fecha LOCAL, no UTC
 */
export function getFechaHoy(): string {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha relativa (hace X tiempo)
 * Ejemplo: "Hace 2 horas", "Hace 3 días"
 */
export function formatFechaRelativa(fecha: string | Date): string {
  const ahora = new Date();
  const fechaObj = parseFechaLocal(fecha);
  const diff = ahora.getTime() - fechaObj.getTime();

  const segundos = Math.floor(diff / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (dias > 7) {
    return formatFechaCorta(fecha);
  } else if (dias > 0) {
    return `Hace ${dias} día${dias > 1 ? "s" : ""}`;
  } else if (horas > 0) {
    return `Hace ${horas} hora${horas > 1 ? "s" : ""}`;
  } else if (minutos > 0) {
    return `Hace ${minutos} minuto${minutos > 1 ? "s" : ""}`;
  } else {
    return "Hace un momento";
  }
}
