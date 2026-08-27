"use client";

import { useEffect, useRef, useState } from "react";
import { useTrades } from "@/contexts/TradesContext";
import { parseTrading212Csv } from "@/lib/csvImport";
import { currentAccountSize, formatCurrency, todayLocalDateStr } from "@/lib/calc";

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    resetAll,
    trades,
    deposits,
    addDeposit,
    removeDeposit,
    importData,
    loaded,
  } = useTrades();
  const [local, setLocal] = useState(settings);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDate, setDepositDate] = useState(todayLocalDateStr());

  // `settings` starts as defaults and is replaced with the real
  // localStorage-loaded values shortly after mount (see TradesContext) — resync
  // once that happens, so a page reload doesn't show stale/blank fields.
  useEffect(() => {
    if (loaded) setLocal(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  const [saved, setSaved] = useState(false);
  const [importMessage, setImportMessage] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showFinnhubKey, setShowFinnhubKey] = useState(false);
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);

  function handleSave(e) {
    e.preventDefault();
    updateSettings({
      accountSize: parseFloat(local.accountSize) || 0,
      defaultRiskPercent: parseFloat(local.defaultRiskPercent) || 0,
      maxPositionPercentAllowed: parseFloat(local.maxPositionPercentAllowed) || 0,
      twelveDataApiKey: (local.twelveDataApiKey || "").trim(),
      finnhubApiKey: (local.finnhubApiKey || "").trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function handleAddDeposit(e) {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    addDeposit({ date: depositDate, amount });
    setDepositAmount("");
  }

  function handleExport() {
    // Exclude API keys from exports — they're personal credentials, and an
    // exported journal file is meant to be portable/shareable as a backup.
    const { twelveDataApiKey, finnhubApiKey, ...settingsWithoutKey } = settings;
    const blob = new Blob(
      [JSON.stringify({ trades, deposits, settings: settingsWithoutKey }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trading-journal-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const addedCount = importData(data);
        setImportMessage({
          type: "success",
          text: `Imported ${addedCount} new trade${addedCount === 1 ? "" : "s"}${
            addedCount < (data.trades?.length || 0)
              ? ` (${data.trades.length - addedCount} already present, skipped)`
              : ""
          }.`,
        });
      } catch (err) {
        setImportMessage({
          type: "error",
          text: `Import failed: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);

    e.target.value = "";
  }

  function handleImportCsvClick() {
    csvInputRef.current?.click();
  }

  function handleImportCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { trades: parsedTrades, warnings } = parseTrading212Csv(reader.result);
        const addedCount = importData({ trades: parsedTrades });
        const warningText =
          warnings.length > 0
            ? ` ${warnings.length} row${warnings.length === 1 ? "" : "s"} couldn't be matched or parsed and ${
                warnings.length === 1 ? "was" : "were"
              } skipped — see below.`
            : "";
        setImportMessage({
          type: warnings.length > 0 ? "warning" : "success",
          text: `Imported ${addedCount} trade${addedCount === 1 ? "" : "s"} from Trading212.${warningText}`,
          details: warnings,
        });
      } catch (err) {
        setImportMessage({ type: "error", text: `CSV import failed: ${err.message}` });
      }
    };
    reader.readAsText(file);

    e.target.value = "";
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl text-parchment">Settings</h1>
      <div className="rule-divider mt-4 mb-8" />

      <form onSubmit={handleSave} className="space-y-5">
        <Field
          label="Starting account size ($)"
          hint={`The baseline before any deposits. Add ongoing contributions below instead of editing this — current total: ${formatCurrency(
            currentAccountSize(settings.accountSize, deposits)
          )}.`}
        >
          <input
            type="number"
            value={local.accountSize}
            onChange={(e) => setLocal((f) => ({ ...f, accountSize: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <Field label="Default risk per trade (%)" hint="Suggested: 1–2% of account. This pre-fills the risk calculator on new trades.">
          <input
            type="number"
            step="0.1"
            value={local.defaultRiskPercent}
            onChange={(e) => setLocal((f) => ({ ...f, defaultRiskPercent: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <Field
          label="Max position size (% of account)"
          hint="Trades sized above this get flagged on the discipline checklist. Suggested: 15–25% while rebuilding."
        >
          <input
            type="number"
            step="1"
            value={local.maxPositionPercentAllowed}
            onChange={(e) =>
              setLocal((f) => ({ ...f, maxPositionPercentAllowed: e.target.value }))
            }
            className={inputClass}
          />
        </Field>

        <div className="pt-2">
          <h2 className="text-sm text-parchment mb-2">Market data</h2>
          <p className="text-xs text-parchment-faint mb-3">
            Powers the price chart on each trade&apos;s detail view. Get a
            free key at{" "}
            <a
              href="https://twelvedata.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-bright hover:underline"
            >
              twelvedata.com
            </a>{" "}
            (free tier: 800 requests/day) — stored only in this browser,
            never sent anywhere but Twelve Data&apos;s API, and left out of
            journal exports.
          </p>
          <Field label="Twelve Data API key">
            <div className="flex gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={local.twelveDataApiKey || ""}
                onChange={(e) =>
                  setLocal((f) => ({ ...f, twelveDataApiKey: e.target.value }))
                }
                placeholder="Paste your API key"
                className={inputClass + " font-mono"}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="shrink-0 text-xs border border-line rounded-md px-3 text-parchment-dim hover:text-parchment hover:border-gold-dim"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          <p className="text-xs text-parchment-faint mt-4 mb-3">
            Optional — adds live-updating candles to the watchlist&apos;s 6
            charts via a real-time trade stream. Get a free key at{" "}
            <a
              href="https://finnhub.io/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-bright hover:underline"
            >
              finnhub.io
            </a>{" "}
            — same storage rules as above: this browser only, never in
            exports. Without a key, watchlist charts still work, just without
            live updates.
          </p>
          <Field label="Finnhub API key">
            <div className="flex gap-2">
              <input
                type={showFinnhubKey ? "text" : "password"}
                value={local.finnhubApiKey || ""}
                onChange={(e) =>
                  setLocal((f) => ({ ...f, finnhubApiKey: e.target.value }))
                }
                placeholder="Paste your API key"
                className={inputClass + " font-mono"}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowFinnhubKey((v) => !v)}
                className="shrink-0 text-xs border border-line rounded-md px-3 text-parchment-dim hover:text-parchment hover:border-gold-dim"
              >
                {showFinnhubKey ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
        </div>

        <button
          type="submit"
          className="bg-gold text-ink px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gold-bright transition-colors"
        >
          {saved ? "Saved ✓" : "Save settings"}
        </button>
      </form>

      <div className="rule-divider mt-10 mb-6" />

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm text-parchment">Add funds</h2>
          <span className="font-mono text-xs text-parchment-dim">
            Current: {formatCurrency(currentAccountSize(settings.accountSize, deposits))}
          </span>
        </div>
        <p className="text-xs text-parchment-faint">
          Log a deposit — e.g. a monthly contribution — instead of editing the
          starting account size above. This keeps a dated record, and the
          equity curve shows the jump on the day it actually happened rather
          than silently inflating your starting balance.
        </p>

        <form
          onSubmit={handleAddDeposit}
          className="flex flex-wrap gap-2 items-end bg-surface-alt border border-line rounded-md p-3"
        >
          <MiniField label="Date">
            <input
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className={miniInputClass}
            />
          </MiniField>
          <MiniField label="Amount ($)">
            <input
              type="number"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className={miniInputClass}
              style={{ width: 110 }}
            />
          </MiniField>
          <button
            type="submit"
            className="bg-gold text-ink text-xs px-3 py-2 rounded-md hover:bg-gold-bright"
          >
            Add funds
          </button>
        </form>

        {deposits.length > 0 && (
          <ul className="divide-y divide-line">
            {deposits.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between text-xs text-parchment-dim font-mono py-1.5"
              >
                <span>
                  {d.date} · +{formatCurrency(d.amount)}
                </span>
                <button
                  onClick={() => removeDeposit(d.id)}
                  className="text-parchment-faint hover:text-loss-bright"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rule-divider mt-10 mb-6" />

      <div className="space-y-3">
        <h2 className="text-sm text-parchment">Data</h2>
        <p className="text-xs text-parchment-faint">
          All data lives in this browser&apos;s local storage — nothing is sent
          anywhere. Export a backup before clearing browser data or switching
          devices.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="text-xs border border-line rounded-md px-3 py-2 text-parchment-dim hover:text-parchment hover:border-gold-dim"
          >
            Export journal as JSON
          </button>
          <button
            onClick={handleImportClick}
            className="text-xs border border-line rounded-md px-3 py-2 text-parchment-dim hover:text-parchment hover:border-gold-dim"
          >
            Import journal from JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={handleImportCsvClick}
            className="text-xs border border-line rounded-md px-3 py-2 text-parchment-dim hover:text-parchment hover:border-gold-dim"
          >
            Import from Trading212 CSV
          </button>
          <input
            ref={csvInputRef}
            type="file"
            // Deliberately broad: some OS/browser combos (Windows in
            // particular, where .csv is often Excel-associated) report a
            // .csv file's MIME type as application/vnd.ms-excel rather than
            // text/csv, which a narrower accept list would filter out of
            // the picker entirely. `accept` is just a UI hint, not a
            // security boundary — the parser itself gives a clear error if
            // the content isn't a Trading212 export.
            accept=".csv,.txt,text/csv,text/plain,application/vnd.ms-excel,application/csv"
            onChange={handleImportCsvFile}
            className="hidden"
          />
          <button
            onClick={() => {
              if (
                confirm(
                  "This deletes every trade and resets settings. This can't be undone. Continue?"
                )
              ) {
                resetAll();
              }
            }}
            className="text-xs border border-loss/40 rounded-md px-3 py-2 text-loss-bright hover:bg-loss/10"
          >
            Reset all data
          </button>
        </div>
        {importMessage && (
          <div>
            <p
              className={`text-xs ${
                importMessage.type === "error"
                  ? "text-loss-bright"
                  : importMessage.type === "warning"
                  ? "text-warn"
                  : "text-parchment-dim"
              }`}
            >
              {importMessage.text}
            </p>
            {importMessage.details?.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-xs text-parchment-faint list-disc list-inside">
                {importMessage.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <p className="text-xs text-parchment-faint">
          Import adds trades from the file that aren&apos;t already in this
          browser (matched by trade ID) — it won&apos;t create duplicates or
          remove anything currently here. Settings from the file overwrite
          current settings.
        </p>
        <p className="text-xs text-parchment-faint">
          Trading212 CSV import: export your <strong>Orders</strong> history
          (not Dividends or Transactions) from Trading212 as CSV, one year at
          a time if your account is older than a year. Each buy fill becomes
          its own trade; sell fills are matched to your oldest still-open
          buy for that ticker. Thesis, stop-loss, targets, and account size
          aren&apos;t in broker data, so imported trades start without
          them — expect a lower discipline score on these until you fill
          them in, which is accurate, not a bug. This adds trades; it doesn&apos;t
          check for ones you already logged manually.
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-surface border border-line rounded-md px-3 py-2 text-sm text-parchment focus:outline-none focus:border-gold-dim";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm text-parchment-dim mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-parchment-faint mt-1">{hint}</p>}
    </div>
  );
}

const miniInputClass =
  "bg-surface border border-line rounded-md px-2 py-1.5 text-xs text-parchment focus:outline-none focus:border-gold-dim";

function MiniField({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-parchment-faint uppercase tracking-wide">{label}</span>
      {children}
    </div>
  );
}
