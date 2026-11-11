"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

// Validated as a set (colorblind-safe, all pairs) on the app's dark
// surface, and kept away from the green/red the app uses for good/bad.
// Each metric keeps its color across charts: EPS blue, sales yellow.
const EPS_COLOR = "#3987e5";
const SALES_COLOR = "#c98500";
const MARGIN_COLOR = "#d55181";
const LOSS_COLOR = "#DB6E54";

const GRID = "#2C313F";
const TICK = { fill: "#6B7180", fontSize: 10 };
const Y_WIDTH = 52;
const SYNC_ID = "fundamentals";
const PCT_CAP_HIGH = 300;
const PCT_CAP_LOW = -100;

function quarterLabel(date) {
  const d = new Date(`${date}T00:00:00`);
  return `${d.toLocaleDateString(undefined, { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
}

function money(v) {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

function signedPct(v) {
  return v == null ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;
}

const clamp = (v) => (v == null ? null : Math.max(PCT_CAP_LOW, Math.min(PCT_CAP_HIGH, v)));

export default function FundamentalsChart({ rows, minGrowthPct }) {
  const data = rows.map((r) => ({
    ...r,
    label: quarterLabel(r.end),
    epsGrowthPlot: r.turnaround ? null : clamp(r.epsGrowth),
    revenueGrowthPlot: clamp(r.revenueGrowth),
    netMarginPlot: clamp(r.netMargin),
  }));
  const growthGaps = rows.some((r) => r.hasPrior && r.epsGrowth == null);
  const capped = rows.some((r) =>
    [r.epsGrowth, r.revenueGrowth, r.netMargin].some((v) => v != null && (v > PCT_CAP_HIGH || v < PCT_CAP_LOW))
  );

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-xs uppercase tracking-wide text-parchment-faint">
          Last {rows.length} quarters
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-parchment-dim">
          <LegendLine color={EPS_COLOR} label="EPS growth" />
          <LegendLine color={SALES_COLOR} label="Sales growth" />
          <LegendLine color={MARGIN_COLOR} label="Net margin" />
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-parchment-faint" />
            {minGrowthPct}% minimum
          </span>
        </div>
      </div>

      <ChartLabel>Growth vs a year ago, and net margin (%)</ChartLabel>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} syncId={SYNC_ID} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" hide />
          <YAxis
            width={Y_WIDTH}
            tick={TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={["auto", "auto"]}
          />
          <ReferenceLine y={0} stroke={GRID} ifOverflow="extendDomain" />
          <ReferenceLine y={minGrowthPct} stroke="#6B7180" strokeDasharray="4 4" ifOverflow="extendDomain" />
          <Tooltip content={<QuarterTooltip />} cursor={{ stroke: "#6B7180", strokeDasharray: "2 3" }} />
          <Line type="linear" dataKey="epsGrowthPlot" stroke={EPS_COLOR} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: EPS_COLOR }} activeDot={{ r: 4.5, stroke: "#1B1F27", strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
          <Line type="linear" dataKey="revenueGrowthPlot" stroke={SALES_COLOR} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: SALES_COLOR }} activeDot={{ r: 4.5, stroke: "#1B1F27", strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
          <Line type="linear" dataKey="netMarginPlot" stroke={MARGIN_COLOR} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: MARGIN_COLOR }} activeDot={{ r: 4.5, stroke: "#1B1F27", strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <ChartLabel>EPS ($ per share)</ChartLabel>
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" hide />
          <YAxis width={Y_WIDTH} tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`} />
          <ReferenceLine y={0} stroke={GRID} />
          <Tooltip content={() => null} cursor={{ fill: "rgba(154,160,172,0.08)" }} />
          <Bar dataKey="eps" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.end} fill={d.eps < 0 ? LOSS_COLOR : EPS_COLOR} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      <ChartLabel>Sales</ChartLabel>
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={data} syncId={SYNC_ID} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" />
          <YAxis width={Y_WIDTH} tick={TICK} axisLine={false} tickLine={false} tickFormatter={money} />
          <Tooltip content={() => null} cursor={{ fill: "rgba(154,160,172,0.08)" }} />
          <Bar dataKey="revenue" fill={SALES_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      {growthGaps && (
        <p className="text-[10px] text-parchment-faint mt-1">
          EPS growth isn&apos;t plotted for quarters compared with a loss a year earlier: a percentage change from a
          loss has no meaning.
        </p>
      )}
      {capped && (
        <p className="text-[10px] text-parchment-faint mt-1">
          The % chart is capped at {PCT_CAP_LOW}% to +{PCT_CAP_HIGH}% so one extreme quarter doesn&apos;t flatten the
          rest. Hover for the real value.
        </p>
      )}
    </div>
  );
}

function ChartLabel({ children }) {
  return <p className="text-[10px] text-parchment-faint mt-3 mb-1 pl-[52px]">{children}</p>;
}

function LegendLine({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-4 h-0.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function QuarterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const rows = [
    [EPS_COLOR, "EPS", `$${r.eps.toFixed(2)}`, r.turnaround ? "turnaround" : signedPct(r.epsGrowth)],
    [SALES_COLOR, "Sales", money(r.revenue), signedPct(r.revenueGrowth)],
    [MARGIN_COLOR, "Net margin", r.netMargin == null ? "—" : `${r.netMargin.toFixed(1)}%`, ""],
  ];
  return (
    <div className="rounded-lg border border-line bg-surface-alt px-3 py-2 text-[11px] shadow-lg">
      <p className="text-parchment mb-1.5">
        Quarter ended {new Date(`${r.end}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        {r.derived ? " *" : ""}
      </p>
      <table className="font-mono">
        <tbody>
          {rows.map(([color, label, value, change]) => (
            <tr key={label}>
              <td className="pr-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
              </td>
              <td className="pr-3 text-parchment-faint font-body">{label}</td>
              <td className="pr-3 text-right text-parchment">{value}</td>
              <td className="text-right text-parchment-dim">{change && `${change} y/y`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
