"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StockLetterPage from "@/components/canslim/StockLetterPage";
import LetterSection from "@/components/canslim/LetterSection";
import RsLineChart from "@/components/RsLineChart";
import { LETTER_LINKS } from "@/components/canslim/letterLinks";
import { useTrades } from "@/contexts/TradesContext";
import { useWatchlistCandles } from "@/hooks/useWatchlistCandles";
import { completedSessions } from "@/lib/marketStatus";
import { analyzeLeadership, LEADERSHIP_RULES } from "@/lib/canslimL";
import { getRsRatingAction } from "@/contexts/rsActions";

const BENCHMARK = "SPY";

export default function LeadershipPage() {
  return (
    <StockLetterPage
      path="/strategies/leadership"
      title="Leadership"
      intro="The “L” in CAN SLIM: is it a leader or a laggard? Its RS Rating ranks its last 12 months against every US company, the way O'Neil's does. Rankings from Massive; charts from Twelve Data."
      source="prices"
      related={LETTER_LINKS.filter((l) => l.letter !== "L")}
    >
      {({ ticker }) => <Leadership key={ticker} ticker={ticker} />}
    </StockLetterPage>
  );
}

function Leadership({ ticker }) {
  const { settings, loaded } = useTrades();
  const apiKey = settings.twelveDataApiKey;
  const stock = useWatchlistCandles(ticker, apiKey);
  const spy = useWatchlistCandles(BENCHMARK, apiKey);
  const rs = useRsRating(ticker);
  const result = useMemo(
    () =>
      stock.candles.length && spy.candles.length
        ? analyzeLeadership(completedSessions(stock.candles), completedSessions(spy.candles), {
            rsRating: rs.data?.rating ?? null,
          })
        : null,
    [stock.candles, spy.candles, rs.data]
  );

  if (!loaded) return null;
  if (!apiKey) {
    return (
      <p className="text-sm text-parchment-dim">
        Add a Twelve Data API key in{" "}
        <Link href="/settings" className="text-gold-bright hover:underline">
          Settings
        </Link>{" "}
        to check relative strength.
      </p>
    );
  }
  if (stock.loading || spy.loading) return <p className="text-sm text-parchment-faint">Loading {ticker} and SPY prices…</p>;
  const error = stock.error || spy.error;
  if (error) {
    return (
      <p className="text-sm text-loss-bright">
        {error.message}{" "}
        <button
          onClick={() => {
            stock.refetch();
            spy.refetch();
          }}
          className="underline"
        >
          Retry
        </button>
      </p>
    );
  }
  if (!result) return <p className="text-sm text-parchment-faint">No price data found for {ticker}.</p>;

  return (
    <LetterSection
      letter="L"
      title="Leader or laggard"
      rule={`Beating the market over 12 months with the latest quarter counted double, ideally by ${LEADERSHIP_RULES.strongEdgePts}+ points, with its RS line at or near a new high.`}
      result={result}
    >
      <RsRatingCard rs={rs} ticker={ticker} />
      {result.stats && (
        <>
          <ReturnsTable stats={result.stats} ticker={ticker} />
          <RsLineChart rsLine={result.stats.rsLine} rsHigh={result.stats.rsHigh} />
        </>
      )}
    </LetterSection>
  );
}

function useRsRating(ticker) {
  const [state, setState] = useState({ loading: true, data: null, error: null, pending: false });
  useEffect(() => {
    let cancelled = false;
    getRsRatingAction(ticker)
      .then((res) => {
        if (cancelled) return;
        if (res.error) setState({ loading: false, data: null, error: res.error, pending: false });
        else if (res.pending) setState({ loading: false, data: null, error: null, pending: true });
        else setState({ loading: false, data: res, error: null, pending: false });
      })
      .catch(() => !cancelled && setState({ loading: false, data: null, error: "Couldn't load the RS Rating.", pending: false }));
    return () => {
      cancelled = true;
    };
  }, [ticker]);
  return state;
}

function ratingTone(rating) {
  if (rating >= LEADERSHIP_RULES.minRating) return "text-gain-bright";
  if (rating >= LEADERSHIP_RULES.warnRating) return "text-warn";
  return "text-loss-bright";
}

function RsRatingCard({ rs, ticker }) {
  if (rs.loading) {
    return (
      <p className="mt-5 text-xs text-parchment-faint">
        Loading the RS Rating… The first check of each trading day ranks every US company, which takes about half a
        minute.
      </p>
    );
  }
  if (rs.pending) {
    return <p className="mt-5 text-xs text-parchment-faint">Today&apos;s ranking is being computed. Reload in a minute.</p>;
  }
  if (rs.error) {
    return (
      <p className="mt-5 text-xs text-warn">
        No RS Rating: {rs.error} The verdict below falls back to comparing with the S&amp;P 500.
      </p>
    );
  }
  const d = rs.data;
  if (d.notRanked) {
    return (
      <p className="mt-5 text-xs text-parchment-faint">
        {ticker} isn&apos;t in the latest ranking (it needs at least 3 months of trading history and a listing in the
        SEC&apos;s company list). The verdict falls back to comparing with the S&amp;P 500.
      </p>
    );
  }
  const history = d.history || [];
  const prev = history.length > 5 ? history[history.length - 6] : null;
  return (
    <div className="mt-5 flex items-center gap-5 rounded-md border border-line px-4 py-3">
      <div className="text-center">
        <p className={`font-display text-4xl leading-none ${ratingTone(d.rating)}`}>{d.rating}</p>
        <p className="text-[10px] uppercase tracking-wide text-parchment-faint mt-1">RS Rating</p>
      </div>
      <div className="text-xs text-parchment-dim space-y-0.5">
        <p>
          Beat {d.rating}% of {d.universe.toLocaleString()} US companies over the last 12 months (latest quarter
          counted double).
        </p>
        <p className="text-parchment-faint">
          As of the {new Date(`${d.asOf}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} close
          {prev ? ` · ${d.rating >= prev.rating ? "up" : "down"} from ${prev.rating} a week ago` : ""}
          {d.refreshError ? ` · today's update failed (${d.refreshError})` : ""}
        </p>
      </div>
    </div>
  );
}

const PERIOD_LABELS = { 63: "3 months", 126: "6 months", 189: "9 months", 252: "12 months" };
const signed = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function ReturnsTable({ stats, ticker }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-parchment-faint border-b border-line">
            <th className="pb-2 font-normal font-body">Period</th>
            <th className="pb-2 font-normal font-body text-right">{ticker}</th>
            <th className="pb-2 font-normal font-body text-right">S&amp;P 500</th>
            <th className="pb-2 font-normal font-body text-right">Difference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {stats.returns.map((r) => {
            const diff = r.stock - r.bench;
            return (
              <tr key={r.sessions} className="text-parchment-dim">
                <td className="py-2 font-body">{PERIOD_LABELS[r.sessions]}</td>
                <td className="py-2 text-right text-parchment">{signed(r.stock)}</td>
                <td className="py-2 text-right">{signed(r.bench)}</td>
                <td className={`py-2 text-right ${diff >= 0 ? "text-gain-bright" : "text-loss-bright"}`}>
                  {diff >= 0 ? "+" : ""}
                  {diff.toFixed(1)} pts
                </td>
              </tr>
            );
          })}
          <tr className="text-parchment">
            <td className="py-2 font-body">Weighted score</td>
            <td className="py-2 text-right">{signed(stats.stockScore)}</td>
            <td className="py-2 text-right">{signed(stats.benchScore)}</td>
            <td className={`py-2 text-right ${stats.edge >= 0 ? "text-gain-bright" : "text-loss-bright"}`}>
              {stats.edge >= 0 ? "+" : ""}
              {stats.edge.toFixed(1)} pts
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-parchment-faint mt-2">
        Weighted score: 40% on the last 3 months, 20% each on 6, 9 and 12 months.
      </p>
    </div>
  );
}
