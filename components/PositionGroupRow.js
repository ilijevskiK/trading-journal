"use client";

import Link from "next/link";
import TradeRow from "@/components/TradeRow";
import { formatCurrency } from "@/lib/calc";

// Header row for a ticker with more than one lot in the same bucket — either
// several open lots (combined remaining shares + weighted-average entry) or
// several lots that all closed on the same day (combined shares, weighted
// average entry, summed realized P&L/R). Expanding it reveals each
// underlying lot as its own normal TradeRow, so per-lot thesis/stop/emotion/
// exits stay intact and individually editable.
export default function PositionGroupRow({
  kind,
  ticker,
  lots,
  shares,
  avgEntryPrice,
  exitDate,
  realizedPnl,
  rMultiple,
  groupExpanded,
  onToggleGroup,
  expandedTradeId,
  onToggleTrade,
}) {
  const isClosed = kind === "closed";
  return (
    <div className="border border-line rounded-lg bg-surface overflow-hidden">
      <button
        onClick={onToggleGroup}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-alt/50 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-mono text-sm text-parchment w-16 shrink-0">{ticker}</span>
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${
              isClosed ? "border-line text-parchment-faint" : "border-gold-dim text-gold-bright"
            }`}
          >
            {isClosed ? "closed" : "open"} · {lots.length} lots
          </span>
          <span className="text-xs text-parchment-faint truncate hidden sm:inline">
            {shares} sh combined{isClosed ? ` · closed ${exitDate}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {isClosed && (
            <span
              className={`font-mono text-sm ${
                realizedPnl >= 0 ? "text-gain-bright" : "text-loss-bright"
              }`}
            >
              {formatCurrency(realizedPnl)} · {rMultiple.toFixed(1)}R
            </span>
          )}
          <span className="font-mono text-sm text-parchment-dim">
            avg {formatCurrency(avgEntryPrice)}
          </span>
          <span className="text-parchment-faint text-xs">{groupExpanded ? "▾" : "▸"}</span>
        </div>
      </button>

      {groupExpanded && (
        <div className="border-t border-line px-3 py-3 space-y-2.5 bg-surface-alt/30">
          {lots.map((lot) => (
            <TradeRow
              key={lot.id}
              trade={lot}
              expanded={expandedTradeId === lot.id}
              onToggle={() => onToggleTrade(lot.id)}
            />
          ))}
          {!isClosed && (
            <div className="flex justify-end pt-0.5">
              <Link
                href={`/new?ticker=${encodeURIComponent(ticker)}`}
                className="text-xs text-gold-bright hover:underline"
              >
                + Add shares to {ticker}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
