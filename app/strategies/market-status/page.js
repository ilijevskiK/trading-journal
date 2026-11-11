"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTrades } from "@/contexts/TradesContext";
import { useWatchlistCandles } from "@/hooks/useWatchlistCandles";
import MarketIndexCard, {
  STATE_STYLES,
  BAND_COLORS,
  MA50_COLOR,
  MA200_COLOR,
  formatSessionDate,
} from "@/components/MarketIndexCard";
import {
  analyzeIndex,
  completedSessions,
  overallMarketState,
  describeIndex,
  MARKET_RULES,
  STATE_LABELS,
  STATE_ACTIONS,
} from "@/lib/marketStatus";

// ETFs stand in for the indexes: they're on Twelve Data's free plan with
// real volume. QQQ tracks the Nasdaq-100, not the full Composite IBD uses.
const INDEXES = [
  { key: "sp500", name: "S&P 500", symbol: "SPY", deciding: true },
  { key: "nasdaq", name: "Nasdaq", symbol: "QQQ", deciding: true },
  { key: "dow", name: "Dow Jones", symbol: "DIA", deciding: false },
  { key: "russell", name: "Russell 2000", symbol: "IWM", deciding: false },
];

function useIndex(index, apiKey) {
  const query = useWatchlistCandles(index.symbol, apiKey);
  const analysis = useMemo(
    () => (query.candles.length ? analyzeIndex(completedSessions(query.candles)) : null),
    [query.candles]
  );
  return { ...query, analysis };
}

export default function MarketStatusPage() {
  const { settings, loaded } = useTrades();
  const apiKey = settings.twelveDataApiKey;

  const sp500 = useIndex(INDEXES[0], apiKey);
  const nasdaq = useIndex(INDEXES[1], apiKey);
  const dow = useIndex(INDEXES[2], apiKey);
  const russell = useIndex(INDEXES[3], apiKey);
  const byKey = { sp500, nasdaq, dow, russell };

  const overall = overallMarketState(sp500.analysis, nasdaq.analysis);
  const asOf = sp500.analysis?.asOf || nasdaq.analysis?.asOf;

  if (!loaded) return null;

  return (
    <div>
      <Link href="/strategies" className="text-xs text-parchment-faint hover:text-parchment">
        ← CAN SLIM
      </Link>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mt-3">
        <h1 className="font-display text-3xl text-parchment">Market Status</h1>
        {asOf && (
          <span className="font-mono text-xs text-parchment-faint">
            as of {formatSessionDate(asOf)} close
          </span>
        )}
      </div>
      <p className="text-xs text-parchment-faint mt-2 max-w-2xl">
        The &ldquo;M&rdquo; in CAN SLIM. O&apos;Neil found about three in four stocks follow
        the market&apos;s direction, so this decides whether to buy at all. The S&amp;P 500 and Nasdaq
        decide; the Dow and Russell 2000 are shown for context.
      </p>
      <div className="rule-divider mt-4 mb-6" />

      {!apiKey ? (
        <p className="text-sm text-parchment-dim">
          Add a Twelve Data API key in{" "}
          <Link href="/settings" className="text-gold-bright hover:underline">
            Settings
          </Link>{" "}
          to see the market status.
        </p>
      ) : (
        <>
          <StatusBanner overall={overall} sp500={sp500.analysis} nasdaq={nasdaq.analysis} context={[dow, russell]} />

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {INDEXES.map((index) => {
              const q = byKey[index.key];
              return (
                <MarketIndexCard
                  key={index.key}
                  index={index}
                  candles={q.candles}
                  analysis={q.analysis}
                  loading={q.loading}
                  error={q.error}
                  onRetry={q.refetch}
                  apiKey={apiKey}
                />
              );
            })}
          </div>

          <Legend />
          <HowItWorks />
        </>
      )}
    </div>
  );
}

function StatusBanner({ overall, sp500, nasdaq, context }) {
  if (!overall) {
    return (
      <div className="border border-line rounded-lg bg-surface px-5 py-4 text-sm text-parchment-faint">
        Loading market data…
      </div>
    );
  }
  const style = STATE_STYLES[overall];
  const reasons = [describeIndex("S&P 500", sp500), describeIndex("Nasdaq", nasdaq)];
  const [dow, russell] = context;
  const divergent = [
    ["Dow Jones", dow.analysis],
    ["Russell 2000", russell.analysis],
  ].filter(([, a]) => a && a.state !== overall);

  return (
    <div className={`border rounded-lg bg-surface px-5 py-4 ${style.border}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
        <span className={`text-sm uppercase tracking-wide ${style.text}`}>{STATE_LABELS[overall]}</span>
      </div>
      <p className="text-sm text-parchment mt-2">{STATE_ACTIONS[overall]}</p>
      <ul className="mt-3 space-y-1 text-xs text-parchment-dim">
        {reasons.filter(Boolean).map((r) => (
          <li key={r}>{r}</li>
        ))}
        {divergent.map(([name, a]) => (
          <li key={name} className="text-parchment-faint">
            {name} disagrees: {STATE_STYLES[a.state].short.toLowerCase()}.
          </li>
        ))}
      </ul>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[11px] text-parchment-faint">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-4 h-px" style={{ background: MA50_COLOR }} /> 50-day average
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-4 h-px" style={{ background: MA200_COLOR }} /> 200-day average
      </span>
      <span>
        <span className="text-loss-bright">▼ D</span> distribution day
      </span>
      <span>
        <span className="text-warn">▼ S</span> stalling day
      </span>
      <span>
        <span className="text-gain-bright">▲ FTD</span> follow-through day
      </span>
      <span className="flex items-center gap-1.5">
        Status band:
        {[
          ["uptrend", "uptrend"],
          ["pressure", "under pressure"],
          ["correction", "correction"],
        ].map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="inline-block w-3 h-1.5 rounded-sm" style={{ background: BAND_COLORS[key] }} />
            {label}
          </span>
        ))}
      </span>
      <span>Prices from ETFs: SPY, QQQ (Nasdaq-100), DIA, IWM</span>
    </div>
  );
}

function HowItWorks() {
  const r = MARKET_RULES;
  return (
    <details className="mt-8 border border-line rounded-lg bg-surface px-5 py-4 text-sm">
      <summary className="cursor-pointer text-parchment-dim">How the status is decided</summary>
      <ul className="mt-3 space-y-2 text-xs text-parchment-dim leading-relaxed list-disc pl-4">
        <li>
          <span className="text-parchment">Distribution day:</span> the index closes down {r.distributionDropPct}% or
          more on higher volume than the day before. It counts for {r.distributionWindow} sessions, or until the
          index closes {r.distributionExpiryRallyPct}% above it.
        </li>
        <li>
          <span className="text-parchment">Stalling day:</span> counts like a distribution day. Near a high (within{" "}
          {r.stallingNearHighPct}% of the last {r.stallingLookback} sessions&apos; best close), the index gains less than{" "}
          {r.stallingMaxGainPct}% on higher volume and closes in the lower half of its range.
        </li>
        <li>
          <span className="text-parchment">Uptrend under pressure:</span> {r.pressureDistributionDays} or more
          distribution days, or a close below the 50-day average.
        </li>
        <li>
          <span className="text-parchment">Correction:</span> a close {r.correctionDrawdownPct}% or more below the
          uptrend&apos;s high, or {r.correctionDistributionDays}+ distribution days while below the 50-day.
        </li>
        <li>
          <span className="text-parchment">Follow-through day:</span> in a correction, the first up day starts a
          rally attempt. On day {r.followThroughMinDay} or later, a gain of {r.followThroughGainPct}%+ on higher
          volume confirms a new uptrend. Undercutting the rally&apos;s low restarts the count.
        </li>
        <li>
          <span className="text-parchment">Failed follow-through:</span> if the index later undercuts the low the
          rally started from, the follow-through has failed and the market is back in correction.
        </li>
        <li>
          <span className="text-parchment">Overall:</span> a correction only when the S&amp;P 500 and Nasdaq are
          both correcting; a follow-through on either confirms the uptrend; under pressure if either one is.
        </li>
        <li>
          Today&apos;s bar is left out until the 4pm New York close, since its volume is still partial. These are
          ETF prices and volumes, so counts can differ slightly from IBD&apos;s, which use the indexes themselves.
        </li>
      </ul>
    </details>
  );
}
