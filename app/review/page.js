"use client";

import { useMemo } from "react";
import { useTrades } from "@/contexts/TradesContext";
import ReviewTrendChart from "@/components/ReviewTrendChart";
import { monthlyReviewTrend, formatCurrency, formatPercent } from "@/lib/calc";

export default function ReviewPage() {
  const { trades, loaded } = useTrades();
  const trend = useMemo(() => monthlyReviewTrend(trades), [trades]);

  if (!loaded) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">Review</h1>
        <span className="font-mono text-xs text-parchment-faint">Discipline &amp; win rate over time</span>
      </div>
      <div className="rule-divider mt-4 mb-8" />

      {trend.length === 0 ? (
        <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
          No trades logged yet — this fills in month by month as you log trades.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-surface border border-line rounded-lg p-5">
            <h2 className="text-xs uppercase tracking-wide text-parchment-faint mb-3">Monthly trend</h2>
            <ReviewTrendChart data={trend} />
          </div>

          <div className="bg-surface border border-line rounded-lg p-5">
            <h2 className="text-xs uppercase tracking-wide text-parchment-faint mb-3">By month</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-parchment-faint uppercase tracking-wide border-b border-line">
                  <th className="pb-2 font-normal">Month</th>
                  <th className="pb-2 font-normal text-right">Trades</th>
                  <th className="pb-2 font-normal text-right">Win rate</th>
                  <th className="pb-2 font-normal text-right">Discipline</th>
                  <th className="pb-2 font-normal text-right">Total P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {trend.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2.5 font-mono text-parchment">{row.month}</td>
                    <td className="py-2.5 text-right text-parchment-dim">{row.trades}</td>
                    <td className="py-2.5 text-right text-parchment-dim">{formatPercent(row.winRate)}</td>
                    <td className="py-2.5 text-right text-parchment-dim">{row.discipline}/100</td>
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
          </div>
        </div>
      )}
    </div>
  );
}
