"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTrades } from "@/contexts/TradesContext";
import {
  suggestedPosition,
  currentAccountSize,
  formatCurrency,
  formatPercent,
  todayLocalDateStr,
} from "@/lib/calc";
import { searchSymbols } from "@/lib/marketData";
import TickerSearchInput from "@/components/TickerSearchInput";
import { STRATEGIES } from "@/content/strategies";

const EMOTIONS = ["Confident", "FOMO", "Anxious", "Neutral", "Impatient", "Disciplined"];

export default function NewTradePage() {
  return (
    <Suspense fallback={null}>
      <NewTradeContent />
    </Suspense>
  );
}

function NewTradeContent() {
  const { settings, addTrade, deposits } = useTrades();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Lets "Add shares" on an existing open position (Journal) land here with
  // the ticker pre-filled, since adding to a position is still logged as its
  // own fresh trade — see lib/calc.js groupTradesByTicker for why lots stay
  // separate underneath and are only merged for display.
  const prefillTicker = (searchParams.get("ticker") || "").toUpperCase();

  // What's actually available to size against — starting size plus every
  // deposit logged since (see Settings' "Add funds"), not just the raw
  // settings field, which only ever reflects the very first number entered.
  const accountSize = useMemo(
    () => currentAccountSize(settings.accountSize, deposits),
    [settings.accountSize, deposits]
  );

  const [form, setForm] = useState({
    ticker: prefillTicker,
    thesis: "",
    understoodBusiness: false,
    entryDate: todayLocalDateStr(),
    entryPrice: "",
    stopPrice: "",
    riskPercent: settings.defaultRiskPercent,
    shares: "",
    useSuggestedShares: true,
    target1: "",
    target2: "",
    emotion: "Neutral",
    notes: "",
    premortem: "",
    tags: "",
    strategyId: "",
  });

  const set = (key) => (e) => {
    const val = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: val }));
  };

  // status: 'idle' | 'checking' | 'valid' | 'invalid'. checkedValue tracks
  // which ticker string the status applies to, so an edit after a failed
  // check doesn't keep showing a stale error.
  const [tickerCheck, setTickerCheck] = useState({ status: "idle", checkedValue: "" });
  const [submitting, setSubmitting] = useState(false);

  const tickerCheckIsCurrent =
    form.ticker.trim().length > 0 &&
    tickerCheck.checkedValue.trim().toUpperCase() === form.ticker.trim().toUpperCase();

  // Confirms the ticker is a real, tradable symbol via the same Twelve Data
  // search the suggestion dropdown uses. Without an API key we can't verify
  // anything, so we don't block — the field just behaves as free text.
  async function verifyTicker(rawValue) {
    const value = rawValue.trim();
    if (!value) {
      setTickerCheck({ status: "idle", checkedValue: "" });
      return false;
    }
    if (!settings.twelveDataApiKey) {
      setTickerCheck({ status: "idle", checkedValue: value });
      return true;
    }

    setTickerCheck({ status: "checking", checkedValue: value });
    const { results } = await searchSymbols({ query: value, apiKey: settings.twelveDataApiKey, limit: 8 });
    const isValid = results.some((r) => r.symbol.toUpperCase() === value.toUpperCase());
    setTickerCheck({ status: isValid ? "valid" : "invalid", checkedValue: value });
    return isValid;
  }

  const entryPriceNum = parseFloat(form.entryPrice) || 0;
  const stopPriceNum = parseFloat(form.stopPrice) || 0;
  const riskPercentNum = parseFloat(form.riskPercent) || 0;

  const suggestion = useMemo(() => {
    if (!entryPriceNum || !stopPriceNum) return null;
    return suggestedPosition({
      accountSize,
      riskPercent: riskPercentNum,
      entryPrice: entryPriceNum,
      stopPrice: stopPriceNum,
    });
  }, [entryPriceNum, stopPriceNum, riskPercentNum, accountSize]);

  const sharesToUse = form.useSuggestedShares
    ? suggestion?.shares || 0
    : parseFloat(form.shares) || 0;

  const positionValue = sharesToUse * entryPriceNum;
  const positionPercentOfAccount = accountSize
    ? (positionValue / accountSize) * 100
    : 0;
  const overSizeLimit = positionPercentOfAccount > settings.maxPositionPercentAllowed;

  const stopDirectionValid = entryPriceNum && stopPriceNum ? stopPriceNum < entryPriceNum : true;

  const checklistReady =
    form.ticker.trim().length > 0 &&
    form.thesis.trim().length > 0 &&
    entryPriceNum > 0 &&
    stopPriceNum > 0 &&
    sharesToUse > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!checklistReady || submitting) return;

    setSubmitting(true);
    const tickerValid = await verifyTicker(form.ticker);
    setSubmitting(false);
    if (!tickerValid) return;

    await addTrade({
      ticker: form.ticker.trim().toUpperCase(),
      thesis: form.thesis.trim(),
      understoodBusiness: form.understoodBusiness,
      entryDate: form.entryDate,
      entryPrice: entryPriceNum,
      stopPrice: stopPriceNum,
      shares: sharesToUse,
      target1: parseFloat(form.target1) || null,
      target2: parseFloat(form.target2) || null,
      emotion: form.emotion,
      notes: form.notes.trim(),
      premortem: form.premortem.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i),
      strategyId: form.strategyId || null,
      accountSizeAtEntry: accountSize,
      maxPositionPercentAllowed: settings.maxPositionPercentAllowed,
      stopMovedAgainstPlan: false,
      status: "open",
    });

    router.push("/journal");
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">New Trade</h1>
        <span className="font-mono text-xs text-parchment-faint">Pre-trade checklist</span>
      </div>
      <div className="rule-divider mt-4 mb-8" />

      {prefillTicker && (
        <div className="bg-surface-alt border border-gold-dim/40 rounded-lg px-4 py-3 mb-6 text-xs text-parchment-dim">
          Adding to an existing <span className="text-gold-bright font-mono">{prefillTicker}</span>{" "}
          position — this logs a separate lot with its own thesis and stop, then shows up
          combined with your existing shares on the Journal and dashboard.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Ticker" number="01">
          <TickerSearchInput
            apiKey={settings.twelveDataApiKey}
            value={form.ticker}
            onQueryChange={(v) => setForm((f) => ({ ...f, ticker: v }))}
            onSelect={(symbol) => {
              setForm((f) => ({ ...f, ticker: symbol }));
              setTickerCheck({ status: "valid", checkedValue: symbol });
            }}
            onBlur={() => verifyTicker(form.ticker)}
            clearOnSelect={false}
            placeholder="e.g. AMZN"
            containerClassName="relative"
            inputClassName={inputClass}
          />
        </Field>
        {!settings.twelveDataApiKey ? (
          <p className="text-xs text-parchment-faint -mt-4">
            Add a Twelve Data API key in Settings to verify tickers and get suggestions.
          </p>
        ) : tickerCheckIsCurrent && tickerCheck.status === "checking" ? (
          <p className="text-xs text-parchment-faint -mt-4">Checking ticker…</p>
        ) : tickerCheckIsCurrent && tickerCheck.status === "invalid" ? (
          <p className="text-xs text-loss-bright -mt-4">
            Wrong ticker. Please choose a correct ticker before submitting.
          </p>
        ) : null}

        <Field
          label="One-sentence thesis — why this stock, why now?"
          number="02"
          hint="If you can't finish this sentence, the position size below should be small or zero."
        >
          <textarea
            value={form.thesis}
            onChange={set("thesis")}
            rows={2}
            placeholder="e.g. Earnings accelerating, breaking out of a 6-week base on rising volume."
            className={inputClass}
          />
        </Field>

        <Field
          label="What would make you wrong?"
          number="02b"
          hint="Pre-mortem: the specific thing that, if it happened, would mean this thesis failed."
        >
          <textarea
            value={form.premortem}
            onChange={set("premortem")}
            rows={2}
            placeholder="e.g. If guidance misses next quarter, the breakout thesis is dead."
            className={inputClass}
          />
        </Field>

        <Field label="Do you actually understand this business?" number="03">
          <label className="flex items-center gap-2 text-sm text-parchment-dim cursor-pointer">
            <input
              type="checkbox"
              checked={form.understoodBusiness}
              onChange={set("understoodBusiness")}
              className="accent-gold w-4 h-4"
            />
            Yes — I know how it makes money and why it might grow
          </label>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Entry date" number="04">
            <input
              type="date"
              value={form.entryDate}
              onChange={set("entryDate")}
              className={inputClass}
            />
          </Field>
          <Field label="Emotion at entry" number="—">
            <select value={form.emotion} onChange={set("emotion")} className={inputClass}>
              {EMOTIONS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Entry price ($)" number="05">
            <input
              type="number"
              step="0.01"
              value={form.entryPrice}
              onChange={set("entryPrice")}
              className={inputClass}
            />
          </Field>
          <Field label="Stop-loss price ($)" number="06" hint="Set before you enter. Not moved after.">
            <input
              type="number"
              step="0.01"
              value={form.stopPrice}
              onChange={set("stopPrice")}
              className={inputClass}
            />
          </Field>
        </div>
        {!stopDirectionValid && (
          <p className="text-xs text-warn -mt-2">
            Stop is above entry — double check this is intentional (e.g. a short).
          </p>
        )}

        <Field label="Risk tolerance for this trade (% of account)" number="07">
          <input
            type="number"
            step="0.1"
            value={form.riskPercent}
            onChange={set("riskPercent")}
            className={inputClass}
          />
        </Field>

        {/* Risk calculator readout */}
        <div className="bg-surface-alt border border-line rounded-lg p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-parchment-faint mb-1">
            Position size calculator
          </p>
          {suggestion ? (
            <>
              <Row label="Stop distance" value={formatPercent(suggestion.stopDistancePercent)} />
              <Row label="$ at risk" value={formatCurrency(suggestion.riskAmount)} />
              <Row
                label="Suggested shares"
                value={suggestion.shares}
                highlight
              />
              <Row
                label="Suggested position value"
                value={`${formatCurrency(suggestion.positionValue)} (${formatPercent(
                  (suggestion.positionValue / accountSize) * 100
                )} of account)`}
              />
              <label className="flex items-center gap-2 text-xs text-parchment-dim pt-2">
                <input
                  type="checkbox"
                  checked={form.useSuggestedShares}
                  onChange={set("useSuggestedShares")}
                  className="accent-gold w-3.5 h-3.5"
                />
                Use suggested shares
              </label>
              {!form.useSuggestedShares && (
                <input
                  type="number"
                  value={form.shares}
                  onChange={set("shares")}
                  placeholder="Custom share count"
                  className={inputClass + " mt-1"}
                />
              )}
            </>
          ) : (
            <p className="text-xs text-parchment-faint">
              Enter an entry price and stop-loss to calculate position size.
            </p>
          )}

          {sharesToUse > 0 && (
            <div className="pt-2 border-t border-line mt-2">
              <Row
                label="This position would be"
                value={`${formatPercent(positionPercentOfAccount)} of account`}
                tone={overSizeLimit ? "loss" : "gain"}
              />
              {overSizeLimit && (
                <p className="text-xs text-loss-bright mt-1">
                  Over your {settings.maxPositionPercentAllowed}% position-size limit.
                  Reduce shares or reconsider — this is the exact mistake that hurt on
                  oversized names before.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Target 1 ($) — sell first third here" number="08">
            <input
              type="number"
              step="0.01"
              value={form.target1}
              onChange={set("target1")}
              className={inputClass}
            />
          </Field>
          <Field label="Target 2 ($) — sell second third here" number="09">
            <input
              type="number"
              step="0.01"
              value={form.target2}
              onChange={set("target2")}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Notes" number="10">
          <textarea
            value={form.notes}
            onChange={set("notes")}
            rows={3}
            placeholder="Chart context, sector backdrop, anything future-you should remember."
            className={inputClass}
          />
        </Field>

        <Field label="Tags" number="11" hint="Comma-separated, e.g. earnings, breakout, sector-rotation.">
          <input
            type="text"
            value={form.tags}
            onChange={set("tags")}
            placeholder="e.g. earnings, breakout"
            className={inputClass}
          />
        </Field>

        <Field label="Strategy used (optional)" number="12">
          <select value={form.strategyId} onChange={set("strategyId")} className={inputClass}>
            <option value="">None</option>
            {STRATEGIES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="submit"
          disabled={!checklistReady || submitting}
          className={`w-full py-3 rounded-md text-sm font-medium transition-colors ${
            checklistReady && !submitting
              ? "bg-gold text-ink hover:bg-gold-bright"
              : "bg-surface-alt text-parchment-faint cursor-not-allowed"
          }`}
        >
          {submitting
            ? "Checking ticker…"
            : checklistReady
            ? "Log this trade"
            : "Fill in ticker, thesis, entry & stop to continue"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm text-parchment placeholder:text-parchment-faint focus:outline-none focus:border-gold-dim";

function Field({ label, number, hint, children }) {
  return (
    <div>
      <label className="flex items-baseline gap-2 text-sm text-parchment-dim mb-1.5">
        <span className="font-mono text-xs text-parchment-faint">{number}</span>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-parchment-faint mt-1">{hint}</p>}
    </div>
  );
}

function Row({ label, value, highlight, tone }) {
  const toneClass =
    tone === "gain" ? "text-gain-bright" : tone === "loss" ? "text-loss-bright" : "text-parchment";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-parchment-faint">{label}</span>
      <span className={`font-mono ${highlight ? "text-gold-bright" : toneClass}`}>{value}</span>
    </div>
  );
}
