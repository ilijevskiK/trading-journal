"use client";

import { useState } from "react";
import Link from "next/link";
import { useTrades } from "@/contexts/TradesContext";
import {
  realizedPnl,
  sharesRemaining,
  rMultiple,
  disciplineChecks,
  formatCurrency,
  isFullyClosed,
  todayLocalDateStr,
} from "@/lib/calc";
import TradeChart from "@/components/TradeChart";
import { STRATEGIES, getStrategy } from "@/content/strategies";

const CHECK_LABELS = {
  hasThesis: "Thesis written",
  hasStop: "Stop set",
  understoodBusiness: "Understood business",
  stopNotMoved: "Stop not moved",
  sizedWithinLimit: "Within size limit",
};

export default function TradeRow({ trade, expanded, onToggle }) {
  const { updateTrade, deleteTrade, addExit, removeExit, settings } = useTrades();
  const [exitPrice, setExitPrice] = useState("");
  const [exitShares, setExitShares] = useState("");
  const [exitDate, setExitDate] = useState(todayLocalDateStr());
  const [exitReason, setExitReason] = useState("Target hit");
  const [newTag, setNewTag] = useState("");

  const pnl = realizedPnl(trade);
  const remaining = sharesRemaining(trade);
  const r = rMultiple(trade);
  const { checks, score } = disciplineChecks(trade);
  const closed = isFullyClosed(trade);
  const linkedStrategy = getStrategy(trade.strategyId);

  async function handleAddExit(e) {
    e.preventDefault();
    const price = parseFloat(exitPrice);
    const shares = parseFloat(exitShares);
    if (!price || !shares || shares <= 0 || shares > remaining) return;
    await addExit(trade.id, { date: exitDate, price, shares, reason: exitReason });
    if (shares >= remaining) {
      await updateTrade(trade.id, { status: "closed" });
    }
    setExitPrice("");
    setExitShares("");
  }

  async function handleAddTag(e) {
    e.preventDefault();
    const value = newTag.trim();
    if (!value) return;
    const existing = trade.tags || [];
    if (!existing.includes(value)) {
      await updateTrade(trade.id, { tags: [...existing, value] });
    }
    setNewTag("");
  }

  async function handleRemoveTag(tag) {
    await updateTrade(trade.id, { tags: (trade.tags || []).filter((t) => t !== tag) });
  }

  return (
    <div className="border border-line rounded-lg bg-surface overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-alt/50 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-mono text-sm text-parchment w-16 shrink-0">
            {trade.ticker}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${
              trade.status === "open"
                ? "border-gold-dim text-gold-bright"
                : "border-line text-parchment-faint"
            }`}
          >
            {trade.status}
          </span>
          <span className="text-xs text-parchment-faint truncate hidden sm:inline">
            {trade.thesis}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {closed && (
            <span
              className={`font-mono text-sm ${pnl >= 0 ? "text-gain-bright" : "text-loss-bright"}`}
            >
              {formatCurrency(pnl)} · {r.toFixed(1)}R
            </span>
          )}
          <span
            className={`font-mono text-xs ${score === 100 ? "text-parchment-faint" : "text-warn"}`}
          >
            {score}/100
          </span>
          <span className="text-parchment-faint text-xs">{expanded ? "▾" : "▸"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-4 space-y-5">
          <TradeChart trade={trade} apiKey={settings.twelveDataApiKey} />

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-parchment-faint mb-1">
                Thesis
              </p>
              <p className="text-parchment-dim">{trade.thesis || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-parchment-faint mb-1">
                Entry / Stop / Shares
              </p>
              <p className="font-mono text-parchment-dim">
                ${trade.entryPrice} /{" "}
                {trade.stopPrice !== null && trade.stopPrice !== undefined && trade.stopPrice !== ""
                  ? `$${trade.stopPrice}`
                  : "no stop set"}{" "}
                / {trade.shares} sh
              </p>
            </div>
            {trade.premortem && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-parchment-faint mb-1">
                  What would make this wrong
                </p>
                <p className="text-parchment-dim">{trade.premortem}</p>
              </div>
            )}
            {trade.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-parchment-faint mb-1">
                  Notes
                </p>
                <p className="text-parchment-dim">{trade.notes}</p>
              </div>
            )}
          </div>

          {/* Discipline checklist */}
          <div>
            <p className="text-xs uppercase tracking-wide text-parchment-faint mb-2">
              Discipline checklist
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(checks).map(([key, passed]) => (
                <span
                  key={key}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    passed
                      ? "border-gain/40 text-gain-bright bg-gain/5"
                      : "border-loss/40 text-loss-bright bg-loss/5"
                  }`}
                >
                  {passed ? "✓" : "✕"} {CHECK_LABELS[key]}
                </span>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-parchment-dim mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!trade.stopMovedAgainstPlan}
                onChange={(e) =>
                  updateTrade(trade.id, { stopMovedAgainstPlan: e.target.checked })
                }
                className="accent-loss w-3.5 h-3.5"
              />
              I moved my stop against the original plan on this trade
            </label>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs uppercase tracking-wide text-parchment-faint mb-2">Tags</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {(trade.tags || []).length === 0 && (
                <span className="text-xs text-parchment-faint">No tags yet.</span>
              )}
              {(trade.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full border border-line text-parchment-dim bg-surface-alt flex items-center gap-1.5"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-parchment-faint hover:text-loss-bright"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTag} className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                className={miniInput}
                style={{ width: 160 }}
              />
              <button
                type="submit"
                className="bg-surface-alt border border-line text-xs px-3 py-1.5 rounded-md text-parchment-dim hover:text-parchment"
              >
                Add
              </button>
            </form>
          </div>

          {/* Strategy */}
          <div>
            <p className="text-xs uppercase tracking-wide text-parchment-faint mb-2">Strategy used</p>
            {linkedStrategy ? (
              <Link
                href={`/strategies/${linkedStrategy.slug}`}
                className="text-sm text-gold-bright hover:underline"
              >
                {linkedStrategy.title}
              </Link>
            ) : (
              <p className="text-xs text-parchment-faint mb-2">No strategy tagged.</p>
            )}
            <select
              value={trade.strategyId || ""}
              onChange={(e) => updateTrade(trade.id, { strategyId: e.target.value || null })}
              className={miniInput + " mt-2"}
            >
              <option value="">None</option>
              {STRATEGIES.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Exits */}
          <div>
            <p className="text-xs uppercase tracking-wide text-parchment-faint mb-2">
              Exits — {remaining} of {trade.shares} shares remaining
            </p>
            {(trade.exits || []).length > 0 && (
              <ul className="mb-3 space-y-1">
                {trade.exits.map((ex) => (
                  <li
                    key={ex.id}
                    className="flex items-center justify-between text-xs text-parchment-dim font-mono"
                  >
                    <span>
                      {ex.date} · sold {ex.shares} @ ${ex.price} ({ex.reason})
                    </span>
                    <button
                      onClick={() => removeExit(trade.id, ex.id)}
                      className="text-parchment-faint hover:text-loss-bright"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {remaining > 0 && (
              <form
                onSubmit={handleAddExit}
                className="flex flex-wrap gap-2 items-end bg-surface-alt border border-line rounded-md p-3"
              >
                <MiniField label="Date">
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className={miniInput}
                  />
                </MiniField>
                <MiniField label="Price">
                  <input
                    type="number"
                    step="0.01"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className={miniInput}
                    style={{ width: 90 }}
                  />
                </MiniField>
                <MiniField label={`Shares (max ${remaining})`}>
                  <input
                    type="number"
                    value={exitShares}
                    onChange={(e) => setExitShares(e.target.value)}
                    className={miniInput}
                    style={{ width: 90 }}
                  />
                </MiniField>
                <MiniField label="Reason">
                  <select
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    className={miniInput}
                  >
                    <option>Target hit</option>
                    <option>Stop hit</option>
                    <option>Trailing stop</option>
                    <option>Thesis broken</option>
                    <option>Impulse / emotion</option>
                    <option>Scaled out into strength</option>
                  </select>
                </MiniField>
                <button
                  type="submit"
                  className="bg-gold text-ink text-xs px-3 py-2 rounded-md hover:bg-gold-bright"
                >
                  Log exit
                </button>
              </form>
            )}
          </div>

          <div className="flex justify-between items-center pt-1">
            {trade.status === "open" ? (
              <Link
                href={`/new?ticker=${encodeURIComponent(trade.ticker)}`}
                className="text-xs text-gold-bright hover:underline"
              >
                + Add shares to {trade.ticker}
              </Link>
            ) : (
              <span />
            )}
            <button
              onClick={() => {
                if (confirm(`Delete ${trade.ticker}? This can't be undone.`)) {
                  deleteTrade(trade.id);
                }
              }}
              className="text-xs text-parchment-faint hover:text-loss-bright"
            >
              Delete trade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const miniInput =
  "bg-surface border border-line rounded-md px-2 py-1.5 text-xs text-parchment focus:outline-none focus:border-gold-dim";

function MiniField({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-parchment-faint uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  );
}
