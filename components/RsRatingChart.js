"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

const RATING_COLOR = "#3987e5";
const GRID = "#2C313F";
const TICK = { fill: "#6B7180", fontSize: 10 };
const MIN_RATING = 80; // O'Neil buys leaders at 80+ (see LEADERSHIP_RULES.minRating)

const shortDate = (date) => {
  const d = new Date(`${date}T00:00:00`);
  return `${d.toLocaleDateString(undefined, { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
};

// The stock's RS Rating (1-99) on each ranked day, oldest first:
// `history` is [{ asOf, rating }] from getRsRatingAction.
export default function RsRatingChart({ history }) {
  if (!history || history.length < 2) {
    return (
      <p className="mt-5 text-xs text-parchment-faint">
        The rating history builds up one day at a time. It will chart once there are two ranked days.
      </p>
    );
  }
  const data = history.map((h) => ({ time: h.asOf, label: shortDate(h.asOf), rating: h.rating }));
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-xs uppercase tracking-wide text-parchment-faint">RS Rating, last 12 months</h3>
        <span className="flex items-center gap-1.5 text-[11px] text-parchment-dim">
          <span className="inline-block w-4 border-t border-dashed border-parchment-faint" /> {MIN_RATING}, O&apos;Neil&apos;s minimum
        </span>
      </div>
      <p className="text-[10px] text-parchment-faint mt-0.5">
        {first.rating} on {first.time} → {last.rating} on {last.time}. Higher means it beat more US stocks that year.
      </p>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
          <YAxis width={44} tick={TICK} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} />
          <ReferenceLine y={MIN_RATING} stroke="#6B7180" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ stroke: "#6B7180", strokeDasharray: "2 3" }}
            contentStyle={{ background: "#232838", border: "1px solid #2C313F", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "#ECE9E1" }}
            itemStyle={{ color: "#9AA0AC" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.time ?? ""}
            formatter={(v) => [v, "RS Rating"]}
          />
          <Line type="linear" dataKey="rating" stroke={RATING_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#1B1F27", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
