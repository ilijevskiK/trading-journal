"use client";

import { useMemo, useState } from "react";
import { useWatchlistCandles } from "@/hooks/useWatchlistCandles";
import { useFinnhubTrades } from "@/hooks/useFinnhubTrades";
import { applyLiveTick } from "@/lib/liveTicks";
import CandlestickChart from "@/components/CandlestickChart";
import FullscreenChart from "@/components/FullscreenChart";

// One 2x3 grid cell: a compact price-only chart (click to expand into the
// same full-toggle chart a logged trade gets), no indicator clutter here.
export default function WatchlistCard({ ticker, apiKey, finnhubApiKey, onRemove }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [timeframe, setTimeframe] = useState("1day");
  const { candles, loading, error, refetch } = useWatchlistCandles(ticker, apiKey);
  const { tick, isLive } = useFinnhubTrades(ticker, finnhubApiKey);

  // Separate query for the fullscreen view's selected timeframe — only
  // fetches while the modal is open, and shares the daily cache entry with
  // the compact chart above when timeframe is left at "1day".
  const fullscreenQuery = useWatchlistCandles(ticker, apiKey, { interval: timeframe, enabled: fullscreen });

  // Live tick only nudges the last bar for display — the fetched/cached
  // candles themselves are untouched, so nothing here can corrupt what's
  // cached or what gets re-used on the next 15-min refetch.
  const displayCandles = useMemo(() => applyLiveTick(candles, tick), [candles, tick]);
  const fullscreenDisplayCandles = useMemo(
    () => applyLiveTick(fullscreenQuery.candles, tick),
    [fullscreenQuery.candles, tick]
  );

  // A watchlist ticker isn't a logged trade — no entry/stop/targets, so
  // CandlestickChart just draws price + whichever toggles are switched on.
  const trade = { ticker, status: "open", exits: [] };

  const last = displayCandles[displayCandles.length - 1];
  const prev = displayCandles[displayCandles.length - 2];
  const change = last && prev ? ((last.close - prev.close) / prev.close) * 100 : null;

  return (
    <div className="border border-line rounded-lg bg-surface p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          {finnhubApiKey && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isLive ? "bg-gain-bright" : "bg-parchment-faint"
              }`}
              title={isLive ? "Live" : "No live data right now"}
            />
          )}
          <span className="font-mono text-sm text-parchment truncate">{ticker}</span>
          {last && <span className="font-mono text-xs text-parchment-dim">{last.close.toFixed(2)}</span>}
          {change != null && (
            <span className={`font-mono text-xs ${change >= 0 ? "text-gain-bright" : "text-loss-bright"}`}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          title={`Remove ${ticker}`}
          className="text-parchment-faint hover:text-loss-bright text-xs shrink-0 px-1"
        >
          ✕
        </button>
      </div>

      <CandlestickChart
        trade={trade}
        candles={displayCandles}
        apiKey={apiKey}
        aspectRatio="16/9"
        onExpand={candles.length > 0 ? () => setFullscreen(true) : undefined}
      />

      {loading && <p className="text-xs text-parchment-faint mt-2">Loading…</p>}
      {error && (
        <p className="text-xs text-loss-bright mt-2">
          {error.message}{" "}
          <button onClick={refetch} className="underline hover:text-loss-bright">
            Retry
          </button>
        </p>
      )}
      {!loading && !error && candles.length === 0 && (
        <p className="text-xs text-parchment-faint mt-2">No price data found for {ticker}.</p>
      )}

      {fullscreen && (
        <FullscreenChart
          title={ticker}
          trade={trade}
          candles={fullscreenDisplayCandles}
          loading={fullscreenQuery.loading}
          error={fullscreenQuery.error}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          apiKey={apiKey}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}
