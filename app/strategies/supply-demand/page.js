"use client";

import { useMemo } from "react";
import Link from "next/link";
import StockLetterPage from "@/components/canslim/StockLetterPage";
import LetterSection from "@/components/canslim/LetterSection";
import UpDownVolumeChart from "@/components/UpDownVolumeChart";
import { useTrades } from "@/contexts/TradesContext";
import { useWatchlistCandles } from "@/hooks/useWatchlistCandles";
import { completedSessions } from "@/lib/marketStatus";
import { analyzeSupplyDemand, SUPPLY_DEMAND_RULES } from "@/lib/canslimS";
import { LETTER_LINKS } from "@/components/canslim/letterLinks";

export default function SupplyDemandPage() {
  return (
    <StockLetterPage
      path="/strategies/supply-demand"
      title="Supply & Demand"
      intro="The “S” in CAN SLIM: are buyers outweighing sellers, and is the company shrinking its share count rather than issuing more? Volume from Twelve Data; shares and debt from SEC filings."
      related={LETTER_LINKS.filter((l) => l.letter !== "S")}
    >
      {(data) => <SupplyDemand ticker={data.ticker} supply={data.supply} />}
    </StockLetterPage>
  );
}

function SupplyDemand({ ticker, supply }) {
  const { settings, loaded } = useTrades();
  const apiKey = settings.twelveDataApiKey;
  const { candles, loading, error, refetch } = useWatchlistCandles(ticker, apiKey);
  const completed = useMemo(() => completedSessions(candles), [candles]);
  const result = useMemo(() => analyzeSupplyDemand(completed, supply), [completed, supply]);

  if (!loaded) return null;
  const r = SUPPLY_DEMAND_RULES;
  return (
    <LetterSection
      letter="S"
      title="Supply and demand"
      rule={`More volume on up days than down days over the last ${r.volumeSessions} sessions (ideally ${r.strongUpDownRatio}×+), no dilution, and debt under ${r.highDebtToEquity}× equity.`}
      result={result}
    >
      {!apiKey && (
        <p className="text-xs text-parchment-dim mt-4">
          Add a Twelve Data API key in{" "}
          <Link href="/settings" className="text-gold-bright hover:underline">
            Settings
          </Link>{" "}
          to check volume.
        </p>
      )}
      {apiKey && loading && <p className="text-xs text-parchment-faint mt-4">Loading {ticker} prices…</p>}
      {apiKey && error && (
        <p className="text-xs text-loss-bright mt-4">
          {error.message}{" "}
          <button onClick={refetch} className="underline">
            Retry
          </button>
        </p>
      )}
      <Stats stats={result.stats} supply={supply} />
      {completed.length > r.volumeSessions && <UpDownVolumeChart candles={completed} sessions={r.volumeSessions} />}
    </LetterSection>
  );
}

function compact(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return n.toLocaleString();
}

function money(v) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function Stats({ stats, supply }) {
  const items = [];
  if (stats.volume?.ratio != null) {
    items.push(["Up ÷ down volume", `${stats.volume.ratio.toFixed(2)}×`]);
    items.push(["Up / down days", `${stats.volume.upDays} / ${stats.volume.downDays}`]);
  }
  if (supply?.shares) {
    items.push(["Shares (diluted)", `${compact(supply.shares.now)} vs ${compact(supply.shares.yearAgo)} a year ago`]);
  }
  if (stats.sharesChange != null) {
    items.push(["Share count change", `${stats.sharesChange >= 0 ? "+" : ""}${stats.sharesChange.toFixed(1)}%`]);
  }
  if (supply?.debt) items.push(["Debt", `${money(supply.debt.value)}${supply.debtYearAgo != null ? ` (a year ago ${money(supply.debtYearAgo)})` : ""}`]);
  if (stats.debtToEquity != null) items.push(["Debt ÷ equity", `${stats.debtToEquity.toFixed(2)}×`]);
  if (!items.length) return null;
  return (
    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-5 text-xs">
      {items.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-b border-line/60 py-1">
          <dt className="text-parchment-faint">{label}</dt>
          <dd className="font-mono text-right text-parchment-dim">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
