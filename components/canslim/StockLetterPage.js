"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyFinancials } from "@/hooks/useCompanyFinancials";

// Shell for a per-stock CAN SLIM letter page: ticker box, loading and
// errors, the company header, and links to the same ticker on the other
// letters' pages. `children(data)` renders the letter itself. With
// source="prices" the SEC filings aren't loaded and children get
// { ticker } only (the page fetches its own price data).
export default function StockLetterPage(props) {
  return (
    <Suspense fallback={null}>
      <Shell {...props} />
    </Suspense>
  );
}

function Shell({ path, title, intro, related = [], source = "sec", children }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticker = (searchParams.get("ticker") || "").toUpperCase();
  const [input, setInput] = useState(ticker);
  const filings = useCompanyFinancials(source === "sec" ? ticker : "");
  const { loading, error } = filings;
  const data = source === "sec" ? filings.data : ticker ? { ticker } : null;

  useEffect(() => setInput(ticker), [ticker]);

  function submit(e) {
    e.preventDefault();
    const next = input.trim().toUpperCase();
    if (next) router.replace(`${path}?ticker=${encodeURIComponent(next)}`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/strategies" className="text-xs text-parchment-faint hover:text-parchment">
        ← CAN SLIM
      </Link>
      <h1 className="font-display text-3xl text-parchment mt-3">{title}</h1>
      <p className="text-xs text-parchment-faint mt-2 max-w-2xl">{intro}</p>
      <div className="rule-divider mt-4 mb-6" />

      <form onSubmit={submit} className="flex gap-2 max-w-sm">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ticker, e.g. NVDA"
          aria-label="Ticker"
          className="flex-1 bg-surface border border-line rounded-md px-3 py-2 text-sm font-mono uppercase text-parchment placeholder:normal-case placeholder:text-parchment-faint focus:outline-none focus:border-gold-dim"
        />
        <button
          type="submit"
          className="bg-gold text-ink px-4 py-2 rounded-md text-sm font-medium hover:bg-gold-bright transition-colors"
        >
          Check
        </button>
      </form>

      {loading && <p className="text-sm text-parchment-faint mt-6">Loading {ticker} filings from SEC EDGAR…</p>}
      {error && <p className="text-sm text-loss-bright mt-6">{error}</p>}

      {data && (
        <div className="mt-8 space-y-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-mono text-xl text-parchment">{data.ticker}</span>
              {data.name && <span className="text-sm text-parchment-dim">{data.name}</span>}
            </div>
            {related.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-parchment-faint mr-1">Check {data.ticker} on</span>
                {related.map((r) => (
                  <Link
                    key={r.href}
                    href={`${r.href}?ticker=${encodeURIComponent(data.ticker)}`}
                    title={`${r.letter} for ${data.ticker}`}
                    className="font-display w-7 h-7 inline-flex items-center justify-center rounded-md border border-line text-gold-bright hover:border-gold-dim hover:bg-surface-alt transition-colors"
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {children(data)}
          {data.cik && (
            <p className="text-[11px] text-parchment-faint">
              Source: the company&apos;s 10-Q and 10-K filings via{" "}
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${data.cik}&type=10-&dateb=&owner=include&count=40`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-bright hover:underline"
              >
                SEC EDGAR
              </a>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
