/**
 * DatePicker.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Selector de fecha propio en React puro.
 * NO usa <input type="date"> nativo → evita el bug del widget GTK en Linux
 * donde el popover del calendario se queda "plasmado" sobre la ventana Tauri.
 *
 * Props:
 *   value   – fecha seleccionada en formato "YYYY-MM-DD" (o cadena vacía)
 *   onChange – callback llamado con el nuevo valor "YYYY-MM-DD"
 *   className – clases extra para el contenedor del botón trigger
 *   placeholder – texto cuando no hay fecha seleccionada
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Select } from "./Select";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
  placeholder?: string;
  /** Fecha máxima seleccionable, formato "YYYY-MM-DD". Días posteriores quedan deshabilitados. */
  maxDate?: string;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DIAS_SEMANA = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

/** Convierte "YYYY-MM-DD" → { year, month, day } (month 0-indexed) */
function parseDate(
  val: string,
): { year: number; month: number; day: number } | null {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
  const [y, m, d] = val.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

/** Formatea { year, month, day } → "YYYY-MM-DD" */
function formatDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Texto legible para el botón trigger */
function displayDate(val: string): string {
  const parsed = parseDate(val);
  if (!parsed) return "";
  const { year, month, day } = parsed;
  return `${String(day).padStart(2, "0")} ${MESES[month].slice(0, 3)} ${year}`;
}

export default function DatePicker({
  value,
  onChange,
  className = "",
  placeholder = "Seleccionar fecha",
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Estado del mes/año que se está mostrando en el popover
  const today = new Date();
  const parsed = parseDate(value);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  // Actualizar vista cuando cambia el value desde fuera
  useEffect(() => {
    const p = parseDate(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open, handleOutsideClick]);

  // Navegar mes
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  // Celdas del grid de días
  const buildDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const selectDay = (day: number) => {
    onChange(formatDate(viewYear, viewMonth, day));
    setOpen(false);
  };

  const todayStr = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const effectiveMax = maxDate ?? undefined;
  const cells = buildDays();
  const label = displayDate(value);

  const maxParsed = effectiveMax ? parseDate(effectiveMax) : null;
  const canGoNext = maxParsed
    ? viewYear < maxParsed.year ||
      (viewYear === maxParsed.year && viewMonth < maxParsed.month)
    : true;

  const maxYear = maxParsed ? maxParsed.year : today.getFullYear();
  const years = Array.from(
    { length: maxYear - (today.getFullYear() - 10) + 1 },
    (_, i) => today.getFullYear() - 10 + i,
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Botón trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-left focus:ring-2 focus:ring-emerald-500 outline-none transition-all hover:border-slate-500"
      >
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className={label ? "text-white" : "text-slate-500"}>
          {label || placeholder}
        </span>
      </button>

      {/* ── Popover ── */}
      {open && (
        <div
          className="absolute z-[200] mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-64"
          style={{ top: "100%", left: 0 }}
        >
          {/* Cabecera: mes / año */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <Select
                value={String(viewMonth)}
                onChange={(val) => setViewMonth(Number(val))}
                options={MESES.map((m, i) => {
                  const disabled =
                    maxParsed !== null &&
                    viewYear === maxParsed.year &&
                    i > maxParsed.month;
                  return { value: String(i), label: m, disabled };
                })}
                className="w-28"
              />

              <Select
                value={String(viewYear)}
                onChange={(val) => setViewYear(Number(val))}
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
                className="w-20"
              />
            </div>

            <button
              type="button"
              onClick={nextMonth}
              disabled={!canGoNext}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cabecera días de la semana */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold text-slate-500 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-px">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} />;

              const dateStr = formatDate(viewYear, viewMonth, day);
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;
              const isFuture = effectiveMax ? dateStr > effectiveMax : false;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !isFuture && selectDay(day)}
                  disabled={isFuture}
                  className={`
                    h-8 w-full rounded-lg text-xs font-medium transition-colors
                    ${
                      isFuture
                        ? "text-slate-700 cursor-not-allowed"
                        : isSelected
                          ? "bg-emerald-500 text-white font-bold"
                          : isToday
                            ? "bg-slate-700 text-emerald-400 font-bold ring-1 ring-emerald-500/50"
                            : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Atajo: Hoy */}
          <div className="mt-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setOpen(false);
              }}
              className="w-full text-xs text-emerald-400 hover:text-emerald-300 font-medium py-1 transition-colors"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
