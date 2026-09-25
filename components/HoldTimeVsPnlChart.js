"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/calc";

const GAIN = "#4FAF8B";
const GAIN_BRIGHT = "#6FCBA6";
const LOSS = "#C1573F";
const LOSS_BRIGHT = "#DB6E54";
const SURFACE_RING = "#1B1F27";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const trade = payload[0].payload;
  return (
    <div className="bg-surface-alt border border-line rounded-lg px-3 py-2 text-xs">
      <p className="font-mono text-parchment mb-1">{trade.ticker || "—"}</p>
      <p className="text-parchment-dim">{trade.days} days held</p>
      <p className={trade.pnl >= 0 ? "text-gain-bright" : "text-loss-bright"}>
        {formatCurrency(trade.pnl)}
      </p>
    </div>
  );
}

export default function HoldTimeVsPnlChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const router = useRouter();

  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-parchment-faint text-sm">
        No closed exits yet — this will fill in once you log an outcome.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#2C313F" strokeDasharray="2 4" />
        <XAxis
          type="number"
          dataKey="days"
          name="Days held"
          tick={{ fill: "#6B7180", fontSize: 11 }}
          axisLine={{ stroke: "#2C313F" }}
          tickLine={false}
          tickFormatter={(v) => `${v}d`}
        />
        <YAxis
          type="number"
          dataKey="pnl"
          name="P&L"
          tick={{ fill: "#6B7180", fontSize: 11 }}
          axisLine={{ stroke: "#2C313F" }}
          tickLine={false}
          width={56}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <ReferenceLine y={0} stroke="#2C313F" />
        <Tooltip
          cursor={{ stroke: "#2C313F", strokeDasharray: "2 4" }}
          content={<ChartTooltip />}
        />
        <Scatter
          data={data}
          onMouseEnter={(_, i) => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
          onClick={(point) => {
            const id = point?.payload?.id;
            if (id) router.push(`/journal?open=${id}`);
          }}
        >
          {data.map((d, i) => {
            const isActive = i === activeIndex;
            const positive = d.pnl >= 0;
            const fill = positive ? (isActive ? GAIN_BRIGHT : GAIN) : isActive ? LOSS_BRIGHT : LOSS;
            return (
              <Cell
                key={d.id || `${d.ticker}-${i}`}
                fill={fill}
                stroke={SURFACE_RING}
                strokeWidth={2}
                r={isActive ? 7 : 6}
                style={{ cursor: d.id ? "pointer" : "default" }}
              />
            );
          })}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
