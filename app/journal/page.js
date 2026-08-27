"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTrades } from "@/contexts/TradesContext";
import TradeRow from "@/components/TradeRow";
import PositionGroupRow from "@/components/PositionGroupRow";
import StatCard from "@/components/StatCard";
import {
  computeStats,
  capitalDeployed,
  filterTradesByPeriod,
  groupTradesByTicker,
  formatCurrency,
  formatPercent,
} from "@/lib/calc";

const RANGE_PRESETS = [
  { key: "all", label: "All Time" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "last3Months", label: "Last 3 Months" },
  { key: "ytd", label: "Year to Date" },
  { key: "custom", label: "Custom" },
];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Preset date ranges, computed off the local calendar (a trade's exit date
// is a plain "YYYY-MM-DD" with no timezone, so "this month" should match
// the user's own wall-clock month, not UTC's).
function presetRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (key === "thisMonth") return { from: toDateStr(new Date(y, m, 1)), to: toDateStr(now) };
  if (key === "lastMonth")
    return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
  if (key === "last3Months") return { from: toDateStr(new Date(y, m - 2, 1)), to: toDateStr(now) };
  if (key === "ytd") return { from: toDateStr(new Date(y, 0, 1)), to: toDateStr(now) };
  return null;
}

export default function JournalPage() {
  return (
    <Suspense fallback={null}>
      <JournalContent />
    </Suspense>
  );
}

function JournalContent() {
  const { trades } = useTrades();
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(openParam || null);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [rangeKey, setRangeKey] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [tagFilter, setTagFilter] = useState(null);

  const allTags = useMemo(() => {
    const set = new Set();
    trades.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [trades]);

  const dateRange = useMemo(() => {
    if (rangeKey === "all") return null;
    if (rangeKey === "custom") return { from: customFrom || null, to: customTo || null };
    return presetRange(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  const statusFiltered = useMemo(() => {
    if (filter === "all") return trades;
    if (filter === "open") return trades.filter((t) => t.status === "open");
    return trades.filter((t) => t.status === "closed");
  }, [trades, filter]);

  // filterTradesByPeriod judges each trade by whichever date it actually
  // has: a still-open trade by its entry date, a fully-closed trade by its
  // close date — so "Open" + "Last Month" means "opened last month" and
  // "Closed" + "Last Month" means "closed last month", instead of a closed-
  // only date check silently zeroing out every open trade.
  const dateRangeApplies = Boolean(dateRange);

  const periodFiltered = useMemo(() => {
    if (!dateRangeApplies) return statusFiltered;
    return filterTradesByPeriod(statusFiltered, dateRange.from, dateRange.to);
  }, [statusFiltered, dateRangeApplies, dateRange]);

  const filtered = useMemo(() => {
    if (!tagFilter) return periodFiltered;
    return periodFiltered.filter((t) => (t.tags || []).includes(tagFilter));
  }, [periodFiltered, tagFilter]);

  const periodStats = useMemo(
    () => (dateRangeApplies ? computeStats(filtered) : null),
    [dateRangeApplies, filtered]
  );
  const periodCapital = useMemo(
    () => (dateRangeApplies ? capitalDeployed(filtered) : 0),
    [dateRangeApplies, filtered]
  );
  const periodPnlPercent = periodStats && periodCapital ? (periodStats.totalPnl / periodCapital) * 100 : 0;

  const rows = useMemo(() => groupTradesByTicker(filtered), [filtered]);

  // If a trade was deep-linked via ?open=, and it landed inside a group
  // (scaled into a name with other open lots, or closed same-day as another
  // lot), expand that group by default so the linked trade is actually
  // visible instead of hidden in a collapsed row.
  useEffect(() => {
    if (!openParam) return;
    const owningGroup = rows.find(
      (r) => r.type === "group" && r.lots.some((l) => l.id === openParam)
    );
    if (owningGroup) {
      setExpandedGroups((cur) => new Set(cur).add(owningGroup.key));
    }
  }, [openParam, rows]);

  function toggleGroup(key) {
    setExpandedGroups((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">Journal</h1>
        <span className="font-mono text-xs text-parchment-faint">
          {trades.length} trade{trades.length === 1 ? "" : "s"} logged
        </span>
      </div>
      <div className="rule-divider mt-4 mb-6" />

      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { key: "all", label: "All" },
          { key: "open", label: "Open" },
          { key: "closed", label: "Closed" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
              filter === f.key
                ? "border-gold-dim text-gold-bright bg-surface-alt"
                : "border-line text-parchment-faint hover:text-parchment-dim"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {RANGE_PRESETS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
              rangeKey === r.key
                ? "border-gold-dim text-gold-bright bg-surface-alt"
                : "border-line text-parchment-faint hover:text-parchment-dim"
            }`}
          >
            {r.label}
          </button>
        ))}
        {rangeKey === "custom" && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-surface border border-line rounded-md px-2 py-1 text-xs text-parchment-dim font-mono"
            />
            <span className="text-xs text-parchment-faint">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-surface border border-line rounded-md px-2 py-1 text-xs text-parchment-dim font-mono"
            />
          </div>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs text-parchment-faint mr-1">Tags:</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter((cur) => (cur === tag ? null : tag))}
              className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                tagFilter === tag
                  ? "border-gold-dim text-gold-bright bg-surface-alt"
                  : "border-line text-parchment-faint hover:text-parchment-dim"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {periodStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard
            label="Total P&L"
            value={`${formatCurrency(periodStats.totalPnl)} (${
              periodPnlPercent >= 0 ? "+" : ""
            }${formatPercent(periodPnlPercent)})`}
            tone={periodStats.totalPnl >= 0 ? "gain" : "loss"}
            sub={`${periodStats.closedTrades} trade${periodStats.closedTrades === 1 ? "" : "s"} closed`}
          />
          <StatCard
            label="Win rate"
            value={formatPercent(periodStats.winRate)}
            sub={`${periodStats.tradesWithExits} with exits`}
          />
          <StatCard
            label="Avg R-multiple"
            value={`${periodStats.avgR}R`}
            tone={periodStats.avgR >= 0 ? "gain" : "loss"}
          />
          <StatCard
            label="Expectancy / trade"
            value={formatCurrency(periodStats.expectancy)}
            tone={periodStats.expectancy >= 0 ? "gain" : "loss"}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
          {dateRangeApplies || tagFilter ? "No trades match these filters." : "No trades in this view yet."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) =>
            row.type === "group" ? (
              <PositionGroupRow
                key={row.key}
                kind={row.kind}
                ticker={row.ticker}
                lots={row.lots}
                shares={row.shares}
                avgEntryPrice={row.avgEntryPrice}
                exitDate={row.exitDate}
                realizedPnl={row.realizedPnl}
                rMultiple={row.rMultiple}
                groupExpanded={expandedGroups.has(row.key)}
                onToggleGroup={() => toggleGroup(row.key)}
                expandedTradeId={expanded}
                onToggleTrade={(id) =>
                  setExpanded((cur) => (cur === id ? null : id))
                }
              />
            ) : (
              <TradeRow
                key={row.trade.id}
                trade={row.trade}
                expanded={expanded === row.trade.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === row.trade.id ? null : row.trade.id))
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
