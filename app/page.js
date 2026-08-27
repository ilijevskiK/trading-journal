"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTrades } from "@/contexts/TradesContext";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import StatCard from "@/components/StatCard";
import DisciplineRing from "@/components/DisciplineRing";
import EquityCurveChart from "@/components/EquityCurveChart";
import RMultipleChart from "@/components/RMultipleChart";
import BalancePieChart from "@/components/BalancePieChart";
import {
  computeStats,
  computeEquityCurve,
  computeBalanceSheet,
  currentAccountSize,
  overallDisciplineScore,
  disciplineChecks,
  rMultiple,
  sharesRemaining,
  topMovers,
  maxDrawdown,
  formatCurrency,
  formatPercent,
} from "@/lib/calc";

const CHECK_LABELS = {
  hasThesis: "Wrote a one-sentence thesis",
  hasStop: "Set a stop before entry",
  understoodBusiness: "Actually understood the business",
  stopNotMoved: "Didn't move the stop against plan",
  sizedWithinLimit: "Stayed within position-size limit",
};

export default function DashboardPage() {
  const { trades, settings, deposits, loaded } = useTrades();

  const accountSize = useMemo(
    () => currentAccountSize(settings.accountSize, deposits),
    [settings.accountSize, deposits]
  );

  const stats = useMemo(() => computeStats(trades), [trades]);
  // Return on contributed capital (starting size + deposits) — not on
  // current equity, so a deposit doesn't itself change this percentage.
  const pnlPercent = accountSize ? (stats.totalPnl / accountSize) * 100 : 0;
  const equityCurve = useMemo(
    () => computeEquityCurve(trades, deposits, settings.accountSize),
    [trades, deposits, settings.accountSize]
  );
  const discipline = useMemo(() => overallDisciplineScore(trades), [trades]);
  const drawdown = useMemo(() => maxDrawdown(equityCurve), [equityCurve]);

  const openTickers = useMemo(
    () => trades.filter((t) => sharesRemaining(t) > 0).map((t) => t.ticker),
    [trades]
  );
  const { quotes: livePrices, loading: loadingQuotes } = useLiveQuotes(
    openTickers,
    settings.twelveDataApiKey
  );
  const balanceSheet = useMemo(
    () => computeBalanceSheet({ trades, accountSize, livePrices }),
    [trades, accountSize, livePrices]
  );

  const checkFailureCounts = useMemo(() => {
    const counts = {};
    Object.keys(CHECK_LABELS).forEach((k) => (counts[k] = 0));
    trades.forEach((t) => {
      const { checks } = disciplineChecks(t);
      Object.entries(checks).forEach(([k, v]) => {
        if (!v) counts[k] += 1;
      });
    });
    return counts;
  }, [trades]);

  const topFailures = Object.entries(checkFailureCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const flaggedTrades = useMemo(
    () =>
      trades
        .map((t) => ({ trade: t, ...disciplineChecks(t) }))
        .filter((x) => x.score < 100)
        .sort((a, b) => a.score - b.score)
        .slice(0, 5),
    [trades]
  );

  const { winners: topWinners, losers: topLosers } = useMemo(() => topMovers(trades, 3), [trades]);

  if (!loaded) return null;

  if (trades.length === 0) {
    return (
      <div className="max-w-xl">
        <PageHeader />
        <div className="mt-10 border border-line rounded-lg bg-surface px-6 py-10 text-center">
          <p className="text-parchment-dim text-sm mb-4">
            No trades logged yet. Start with your next one — even better, log
            a couple from memory (Oklo, CTSH, the winners you sold too early)
            so the analytics have something real to work with.
          </p>
          <Link
            href="/new"
            className="inline-block bg-gold text-ink px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gold-bright transition-colors"
          >
            Log your first trade
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
        <StatCard
          label="Total P&L"
          value={`${formatCurrency(stats.totalPnl)} (${pnlPercent >= 0 ? "+" : ""}${formatPercent(
            pnlPercent
          )})`}
          tone={stats.totalPnl >= 0 ? "gain" : "loss"}
          sub={`${stats.tradesWithExits} trades with exits`}
        />
        <StatCard
          label="Win rate"
          value={formatPercent(stats.winRate)}
          sub={`${stats.closedTrades} closed`}
        />
        <StatCard
          label="Avg R-multiple"
          value={`${stats.avgR}R`}
          tone={stats.avgR >= 0 ? "gain" : "loss"}
        />
        <StatCard
          label="Expectancy / trade"
          value={formatCurrency(stats.expectancy)}
          tone={stats.expectancy >= 0 ? "gain" : "loss"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <div className="bg-surface border border-line rounded-lg p-5">
          <SectionLabel>Biggest winners</SectionLabel>
          {topWinners.length === 0 ? (
            <p className="text-sm text-parchment-faint mt-3">No winning trades closed yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {topWinners.map(({ trade, pnl }) => (
                <li key={trade.id} className="py-2.5 flex items-center justify-between">
                  <Link
                    href={`/journal?open=${trade.id}`}
                    className="font-mono text-sm text-parchment hover:text-gold-bright"
                  >
                    {trade.ticker || "—"}
                  </Link>
                  <span className="font-mono text-sm text-gain-bright">
                    {formatCurrency(pnl)} · {rMultiple(trade).toFixed(1)}R
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-surface border border-line rounded-lg p-5">
          <SectionLabel>Biggest losers</SectionLabel>
          {topLosers.length === 0 ? (
            <p className="text-sm text-parchment-faint mt-3">No losing trades closed yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {topLosers.map(({ trade, pnl }) => (
                <li key={trade.id} className="py-2.5 flex items-center justify-between">
                  <Link
                    href={`/journal?open=${trade.id}`}
                    className="font-mono text-sm text-parchment hover:text-gold-bright"
                  >
                    {trade.ticker || "—"}
                  </Link>
                  <span className="font-mono text-sm text-loss-bright">
                    {formatCurrency(pnl)} · {rMultiple(trade).toFixed(1)}R
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
        <StatCard label="Avg win" value={formatCurrency(stats.avgWin)} tone="gain" />
        <StatCard label="Avg loss" value={formatCurrency(stats.avgLoss)} tone="loss" />
        <StatCard
          label="Max drawdown"
          value={`${formatCurrency(-drawdown.amount)} (${formatPercent(drawdown.percent)})`}
          tone="loss"
          sub="Largest peak-to-trough decline in balance"
        />
      </div>

      <div className="bg-surface border border-line rounded-lg p-5 mt-5">
        <SectionLabel>Current balance sheet</SectionLabel>
        <p className="text-xs text-parchment-faint -mt-1 mb-4">
          Cash plus every open position, valued at today&apos;s price — realized P&amp;L
          from closed trades is already folded into cash.
        </p>
        <BalancePieChart
          cash={balanceSheet.cash}
          totalEquity={balanceSheet.totalEquity}
          positions={balanceSheet.positions}
          hasApiKey={Boolean(settings.twelveDataApiKey)}
          loadingQuotes={loadingQuotes}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-5">
        <div className="md:col-span-2 bg-surface border border-line rounded-lg p-5">
          <SectionLabel>Equity curve</SectionLabel>
          <EquityCurveChart data={equityCurve} />
        </div>

        <div className="bg-surface border border-line rounded-lg p-5 flex flex-col items-center justify-center">
          <SectionLabel>Discipline score</SectionLabel>
          <div className="mt-2">
            <DisciplineRing score={discipline} />
          </div>
          {topFailures.length > 0 ? (
            <div className="mt-4 w-full">
              <p className="text-xs text-parchment-faint mb-2 uppercase tracking-wide">
                Most common slip
              </p>
              <ul className="space-y-1.5">
                {topFailures.map(([key, count]) => (
                  <li
                    key={key}
                    className="text-xs text-parchment-dim flex justify-between"
                  >
                    <span>{CHECK_LABELS[key]}</span>
                    <span className="font-mono text-loss-bright">{count}×</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-xs text-gain-bright text-center">
              Every checklist box, every trade. Keep it that way.
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <div className="bg-surface border border-line rounded-lg p-5">
          <SectionLabel>R-multiple by trade</SectionLabel>
          <RMultipleChart trades={trades} computeR={rMultiple} />
        </div>

        <div className="bg-surface border border-line rounded-lg p-5">
          <SectionLabel>Trades to review</SectionLabel>
          {flaggedTrades.length === 0 ? (
            <p className="text-sm text-parchment-faint mt-3">
              Nothing flagged. Every logged trade passed its checklist.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {flaggedTrades.map(({ trade, checks, score }) => (
                <li key={trade.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/journal?open=${trade.id}`}
                      className="font-mono text-sm text-parchment hover:text-gold-bright"
                    >
                      {trade.ticker || "—"}
                    </Link>
                    <span className="font-mono text-xs text-parchment-faint">
                      {score}/100
                    </span>
                  </div>
                  <div className="text-xs text-loss-bright mt-1">
                    {Object.entries(checks)
                      .filter(([, v]) => !v)
                      .map(([k]) => CHECK_LABELS[k])
                      .join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}

function PageHeader() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">Dashboard</h1>
        <span className="font-mono text-xs text-parchment-faint">{today}</span>
      </div>
      <div className="rule-divider mt-4" />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 className="text-xs uppercase tracking-wide text-parchment-faint mb-1">
      {children}
    </h2>
  );
}
