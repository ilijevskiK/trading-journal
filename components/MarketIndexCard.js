"use client";

import { useMemo, useState } from "react";
import { useWatchlistCandles } from "@/hooks/useWatchlistCandles";
import CandlestickChart from "@/components/CandlestickChart";
import FullscreenChart from "@/components/FullscreenChart";
import { STATES } from "@/lib/marketStatus";

export const MA50_COLOR = "#E0BE6E";
export const MA200_COLOR = "#8A7238";
const DISTRIBUTION_COLOR = "#DB6E54";
const STALLING_COLOR = "#D98B3F";
const FOLLOW_THROUGH_COLOR = "#6FCBA6";
const FAILED_FOLLOW_THROUGH_COLOR = "#6B7180";

export const BAND_COLORS = {
  [STATES.uptrend]: "rgba(79, 175, 139, 0.75)",
  [STATES.pressure]: "rgba(217, 139, 63, 0.8)",
  [STATES.correction]: "rgba(193, 87, 63, 0.8)",
};

const SMA_LINES = [
  { period: 50, color: MA50_COLOR },
  { period: 200, color: MA200_COLOR },
];

export const STATE_STYLES = {
  [STATES.uptrend]: { short: "Uptrend", dot: "bg-gain-bright", text: "text-gain-bright", border: "border-gain/40" },
  [STATES.pressure]: { short: "Under pressure", dot: "bg-warn", text: "text-warn", border: "border-warn/40" },
  [STATES.correction]: { short: "Correction", dot: "bg-loss-bright", text: "text-loss-bright", border: "border-loss/40" },
};

export function formatSessionDate(time) {
  return new Date(`${time}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function signedPct(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function MarketIndexCard({ index, candles, analysis, loading, error, onRetry, apiKey }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [timeframe, setTimeframe] = useState("1day");
  const fullscreenQuery = useWatchlistCandles(index.symbol, apiKey, {
    interval: timeframe,
    enabled: fullscreen && timeframe !== "1day",
  });

  const markers = useMemo(() => {
    if (!analysis) return [];
    const dDays = analysis.distributionDays.map((d) => ({
      time: d.time,
      position: "aboveBar",
      color: d.type === "stalling" ? STALLING_COLOR : DISTRIBUTION_COLOR,
      shape: "arrowDown",
      text: d.type === "stalling" ? "S" : "D",
    }));
    const failed = new Set(analysis.failedFollowThroughDates);
    const ftds = analysis.followThroughDates.slice(-6).map((time) => ({
      time,
      position: "belowBar",
      color: failed.has(time) ? FAILED_FOLLOW_THROUGH_COLOR : FOLLOW_THROUGH_COLOR,
      shape: "arrowUp",
      text: failed.has(time) ? "FTD failed" : "FTD",
    }));
    return [...dDays, ...ftds];
  }, [analysis]);

  const band = useMemo(
    () => (analysis ? analysis.history.map((h) => ({ time: h.time, color: BAND_COLORS[h.state] })) : []),
    [analysis]
  );

  const trade = useMemo(() => ({ ticker: index.symbol, status: "open", exits: [] }), [index.symbol]);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const change = last && prev ? ((last.close - prev.close) / prev.close) * 100 : null;
  const style = analysis ? STATE_STYLES[analysis.state] : null;
  const daily = timeframe === "1day";
  const stalls = analysis ? analysis.distributionDays.filter((d) => d.type === "stalling").length : 0;

  return (
    <div className="border border-line rounded-lg bg-surface p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm text-parchment truncate">{index.name}</span>
          <span className="font-mono text-[11px] text-parchment-faint">{index.symbol}</span>
          {!index.deciding && (
            <span className="text-[10px] uppercase tracking-wide text-parchment-faint">context</span>
          )}
          {last && <span className="font-mono text-xs text-parchment-dim">{last.close.toFixed(2)}</span>}
          {change != null && (
            <span className={`font-mono text-xs ${change >= 0 ? "text-gain-bright" : "text-loss-bright"}`}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          )}
        </div>
        {style && (
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${style.border} ${style.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {style.short}
          </span>
        )}
      </div>

      <CandlestickChart
        trade={trade}
        candles={candles}
        aspectRatio="16/9"
        smaLines={SMA_LINES}
        extraMarkers={markers}
        statusBand={band}
        onExpand={candles.length > 0 ? () => setFullscreen(true) : undefined}
      />

      {loading && <p className="text-xs text-parchment-faint mt-2">Loading…</p>}
      {error && (
        <p className="text-xs text-loss-bright mt-2">
          {error.message}{" "}
          <button onClick={onRetry} className="underline">
            Retry
          </button>
        </p>
      )}
      {!loading && !error && candles.length > 0 && !analysis && (
        <p className="text-xs text-parchment-faint mt-2">Not enough history to judge this index yet.</p>
      )}

      {analysis && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs">
          {analysis.state === STATES.correction ? (
            <Stat
              label="Rally attempt"
              value={analysis.rallyAttempt ? `Day ${analysis.rallyAttempt.day}` : "None yet"}
            />
          ) : (
            <Stat
              label="Distribution days"
              value={`${analysis.distributionDays.length} of last 25${
                stalls ? ` (${stalls} stalling)` : ""
              }`}
              tone={analysis.distributionDays.length >= 5 ? "text-warn" : undefined}
            />
          )}
          <Stat
            label="Last follow-through"
            value={
              analysis.lastFollowThrough
                ? `${formatSessionDate(analysis.lastFollowThrough)}${analysis.lastFollowThroughFailed ? " · failed" : ""}`
                : "—"
            }
            tone={analysis.lastFollowThroughFailed ? "text-loss-bright" : undefined}
          />
          <Stat
            label="vs 50-day"
            value={`${signedPct(analysis.pctVsMa50)} · ${analysis.ma50Rising ? "rising" : "falling"}`}
            tone={analysis.pctVsMa50 >= 0 ? "text-gain-bright" : "text-loss-bright"}
          />
          <Stat
            label="vs 200-day"
            value={signedPct(analysis.pctVsMa200)}
            tone={analysis.pctVsMa200 >= 0 ? "text-gain-bright" : "text-loss-bright"}
          />
        </dl>
      )}

      {fullscreen && (
        <FullscreenChart
          title={`${index.name} (${index.symbol})`}
          trade={trade}
          candles={daily ? candles : fullscreenQuery.candles}
          loading={daily ? loading : fullscreenQuery.loading}
          error={daily ? error : fullscreenQuery.error}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          smaLines={daily ? SMA_LINES : undefined}
          extraMarkers={daily ? markers : undefined}
          statusBand={daily ? band : undefined}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-parchment-faint">{label}</dt>
      <dd className={`font-mono text-right ${tone || "text-parchment-dim"}`}>{value}</dd>
    </div>
  );
}
