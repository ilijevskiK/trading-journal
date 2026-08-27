"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Discipline score and win rate over time — both naturally 0-100, so they
// share one Y-axis without needing a dual-axis chart. Same visual language
// as EquityCurveChart/RMultipleChart (colors, grid, tooltip styling).
export default function ReviewTrendChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-parchment-faint text-sm">
        Log trades across at least two months to start plotting a trend.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#2C313F" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "#6B7180", fontSize: 11 }}
          axisLine={{ stroke: "#2C313F" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#6B7180", fontSize: 11 }}
          axisLine={{ stroke: "#2C313F" }}
          tickLine={false}
          width={40}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: "#232838",
            border: "1px solid #2C313F",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#9AA0AC" }}
          formatter={(value) => `${value}%`}
        />
        <Legend
          verticalAlign="top"
          align="left"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, color: "#9AA0AC" }}
        />
        <Line
          type="monotone"
          dataKey="discipline"
          name="Discipline score"
          stroke="#C9A24B"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="winRate"
          name="Win rate"
          stroke="#4FAF8B"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
