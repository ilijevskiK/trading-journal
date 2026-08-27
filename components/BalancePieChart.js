"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/calc";

// Colors encode P&L status (gain / loss / neutral), not slice identity —
// tickers are told apart by their direct label in the list beside the chart,
// not by hue. Cash and any position sitting exactly flat share the same
// neutral tone, matching the "midpoint" of a gain<->loss diverging scale.
const CASH = "#9AA0AC";
const CASH_BRIGHT = "#B7BCC7";
const GAIN = "#4FAF8B";
const GAIN_BRIGHT = "#6FCBA6";
const LOSS = "#C1573F";
const LOSS_BRIGHT = "#DB6E54";

const MAX_POSITION_SLICES = 5;

function colorFor(unrealizedPnl) {
  if (unrealizedPnl > 0) return { base: GAIN, bright: GAIN_BRIGHT };
  if (unrealizedPnl < 0) return { base: LOSS, bright: LOSS_BRIGHT };
  return { base: CASH, bright: CASH_BRIGHT };
}

export default function BalancePieChart({
  cash,
  totalEquity,
  positions,
  hasApiKey,
  loadingQuotes,
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (totalEquity <= 0 && positions.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-parchment-faint text-sm">
        Nothing to show yet — log a trade to see your balance sheet.
      </div>
    );
  }

  const visible = positions.slice(0, MAX_POSITION_SLICES);
  const overflow = positions.slice(MAX_POSITION_SLICES);
  const otherSlice =
    overflow.length > 0
      ? {
          ticker: `Other (${overflow.length})`,
          marketValue: overflow.reduce((s, p) => s + p.marketValue, 0),
          unrealizedPnl: overflow.reduce((s, p) => s + p.unrealizedPnl, 0),
          isAggregate: true,
        }
      : null;

  const slices = [
    { ticker: "Cash", marketValue: cash, unrealizedPnl: 0, isCash: true },
    ...visible,
    ...(otherSlice ? [otherSlice] : []),
  ].filter((s) => s.marketValue > 0);

  const total = slices.reduce((s, p) => s + p.marketValue, 0) || 1;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-56 h-56 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="marketValue"
                nameKey="ticker"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {slices.map((s, i) => {
                  const { base, bright } = s.isCash
                    ? { base: CASH, bright: CASH_BRIGHT }
                    : colorFor(s.unrealizedPnl);
                  return <Cell key={s.ticker} fill={i === activeIndex ? bright : base} />;
                })}
              </Pie>
              <Tooltip content={<SliceTooltip total={total} />} wrapperStyle={{ zIndex: 50 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-2xl text-parchment">
              {formatCurrency(totalEquity)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-parchment-faint mt-0.5">
              Total equity
            </span>
            {loadingQuotes && (
              <span className="text-[10px] text-parchment-faint mt-1">updating…</span>
            )}
          </div>
        </div>

        <ul className="w-full flex-1 space-y-1.5">
          {slices.map((s) => {
            const { base } = s.isCash ? { base: CASH } : colorFor(s.unrealizedPnl);
            const pct = (s.marketValue / total) * 100;
            return (
              <li
                key={s.ticker}
                className="flex items-center justify-between text-sm gap-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: base }}
                  />
                  <span className="font-mono text-parchment truncate">{s.ticker}</span>
                  {s.avgEntryPrice != null && (
                    <span className="text-[10px] text-parchment-faint shrink-0">
                      avg {formatCurrency(s.avgEntryPrice)}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-parchment-faint">{formatPercent(pct, 0)}</span>
                  <span className="font-mono text-parchment-dim">
                    {formatCurrency(s.marketValue)}
                  </span>
                  {!s.isCash && (
                    <span
                      className={`font-mono text-xs w-16 text-right ${
                        s.unrealizedPnl > 0
                          ? "text-gain-bright"
                          : s.unrealizedPnl < 0
                          ? "text-loss-bright"
                          : "text-parchment-faint"
                      }`}
                    >
                      {s.unrealizedPnl !== 0
                        ? `${s.unrealizedPnl > 0 ? "+" : ""}${formatCurrency(s.unrealizedPnl)}`
                        : "—"}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {positions.length > 0 && !hasApiKey && (
        <p className="text-xs text-parchment-faint mt-4">
          Valued at cost — add a Twelve Data API key in Settings to see live unrealized
          gain/loss instead.
        </p>
      )}
    </div>
  );
}

function SliceTooltip({ active, payload, total }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const pct = (d.marketValue / total) * 100;
  const color = d.isCash ? CASH : colorFor(d.unrealizedPnl).base;

  return (
    <div className="bg-black border border-line rounded-lg px-3 py-2 shadow-lg">
      <div className="flex items-center gap-1.5 text-xs text-parchment-faint mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        {d.ticker}
      </div>
      <div className="font-mono text-sm text-parchment">{formatCurrency(d.marketValue)}</div>
      <div className="text-xs text-parchment-faint">{formatPercent(pct, 1)} of account</div>
      {d.avgEntryPrice != null && (
        <div className="text-xs text-parchment-faint">
          avg entry {formatCurrency(d.avgEntryPrice)}
        </div>
      )}
      {!d.isCash && d.unrealizedPnl !== 0 && (
        <div
          className={`font-mono text-xs mt-1 ${
            d.unrealizedPnl > 0 ? "text-gain-bright" : "text-loss-bright"
          }`}
        >
          {d.unrealizedPnl > 0 ? "+" : ""}
          {formatCurrency(d.unrealizedPnl)} unrealized
        </div>
      )}
    </div>
  );
}