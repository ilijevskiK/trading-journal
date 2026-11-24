"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCompositeAction } from "@/contexts/compositeActions";
import { LETTER_LINKS } from "@/components/canslim/letterLinks";
import { formatDate } from "@/components/canslim/LetterSection";
import { letterGrade } from "@/lib/composite";
import { LEADING_GROUP_RANKS } from "@/lib/industries";

const STALE_AFTER_DAYS = 4;
const PAGE = 100;

// null sorts last, whichever way a column goes.
const byNumber = (get, dir) => (a, b) => {
  const x = get(a);
  const y = get(b);
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return dir * (x - y);
};

const SORTS = {
  composite: { label: "Composite", compare: byNumber((s) => s.composite, -1) },
  eps: { label: "EPS", compare: byNumber((s) => s.eps, -1) },
  rs: { label: "RS", compare: byNumber((s) => s.rs, -1) },
  group: { label: "Group", compare: byNumber((s) => s.group?.rank, 1) },
  smr: { label: "SMR", compare: byNumber((s) => s.smr, -1) },
  accDist: { label: "A/D", compare: byNumber((s) => s.accDist, -1) },
  nearHigh: { label: "Near high", compare: byNumber((s) => s.pctBelowHigh, 1) },
};

const MIN_OPTIONS = [0, 70, 80, 90];

export default function CompositePage() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [sort, setSort] = useState("composite");
  const [min, setMin] = useState(0);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    getCompositeAction()
      .then((res) => setState({ loading: false, data: res.error ? null : res, error: res.error ?? null }))
      .catch(() => setState({ loading: false, data: null, error: "Couldn't load the Composite Screener." }));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (state.data?.stocks ?? [])
      .filter((s) => s.composite >= min)
      .filter((s) => !q || s.ticker.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q))
      .sort((a, b) => SORTS[sort].compare(a, b) || b.composite - a.composite);
  }, [state.data, sort, min, query]);

  useEffect(() => setShown(PAGE), [sort, min, query]);

  const ageDays = state.data?.asOf ? (Date.now() - new Date(`${state.data.asOf}T00:00:00`).getTime()) / 86_400_000 : 0;

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/strategies" className="text-xs text-parchment-faint hover:text-parchment">
        ← CAN SLIM
      </Link>
      <h1 className="font-display text-3xl text-parchment mt-3">Composite Screener</h1>
      <p className="text-xs text-parchment-faint mt-2 max-w-2xl">
        One 1-99 rating per stock, in the spirit of IBD&apos;s SmartSelect Composite Rating. O&apos;Neil suggests
        starting with ratings of 80 or better, then checking each part. It blends the{" "}
        <strong className="text-parchment-dim font-normal">EPS Rating</strong> and{" "}
        <strong className="text-parchment-dim font-normal">RS Rating</strong> (each counted double), then the{" "}
        <strong className="text-parchment-dim font-normal">industry group</strong>,{" "}
        <strong className="text-parchment-dim font-normal">SMR</strong> (sales growth, margins, return on equity),{" "}
        <strong className="text-parchment-dim font-normal">accumulation/distribution</strong> over 13 weeks, and how close
        the price is to its <strong className="text-parchment-dim font-normal">52-week high</strong>. Every US stock with
        an RS Rating is included, with no price or volume floor, so check liquidity yourself.
      </p>
      <HowItWorks />
      <div className="rule-divider mt-4 mb-6" />

      {state.loading && <p className="text-sm text-parchment-faint">Loading the ratings…</p>}
      {state.error && <p className="text-sm text-loss-bright">{state.error}</p>}
      {state.data?.notRun && (
        <p className="text-sm text-parchment-dim max-w-2xl">
          The ratings haven&apos;t been built yet. Run <code>npm run composite</code> after the screener and industries
          jobs.
        </p>
      )}

      {state.data?.stocks && (
        <>
          <p className={`text-xs ${ageDays > STALE_AFTER_DAYS ? "text-warn" : "text-parchment-faint"}`}>
            As of the {formatDate(state.data.asOf)} close · {state.data.stocks.length.toLocaleString()} stocks
            {ageDays > STALE_AFTER_DAYS && " · the daily job hasn't run since"}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-4 mb-3 text-xs">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ticker or company"
              aria-label="Search by ticker or company"
              className="bg-surface border border-line rounded-md px-2.5 py-1 text-parchment-dim placeholder:text-parchment-faint w-44"
            />
            <span className="text-parchment-faint ml-2 mr-1">Composite at least</span>
            {MIN_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMin(m)}
                aria-pressed={min === m}
                className={`px-2.5 py-1 rounded-md border transition-colors ${
                  min === m ? "border-gold-dim text-gold-bright" : "border-line text-parchment-dim hover:text-parchment"
                }`}
              >
                {m === 0 ? "Any" : m}
              </button>
            ))}
            <span className="text-parchment-faint ml-2 mr-1">Sort by</span>
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
          </div>

          {matches.length ? (
            <>
              <StockTable stocks={matches.slice(0, shown)} />
              <div className="flex items-center gap-3 mt-3 text-xs text-parchment-faint">
                <span>
                  Showing {Math.min(shown, matches.length).toLocaleString()} of {matches.length.toLocaleString()}
                </span>
                {shown < matches.length && (
                  <button
                    onClick={() => setShown((n) => n + PAGE)}
                    className="px-2.5 py-1 rounded-md border border-line text-parchment-dim hover:text-parchment"
                  >
                    Show {PAGE} more
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-parchment-dim">No stock matches.</p>
          )}

          <p className="text-[10px] text-parchment-faint mt-4 max-w-2xl">
            A blank EPS or SMR means that part is left out of the rating (no group, no US filings, or too new). The group
            number is the group&apos;s rank on{" "}
            <Link href="/strategies/leading-groups" className="text-gold-bright hover:underline">
              Leading Groups
            </Link>
            , gold for the top {LEADING_GROUP_RANKS}. Hover EPS and SMR for the figures behind them. For SMR and A/D, A is
            the top fifth of stocks and E the bottom. See &ldquo;How the Composite Rating is calculated&rdquo; above for
            the full method.
          </p>
        </>
      )}
    </div>
  );
}

const PARTS = [
  {
    name: "EPS",
    weight: "×2",
    how: "60% from the last two quarters' EPS growth against the same quarter a year earlier, 40% from the 3-year EPS growth rate. A loss counts as −100 and a swing from loss to profit as +150. Growth is capped (500% for a quarter, 300% for the 3-year rate) so a tiny base can't dominate. Ranked across stocks.",
  },
  {
    name: "RS",
    weight: "×2",
    how: "Price performance over 12 months with the latest 3 months counted double (3 months 40%; 6, 9 and 12 months 20% each), ranked across stocks. This is the RS Rating used elsewhere in the app.",
  },
  {
    name: "Group",
    weight: "×1",
    how: "The stock's industry group rank on Leading Groups, turned into a rating: the top group is 99 and the bottom group is 1.",
  },
  {
    name: "SMR",
    weight: "×1",
    how: "Three measures, each ranked on its own: sales growth (average of the last 3 quarters against a year earlier), net profit margin over the last 4 quarters, and return on equity. A stock's ranks are averaged (it needs at least two) and that average is ranked again. Shown as a letter, A to E.",
  },
  {
    name: "A/D",
    weight: "×1",
    how: "Accumulation/distribution over the last 63 trading days (about 13 weeks): volume on up days minus volume on down days, as a share of all volume. Ranked across stocks. Shown as a letter, A to E.",
  },
  {
    name: "Near high",
    weight: "×1",
    how: "How far the price is below its 52-week high. Closer to the high rates higher. Ranked across stocks.",
  },
];

function HowItWorks() {
  return (
    <details className="mt-4 max-w-3xl rounded-md border border-line px-4 py-3 text-xs text-parchment-dim">
      <summary className="cursor-pointer text-parchment hover:text-gold-bright">
        How the Composite Rating is calculated
      </summary>
      <div className="mt-3 space-y-4 leading-relaxed">
        <p>
          The Composite is a weighted average of six ratings, each from 1 to 99. A rating here is the share of other
          stocks that this one beats: a 90 beats about 90% of stocks.
        </p>

        <div>
          <p className="text-parchment mb-1.5">Step 1 · Six ratings</p>
          <table className="w-full text-left">
            <tbody className="divide-y divide-line">
              {PARTS.map((p) => (
                <tr key={p.name} className="align-top *:py-2 first:*:pl-0 *:pr-3">
                  <td className="text-parchment whitespace-nowrap font-medium">{p.name}</td>
                  <td className="text-gold-bright whitespace-nowrap font-mono">{p.weight}</td>
                  <td>{p.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="text-parchment mb-1.5">Step 2 · Weighted average</p>
          <p className="font-mono text-parchment-dim">
            (2×EPS + 2×RS + Group + SMR + A/D + Near high) ÷ 8
          </p>
          <p className="mt-1.5">
            EPS and RS count double. If a part is missing it is left out and the others are rescaled: a foreign company
            with no US earnings data is averaged over the other four parts (divided by 6, not 8).
          </p>
        </div>

        <div>
          <p className="text-parchment mb-1.5">Step 3 · Ranked again</p>
          <p>
            Those averages are ranked across every stock listed, which gives the final Composite from 1 to 99. This
            keeps the ratings evenly spread.
          </p>
        </div>

        <div>
          <p className="text-parchment mb-1.5">Example</p>
          <p>
            EPS 90, RS 85, Group 70, SMR 60, A/D 80, Near high 95:{" "}
            <span className="font-mono">(180 + 170 + 70 + 60 + 80 + 95) ÷ 8 = 81.9</span>. That 81.9 is then ranked
            against every other stock&apos;s average, and the result is the Composite. If it beats 92% of them, the
            Composite is 92.
          </p>
        </div>

        <p className="text-parchment-faint">
          The double weight on EPS and RS, and the use of the distance from the 52-week high, follow William
          O&apos;Neil&apos;s description of the SmartSelect Composite Rating. Investor&apos;s Business Daily does not
          publish its exact formulas, so everything else (how each part is calculated, the caps, the A to E cut-offs,
          the weights of the other parts) is this app&apos;s own version. Expect the numbers to resemble IBD&apos;s,
          not to match them.
        </p>
      </div>
    </details>
  );
}

const pctText = (v) => (v == null ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`);

function epsTitle(s) {
  if (s.eps == null) return "No usable earnings filings (foreign filer, or no standard EPS)";
  return `Latest quarter EPS growth ${pctText(s.facts?.epsGrowth)} vs a year earlier`;
}

function smrTitle(s) {
  if (s.smr == null) return "Not enough filings data";
  const f = s.facts ?? {};
  return `Sales growth ${pctText(f.revenueGrowth)} · net margin ${f.netMargin == null ? "n/a" : `${f.netMargin.toFixed(1)}%`} · ROE ${f.roe == null ? "n/a" : `${f.roe.toFixed(0)}%`}`;
}

function Grade({ value }) {
  if (value == null) return <span className="text-parchment-faint">—</span>;
  return (
    <span className={value >= 80 ? "text-gain-bright" : value < 40 ? "text-loss-bright" : "text-parchment"}>
      {letterGrade(value)}
    </span>
  );
}

function Rating({ value, strong = 80 }) {
  if (value == null) return <span className="text-parchment-faint">—</span>;
  return <span className={value >= strong ? "text-gain-bright" : "text-parchment"}>{value}</span>;
}

function StockTable({ stocks }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono whitespace-nowrap">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-parchment-faint border-b border-line *:px-2 first:*:pl-0 last:*:pr-0">
            <th className="pb-2 font-normal font-body">Ticker</th>
            <th className="pb-2 font-normal font-body">Company</th>
            <th className="pb-2 font-normal font-body text-right" title="Overall 1-99 rating">Comp</th>
            <th className="pb-2 font-normal font-body text-right" title="Earnings strength, 1-99: recent quarters' growth and 3-year growth">EPS</th>
            <th className="pb-2 font-normal font-body text-right" title="Relative price strength, 1-99">RS</th>
            <th className="pb-2 font-normal font-body">Industry group</th>
            <th className="pb-2 font-normal font-body text-right" title="Sales growth, profit margin and return on equity (A-E)">SMR</th>
            <th className="pb-2 font-normal font-body text-right" title="Accumulation/distribution, 13 weeks (A-E)">A/D</th>
            <th className="pb-2 font-normal font-body text-right">From high</th>
            <th className="pb-2 font-normal font-body text-right">Price</th>
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
              </td>
              <td className="py-2 font-body max-w-[14rem] truncate" title={s.name ?? ""}>
                {s.name ?? "—"}
              </td>
              <td className="py-2 text-right font-semibold">
                <Rating value={s.composite} strong={90} />
              </td>
              <td className="py-2 text-right" title={epsTitle(s)}>
                <Rating value={s.eps} strong={90} />
              </td>
              <td className="py-2 text-right">
                <Rating value={s.rs} strong={90} />
              </td>
              <td
                className="py-2 font-body max-w-[15rem] truncate"
                title={s.group ? `${s.group.name}: ranked ${s.group.rank} of ${s.group.total}` : "No ranked group"}
              >
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
              <td className="py-2 text-right" title={smrTitle(s)}>
                <Grade value={s.smr} />
              </td>
              <td className="py-2 text-right" title={s.accDist == null ? "Not enough history" : `Rating ${s.accDist}`}>
                <Grade value={s.accDist} />
              </td>
              <td className="py-2 text-right">
                {s.pctBelowHigh == null ? "—" : s.pctBelowHigh < 0.5 ? <span className="text-gain-bright">at high</span> : `−${s.pctBelowHigh.toFixed(1)}%`}
              </td>
              <td className="py-2 text-right text-parchment">{s.price == null ? "—" : `$${s.price.toFixed(2)}`}</td>
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
