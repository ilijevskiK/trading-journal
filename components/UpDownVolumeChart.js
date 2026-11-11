"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

// Up and down days use the app's gain/loss colors: here they mean exactly
// that (did the stock close up or down), and the label says so too.
const UP = "#4FAF8B";
const DOWN = "#C1573F";
const GRID = "#2C313F";
const TICK = { fill: "#6B7180", fontSize: 10 };

function compact(v) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(v < 1e7 ? 1 : 0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

export default function UpDownVolumeChart({ candles, sessions = 50 }) {
  const recent = candles.slice(-(sessions + 1));
  const data = recent.slice(1).map((c, i) => ({
    time: c.time,
    label: new Date(`${c.time}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    volume: c.volume ?? 0,
    up: c.close >= recent[i].close,
    change: ((c.close - recent[i].close) / recent[i].close) * 100,
  }));
  const avg = data.reduce((s, d) => s + d.volume, 0) / (data.length || 1);

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-xs uppercase tracking-wide text-parchment-faint">Volume, last {data.length} sessions</h3>
        <div className="flex gap-4 text-[11px] text-parchment-dim">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: UP }} /> Up day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: DOWN }} /> Down day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-parchment-faint" /> Average
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="15%">
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis width={52} tick={TICK} axisLine={false} tickLine={false} tickFormatter={compact} />
          <ReferenceLine y={avg} stroke="#6B7180" strokeDasharray="4 4" />
          <Tooltip content={<VolumeTooltip />} cursor={{ fill: "rgba(154,160,172,0.08)" }} />
          <Bar dataKey="volume" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.time} fill={d.up ? UP : DOWN} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function VolumeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface-alt px-3 py-2 text-[11px] shadow-lg">
      <p className="text-parchment">{d.label}</p>
      <p className="text-parchment-dim font-mono">
        {d.up ? "Up" : "Down"} {d.change >= 0 ? "+" : ""}
        {d.change.toFixed(2)}% · {compact(d.volume)} shares
      </p>
    </div>
  );
}
