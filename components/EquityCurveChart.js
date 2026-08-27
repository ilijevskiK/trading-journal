"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Two series on one timeline (see lib/calc.js's computeEquityCurve): the
// gold area is the real account balance (deposits + trading P&L), the
// dashed gray line is just money contributed (deposits only, untouched by
// trading). The vertical gap between them at any point is cumulative
// trading P&L — that gap is the whole point of showing both.
export default function EquityCurveChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-parchment-faint text-sm">
        Close a trade to start plotting your equity curve.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A24B" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C9A24B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#2C313F" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6B7180", fontSize: 11 }}
          axisLine={{ stroke: "#2C313F" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: "#6B7180", fontSize: 11 }}
          axisLine={{ stroke: "#2C313F" }}
          tickLine={false}
          width={70}
          tickFormatter={(v) => `$${v.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            background: "#232838",
            border: "1px solid #2C313F",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#9AA0AC" }}
          formatter={(value) => `$${Number(value).toLocaleString()}`}
        />
        <Legend
          verticalAlign="top"
          align="left"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, color: "#9AA0AC" }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          name="Equity (incl. trading P&L)"
          stroke="#E0BE6E"
          strokeWidth={2}
          fill="url(#equityFill)"
        />
        <Line
          type="monotone"
          dataKey="contributed"
          name="Money you put in"
          stroke="#9AA0AC"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}