"use client";

import { useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import {
  statsBySymbol,
  statsByDayOfWeek,
  statsByEmotion,
  statsByStrategy,
  holdTimeByOutcome,
  formatCurrency,
  formatPercent,
  round,
} from "@/lib/calc";
import { getStrategy } from "@/content/strategies";

export default function BreakdownsPage() {
  const { trades, loaded } = useTrades();

  const bySymbol = useMemo(() => statsBySymbol(trades), [trades]);
  const byDayOfWeek = useMemo(() => statsByDayOfWeek(trades), [trades]);
  const byEmotion = useMemo(() => statsByEmotion(trades), [trades]);
  const byStrategy = useMemo(() => {
    return statsByStrategy(trades).map((row) => ({
      ...row,
      key: row.key || "none",
      label: row.key ? getStrategy(row.key)?.title || row.key : "No strategy tagged",
    }));
  }, [trades]);
  const holdTime = useMemo(() => holdTimeByOutcome(trades), [trades]);

  if (!loaded) return null;

  const hasAnyRealized =
    bySymbol.length > 0 || byDayOfWeek.length > 0 || byEmotion.length > 0 || byStrategy.length > 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">Breakdowns</h1>
        <span className="font-mono text-xs text-parchment-faint">
          P&amp;L by symbol, weekday, emotion, strategy — plus hold time
        </span>
      </div>
      <div className="rule-divider mt-4 mb-8" />

      {!hasAnyRealized ? (
        <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
          No closed trades yet — breakdowns need at least one realized exit to report on.
        </div>
      ) : (
        <div className="space-y-8">
          <HoldTimeSection holdTime={holdTime} />
          <BreakdownSection title="By symbol" rows={bySymbol} />
          <BreakdownSection title="By day of week closed" rows={byDayOfWeek} />
          <BreakdownSection title="By emotion at entry" rows={byEmotion} />
          <BreakdownSection title="By strategy" rows={byStrategy} />
        </div>
      )}
    </div>
  );
}

// A direct check for the disposition effect (holding losers longer, hoping
// they recover, while cutting winners short) rather than a feeling — see
// lib/calc.js's holdTimeByOutcome.
function HoldTimeSection({ holdTime }) {
  const { winners, losers } = holdTime;
  const haveBoth = winners.avgDays != null && losers.avgDays != null;

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <h2 className="text-xs uppercase tracking-wide text-parchment-faint mb-3">
        Hold time: winners vs. losers
      </h2>
      {winners.count === 0 && losers.count === 0 ? (
        <p className="text-sm text-parchment-faint">Not enough closed trades yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-parchment-faint mb-1">Winners ({winners.count})</p>
              <p className="font-mono text-lg text-gain-bright">
                {winners.avgDays != null ? `${winners.avgDays} days avg` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-parchment-faint mb-1">Losers ({losers.count})</p>
              <p className="font-mono text-lg text-loss-bright">
                {losers.avgDays != null ? `${losers.avgDays} days avg` : "—"}
              </p>
            </div>
          </div>
          {haveBoth && losers.avgDays > winners.avgDays && (
            <p className="text-xs text-warn mt-3">
              You&apos;re holding losers {round(losers.avgDays - winners.avgDays, 1)} days longer than
              winners on average — a classic sign of cutting winners short and hoping losers recover.
            </p>
          )}
          {haveBoth && winners.avgDays >= losers.avgDays && (
            <p className="text-xs text-gain-bright mt-3">
              You&apos;re not holding losers longer than winners on average — good discipline on cutting
              them loose.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownSection({ title, rows }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <h2 className="text-xs uppercase tracking-wide text-parchment-faint mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-parchment-faint">Not enough closed trades yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-parchment-faint uppercase tracking-wide border-b border-line">
              <th className="pb-2 font-normal">Group</th>
              <th className="pb-2 font-normal text-right">Trades</th>
              <th className="pb-2 font-normal text-right">Win rate</th>
              <th className="pb-2 font-normal text-right">Avg R</th>
              <th className="pb-2 font-normal text-right">Total P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-2.5 font-mono text-parchment">{row.label || row.key}</td>
                <td className="py-2.5 text-right text-parchment-dim">{row.tradesWithExits}</td>
                <td className="py-2.5 text-right text-parchment-dim">{formatPercent(row.winRate)}</td>
                <td className={`py-2.5 text-right font-mono ${row.avgR >= 0 ? "text-gain-bright" : "text-loss-bright"}`}>
                  {row.avgR}R
                </td>
                <td
                  className={`py-2.5 text-right font-mono ${
                    row.totalPnl >= 0 ? "text-gain-bright" : "text-loss-bright"
                  }`}
                >
                  {formatCurrency(row.totalPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
