"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTradeCandles } from "@/hooks/useTradeCandles";
import CandlestickChart from "@/components/CandlestickChart";
import FullscreenChart from "@/components/FullscreenChart";
import { exitPostmortem, formatCurrency } from "@/lib/calc";

export default function TradeChart({ trade, apiKey }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [timeframe, setTimeframe] = useState("1day");
  const { candles, loading, error, refetch } = useTradeCandles(trade, apiKey);
  const postmortem = useMemo(() => exitPostmortem(trade, candles), [trade, candles]);
  // Separate query for the fullscreen view's selected timeframe — only
  // fetches while the modal is open, and shares the daily cache entry with
  // the compact chart above when timeframe is left at "1day".
  const fullscreenQuery = useTradeCandles(trade, apiKey, { interval: timeframe, enabled: fullscreen });

  if (!apiKey) {
    return (
      <div className="border border-line rounded-lg bg-surface-alt px-4 py-6 text-center text-xs text-parchment-faint">
        Add a Twelve Data API key in{" "}
        <Link href="/settings" className="text-gold-bright hover:underline">
          Settings
        </Link>{" "}
        to see a price chart for this trade.
      </div>
    );
  }

  return (
    <div>
      <CandlestickChart
        trade={trade}
        candles={candles}
        height={280}
        onExpand={candles.length > 0 ? () => setFullscreen(true) : undefined}
      />
      {loading && (
        <p className="text-xs text-parchment-faint mt-2">Loading chart…</p>
      )}
      {error && (
        <p className="text-xs text-loss-bright mt-2">
          {error.message}{" "}
          <button onClick={refetch} className="underline hover:text-loss-bright">
            Retry
          </button>
        </p>
      )}
      {!loading && !error && candles.length === 0 && (
        <p className="text-xs text-parchment-faint mt-2">
          No price data found for {trade.ticker} in this range.
        </p>
      )}
      {!loading && !error && candles.length > 0 && (
        <p className="text-xs text-parchment-faint mt-2">
          Click the chart to expand · scroll or drag to zoom/pan.
        </p>
      )}
      {postmortem && (
        <p className="text-xs text-parchment-faint mt-2">
          {postmortem.daysObserved} day{postmortem.daysObserved === 1 ? "" : "s"} after your exit: as high as{" "}
          <span className="text-parchment-dim">${postmortem.highestAfter}</span>
          {postmortem.leftOnTable > 0 && (
            <span className="text-loss-bright"> ({formatCurrency(postmortem.leftOnTable)} left on table)</span>
          )}
          {" · "}as low as <span className="text-parchment-dim">${postmortem.lowestAfter}</span>
          {postmortem.avoidedLoss > 0 && (
            <span className="text-gain-bright"> ({formatCurrency(postmortem.avoidedLoss)} avoided)</span>
          )}
          .
        </p>
      )}

      {fullscreen && (
        <FullscreenChart
          title={`${trade.ticker} — ${trade.entryDate}`}
          trade={trade}
          candles={fullscreenQuery.candles}
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
