"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";

const GAIN = "#4FAF8B";
const GAIN_BRIGHT = "#6FCBA6";
const LOSS = "#C1573F";
const LOSS_BRIGHT = "#DB6E54";

export default function RMultipleChart({ trades, computeR }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = trades
    .filter((t) => (t.exits || []).length > 0)
    .map((t) => ({
      ticker: t.ticker,
      r: Number(computeR(t).toFixed(2)),
    }));

  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-parchment-faint text-sm">
        No closed exits yet — R-multiples will appear here once you log outcomes.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#2C313F" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="ticker"
          tick={{ fill: "#6B7180", fontSize: 11 }}
          axisLine={{ stroke: "#2C313F" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6B7180", fontSize: 11 }}
          axisLine={{ stroke: "#2C313F" }}
          tickLine={false}
          width={40}
          tickFormatter={(v) => `${v}R`}
        />
        <ReferenceLine y={0} stroke="#2C313F" />
        <Tooltip
          cursor={false}
          contentStyle={{
            background: "#232838",
            border: "1px solid #2C313F",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#9AA0AC" }}
          itemStyle={{ color: "#9AA0AC" }}
          formatter={(value) => [`${value}R`, "R-multiple"]}
        />
        <Bar
          dataKey="r"
          radius={[3, 3, 3, 3]}
          onMouseEnter={(_, i) => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map((d, i) => {
            const isActive = i === activeIndex;
            const positive = d.r >= 0;
            const fill = positive ? (isActive ? GAIN_BRIGHT : GAIN) : isActive ? LOSS_BRIGHT : LOSS;
            return <Cell key={i} fill={fill} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
