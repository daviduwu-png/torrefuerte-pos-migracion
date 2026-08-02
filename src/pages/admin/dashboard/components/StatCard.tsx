import { ElementType } from "react";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  icon: ElementType;
  color: string;
  shadow: string;
  border: string;
}

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
  shadow,
  border,
}: StatCardProps) {
  return (
    <div
      className={`glass-card p-4 rounded-2xl group border-l-4 ${border} relative overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 relative z-10">
          <p className="text-slate-400 text-[10px] md:text-xs font-bold truncate uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl xl:text-2xl font-black text-white mt-1.5 tracking-tight truncate">
            {value}
          </p>
          <div className="mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white font-bold border border-white/5 uppercase">
              {change}
            </span>
          </div>
        </div>
        <div
          className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${shadow} group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}
        >
          <Icon className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
        </div>
      </div>
      <div
        className={`absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br ${color} opacity-10 rounded-full pointer-events-none group-hover:opacity-20 transition-opacity`}
      />
    </div>
  );
}
