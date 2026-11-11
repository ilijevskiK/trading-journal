"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

const RS_COLOR = "#3987e5";
const GRID = "#2C313F";
const TICK = { fill: "#6B7180", fontSize: 10 };

// The RS line is price ÷ SPY, rebased to 100 at the start of the window so
// the number reads as "relative performance since then".
export default function RsLineChart({ rsLine, rsHigh }) {
  const base = rsLine[0]?.value || 1;
  const data = rsLine.map((p) => ({
    time: p.time,
    label: (() => {
      const d = new Date(`${p.time}T00:00:00`);
      return `${d.toLocaleDateString(undefined, { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
    })(),
    value: (p.value / base) * 100,
  }));
  const high = (rsHigh / base) * 100;

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-xs uppercase tracking-wide text-parchment-faint">RS line vs S&amp;P 500, last 12 months</h3>
        <span className="flex items-center gap-1.5 text-[11px] text-parchment-dim">
          <span className="inline-block w-4 border-t border-dashed border-parchment-faint" /> 52-week high
        </span>
      </div>
      <p className="text-[10px] text-parchment-faint mt-0.5">
        Price ÷ SPY, starting at 100. Rising means it&apos;s beating the market.
      </p>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
          <YAxis width={44} tick={TICK} axisLine={false} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v) => v.toFixed(0)} />
          <ReferenceLine y={100} stroke={GRID} />
          <ReferenceLine y={high} stroke="#6B7180" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ stroke: "#6B7180", strokeDasharray: "2 3" }}
            contentStyle={{ background: "#232838", border: "1px solid #2C313F", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "#ECE9E1" }}
            itemStyle={{ color: "#9AA0AC" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.time ?? ""}
            formatter={(v) => [v.toFixed(1), "RS line"]}
          />
          <Line type="linear" dataKey="value" stroke={RS_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#1B1F27", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
