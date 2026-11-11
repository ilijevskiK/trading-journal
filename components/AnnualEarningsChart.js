"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

// Same EPS blue and loss red as the quarterly chart.
const EPS_COLOR = "#3987e5";
const LOSS_COLOR = "#DB6E54";
const GRID = "#2C313F";
const TICK = { fill: "#6B7180", fontSize: 10 };

const usd = (v) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;

function yearLabel(date) {
  return `FY ${new Date(`${date}T00:00:00`).getFullYear()}`;
}

export default function AnnualEarningsChart({ rows }) {
  const data = rows.map((r) => ({ ...r, label: yearLabel(r.end) }));
  return (
    <div className="mt-6">
      <h3 className="text-xs uppercase tracking-wide text-parchment-faint">EPS by fiscal year</h3>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis width={52} tick={TICK} axisLine={false} tickLine={false} tickFormatter={usd} />
          <ReferenceLine y={0} stroke={GRID} />
          <Tooltip content={<YearTooltip />} cursor={{ fill: "rgba(154,160,172,0.08)" }} />
          <Bar dataKey="eps" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.end} fill={d.eps < 0 ? LOSS_COLOR : EPS_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function YearTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const y = payload[0].payload;
  const lines = [
    ["EPS", usd(y.eps)],
    ["Growth", y.epsGrowth == null ? "n/a" : `${y.epsGrowth >= 0 ? "+" : ""}${y.epsGrowth.toFixed(0)}%`],
    ["Return on equity", y.negativeEquity ? "negative equity" : y.roe == null ? "—" : `${y.roe.toFixed(0)}%`],
  ];
  return (
    <div className="rounded-lg border border-line bg-surface-alt px-3 py-2 text-[11px] shadow-lg">
      <p className="text-parchment mb-1">
        Fiscal year ended{" "}
        {new Date(`${y.end}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </p>
      {lines.map(([label, value]) => (
        <p key={label} className="flex justify-between gap-4">
          <span className="text-parchment-faint">{label}</span>
          <span className="font-mono text-parchment">{value}</span>
        </p>
      ))}
    </div>
  );
}
