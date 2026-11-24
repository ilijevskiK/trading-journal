"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getScreenerAction } from "@/contexts/screenerActions";
import { SCREENER_RULES } from "@/lib/screener";
import { LETTER_LINKS } from "@/components/canslim/letterLinks";
import { formatDate, formatMoney } from "@/components/canslim/LetterSection";
import { SP500_COMPANIES, SP500_LAST_UPDATED } from "@/content/sp500";
import { LEADING_GROUP_RANKS } from "@/lib/industries";

const STALE_AFTER_DAYS = 4; // a long weekend plus a day
const SP500_TICKERS = new Set(SP500_COMPANIES.map((c) => c.ticker));

const SORTS = {
  rs: { label: "RS Rating", compare: (a, b) => b.rsRating - a.rsRating || a.pctBelowHigh - b.pctBelowHigh },
  high: { label: "Closest to high", compare: (a, b) => a.pctBelowHigh - b.pctBelowHigh || b.rsRating - a.rsRating },
};

const FUNNEL_STEPS = [
  { key: "universe", label: "US companies traded" },
  { key: "priceAndVolume", label: `$${SCREENER_RULES.minPrice}+ with ${formatMoney(SCREENER_RULES.minAvgDollarVolume)}+ a day traded` },
  { key: "rsRating", label: `RS Rating ${SCREENER_RULES.minRsRating}+` },
  { key: "nearHigh", label: `Within ${SCREENER_RULES.maxBelowHighPct}% of 52-week high` },
];

export default function ScreenerPage() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [sort, setSort] = useState("rs");
  const [newOnly, setNewOnly] = useState(false);
  const [leadingOnly, setLeadingOnly] = useState(false);
  const [sp500Only, setSp500Only] = useState(false);

  useEffect(() => {
    getScreenerAction()
      .then((res) => setState({ loading: false, data: res.error ? null : res, error: res.error ?? null }))
      .catch(() => setState({ loading: false, data: null, error: "Couldn't load the screener." }));
  }, []);

  const newCount = useMemo(() => (state.data?.stocks ?? []).filter((s) => s.isNew).length, [state.data]);
  const leadingCount = useMemo(
    () => (state.data?.stocks ?? []).filter((s) => s.group && s.group.rank <= LEADING_GROUP_RANKS).length,
    [state.data]
  );
  const sp500Count = useMemo(() => (state.data?.stocks ?? []).filter((s) => SP500_TICKERS.has(s.ticker)).length, [state.data]);
  const stocks = useMemo(() => {
    const list = (state.data?.stocks ?? []).filter(
      (s) =>
        (!newOnly || s.isNew) &&
        (!leadingOnly || (s.group && s.group.rank <= LEADING_GROUP_RANKS)) &&
        (!sp500Only || SP500_TICKERS.has(s.ticker))
    );
    return list.sort(SORTS[sort].compare);
  }, [state.data, sort, newOnly, leadingOnly, sp500Only]);

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/strategies" className="text-xs text-parchment-faint hover:text-parchment">
        ← CAN SLIM
      </Link>
      <h1 className="font-display text-3xl text-parchment mt-3">Screener</h1>
      <p className="text-xs text-parchment-faint mt-2 max-w-2xl">
        Every US company, cut down each trading day to the ones with the price action of a CAN SLIM leader. It&apos;s
        a starting list, not a buy list: check each one&apos;s earnings and base on the letter pages, and check{" "}
        <Link href="/strategies/market-status" className="text-gold-bright hover:underline">
          Market Status
        </Link>{" "}
        before buying anything. Prices from Massive.
      </p>
      <div className="rule-divider mt-4 mb-6" />

      {state.loading && <p className="text-sm text-parchment-faint">Loading the latest screen…</p>}
      {state.error && <p className="text-sm text-loss-bright">{state.error}</p>}
      {state.data?.notRun && (
        <p className="text-sm text-parchment-dim max-w-2xl">
          The screener hasn&apos;t run yet. It&apos;s built by a daily job (<code>npm run screener</code>, or the
          &ldquo;CAN SLIM screener&rdquo; GitHub Action); the first run downloads a year of prices and takes about an
          hour.
        </p>
      )}

      {state.data?.stocks && (
        <>
          <RunInfo asOf={state.data.asOf} />
          <Funnel funnel={state.data.funnel} />

          <div className="flex items-center gap-2 mt-8 mb-3 text-xs">
            <span className="text-parchment-faint mr-1">Sort by</span>
            {Object.entries(SORTS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                aria-pressed={sort === key}
                className={`px-2.5 py-1 rounded-md border transition-colors ${
                  sort === key ? "border-gold-dim text-gold-bright" : "border-line text-parchment-dim hover:text-parchment"
                }`}
              >
                {label}
              </button>
            ))}
            <span className="text-parchment-faint ml-3 mr-1">Show</span>
            <button
              onClick={() => setNewOnly((v) => !v)}
              aria-pressed={newOnly}
              className={`px-2.5 py-1 rounded-md border transition-colors ${
                newOnly ? "border-gold-dim text-gold-bright" : "border-line text-parchment-dim hover:text-parchment"
              }`}
            >
              New only ({newCount})
            </button>
            <button
              onClick={() => setLeadingOnly((v) => !v)}
              aria-pressed={leadingOnly}
              title={`Stocks whose industry group ranks in the top ${LEADING_GROUP_RANKS} on Leading Groups`}
              className={`px-2.5 py-1 rounded-md border transition-colors ${
                leadingOnly ? "border-gold-dim text-gold-bright" : "border-line text-parchment-dim hover:text-parchment"
              }`}
            >
              Top {LEADING_GROUP_RANKS} groups ({leadingCount})
            </button>
            <button
              onClick={() => setSp500Only((v) => !v)}
              aria-pressed={sp500Only}
              title="Only stocks in the S&P 500 index"
              className={`px-2.5 py-1 rounded-md border transition-colors ${
                sp500Only ? "border-gold-dim text-gold-bright" : "border-line text-parchment-dim hover:text-parchment"
              }`}
            >
              S&amp;P 500 only ({sp500Count})
            </button>
          </div>
          {stocks.length ? (
            <StockTable stocks={stocks} />
          ) : newOnly || leadingOnly || sp500Only ? (
            <p className="text-sm text-parchment-dim">No stock on today&apos;s list matches the filters you turned on.</p>
          ) : (
            <p className="text-sm text-parchment-dim">
              No stock passes every check today. That usually means the market is weak.
            </p>
          )}
          <p className="text-[10px] text-parchment-faint mt-4 max-w-2xl">
            <span className="text-gold-bright">New</span> means it passed today but not on the previous run. Exchange
            is as the SEC lists it, filled in by the next daily run. Group is the stock&apos;s industry group and its rank on{" "}
            <Link href="/strategies/leading-groups" className="text-gold-bright hover:underline">Leading Groups</Link>{" "}
            (gold = top {LEADING_GROUP_RANKS}). S&amp;P 500 membership comes from a static list,
            last updated {formatDate(SP500_LAST_UPDATED)}, so recent index changes may be missing.
          </p>
        </>
      )}
    </div>
  );
}

function RunInfo({ asOf }) {
  const ageDays = (Date.now() - new Date(`${asOf}T00:00:00`).getTime()) / 86_400_000;
  return (
    <p className={`text-xs ${ageDays > STALE_AFTER_DAYS ? "text-warn" : "text-parchment-faint"}`}>
      As of the {formatDate(asOf)} close
      {ageDays > STALE_AFTER_DAYS && " · the daily job hasn't run since; check the GitHub Action"}
    </p>
  );
}

function Funnel({ funnel }) {
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
      {FUNNEL_STEPS.map((step, i) => (
        <li key={step.key} className="rounded-md border border-line px-3 py-2">
          <p className={`font-display text-2xl ${i === FUNNEL_STEPS.length - 1 ? "text-gold-bright" : "text-parchment"}`}>
            {(funnel[step.key] ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-parchment-faint leading-snug">{step.label}</p>
        </li>
      ))}
    </ol>
  );
}

function Badge({ children }) {
  return <span className="px-1.5 py-px rounded border border-line text-[10px] text-parchment-dim">{children}</span>;
}

function StockTable({ stocks }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono whitespace-nowrap">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-parchment-faint border-b border-line *:px-2 first:*:pl-0 last:*:pr-0">
            <th className="pb-2 font-normal font-body">Ticker</th>
            <th className="pb-2 font-normal font-body">Company</th>
            <th className="pb-2 font-normal font-body">Listing</th>
            <th className="pb-2 font-normal font-body" title="Industry group and its rank on Leading Groups">Group</th>
            <th className="pb-2 font-normal font-body text-right">Price</th>
            <th className="pb-2 font-normal font-body text-right">RS</th>
            <th className="pb-2 font-normal font-body text-right">From high</th>
            <th className="pb-2 font-normal font-body text-right">Avg $ volume</th>
            <th className="pb-2 font-normal font-body text-right">Check</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {stocks.map((s) => (
            <tr key={s.ticker} className="text-parchment-dim *:px-2 first:*:pl-0 last:*:pr-0">
              <td className="py-2">
                <Link
                  href={`${LETTER_LINKS[0].href}?ticker=${encodeURIComponent(s.ticker)}`}
                  className="text-parchment hover:text-gold-bright"
                >
                  {s.ticker}
                </Link>
                {s.isNew && (
                  <span
                    title="Passed today, not on the previous run"
                    className="ml-1.5 px-1 py-px rounded border border-gold-dim text-[9px] uppercase tracking-wide text-gold-bright font-body"
                  >
                    New
                  </span>
                )}
              </td>
              <td className="py-2 font-body max-w-[16rem] truncate" title={s.name ?? ""}>
                {s.name ?? "—"}
              </td>
              <td className="py-2 font-body">
                <span className="inline-flex gap-1">
                  {s.exchange && <Badge>{s.exchange}</Badge>}
                  {SP500_TICKERS.has(s.ticker) && <Badge>S&amp;P 500</Badge>}
                  {!s.exchange && !SP500_TICKERS.has(s.ticker) && "—"}
                </span>
              </td>
              <td className="py-2 font-body max-w-[14rem] truncate" title={s.group ? `${s.group.name}: ranked ${s.group.rank} of ${s.group.total}` : ""}>
                {s.group ? (
                  <>
                    <span className={`font-mono mr-1.5 ${s.group.rank <= LEADING_GROUP_RANKS ? "text-gold-bright" : "text-parchment-faint"}`}>
                      #{s.group.rank}
                    </span>
                    {s.group.name}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 text-right text-parchment">${s.price.toFixed(2)}</td>
              <td className={`py-2 text-right ${s.rsRating >= 90 ? "text-gain-bright" : "text-parchment"}`}>{s.rsRating}</td>
              <td className="py-2 text-right">
                {s.pctBelowHigh < 0.5 ? <span className="text-gain-bright">at high</span> : `−${s.pctBelowHigh.toFixed(1)}%`}
              </td>
              <td className="py-2 text-right">{formatMoney(s.avgDollarVolume)}</td>
              <td className="py-2 text-right font-body">
                <span className="inline-flex gap-1">
                  {LETTER_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={`${l.href}?ticker=${encodeURIComponent(s.ticker)}`}
                      title={`${l.letter} for ${s.ticker}`}
                      className="w-5 h-5 inline-flex items-center justify-center rounded border border-line text-[10px] text-parchment-dim hover:border-gold-dim hover:text-gold-bright"
                    >
                      {l.label}
                    </Link>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
