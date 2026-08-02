import { ElementType } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartData } from "../types";

export const tooltipStyle = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};

interface ChartCardProps {
  title: string;
  subtitle: string;
  icon: ElementType;
  iconColor: string;
  iconBg: string;
  data: ChartData[];
  type: "line" | "bar";
  chartColor: string;
  xAxisAngle?: number;
}

export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  data,
  type,
  chartColor,
  xAxisAngle = 0,
}: ChartCardProps) {
  return (
    <div className="glass-card p-4 rounded-2xl flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                style={{ fontSize: "10px" }}
                tickMargin={8}
                angle={xAxisAngle}
                textAnchor={xAxisAngle !== 0 ? "end" : "middle"}
                height={xAxisAngle !== 0 ? 40 : 30}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: "10px" }}
                tickFormatter={(val) => `$${val.toLocaleString("en-US")}`}
                width={60}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val: number | undefined) => [`$${(val ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Ventas"]}
              />
              <Line
                type="monotone"
                dataKey="ventas"
                stroke={chartColor}
                strokeWidth={3}
                dot={{ fill: chartColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                style={{ fontSize: "10px" }}
                tickMargin={8}
                angle={xAxisAngle}
                textAnchor={xAxisAngle !== 0 ? "end" : "middle"}
                height={xAxisAngle !== 0 ? 40 : 30}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: "10px" }}
                tickFormatter={(val) => `$${val.toLocaleString("en-US")}`}
                width={60}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "#334155", opacity: 0.4 }}
                formatter={(val: number | undefined) => [`$${(val ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Ventas"]}
              />
              <Bar dataKey="ventas" fill={chartColor} radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
