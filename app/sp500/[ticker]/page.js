"use client";

import Link from "next/link";
import { useTrades } from "@/contexts/TradesContext";
import { useCompanyGlimpse } from "@/hooks/useCompanyGlimpse";
import { SP500_COMPANIES } from "@/content/sp500";

export default function CompanyGlimpsePage({ params }) {
  const ticker = params.ticker?.toUpperCase();
  const { settings } = useTrades();
  const company = SP500_COMPANIES.find((c) => c.ticker === ticker);
  const { data, loading, error } = useCompanyGlimpse(ticker, settings.finnhubApiKey);

  return (
    <div className="max-w-2xl">
      <Link href="/sp500" className="text-xs text-parchment-faint hover:text-parchment">
        ← S&amp;P 500
      </Link>

      <div className="flex items-baseline gap-3 mt-3">
        <h1 className="font-display text-3xl text-parchment">{ticker}</h1>
        {company && <span className="text-xs text-parchment-faint">{company.sector}</span>}
      </div>
      {data?.profile && (
        <p className="text-sm text-parchment-dim mt-1">
          {data.profile.name}
          {[data.profile.industry, data.profile.exchange].filter(Boolean).length > 0 &&
            ` — ${[data.profile.industry, data.profile.exchange].filter(Boolean).join(" · ")}`}
        </p>
      )}
      <div className="rule-divider mt-4 mb-8" />

      {!settings.finnhubApiKey && (
        <p className="text-sm text-parchment-dim">
          Add a Finnhub API key in{" "}
          <Link href="/settings" className="text-gold-bright hover:underline">
            Settings
          </Link>{" "}
          to see company snapshots — free tier, no card required.
        </p>
      )}

      {settings.finnhubApiKey && loading && <p className="text-sm text-parchment-faint">Loading…</p>}

      {settings.finnhubApiKey && !loading && error && (
        <p className="text-sm text-loss-bright">{error.message}</p>
      )}

      {settings.finnhubApiKey && !loading && !error && data && (
        <div className="space-y-6">
          <Section title="Valuation">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              <Stat label="Market cap" value={formatMarketCap(data.profile?.marketCapitalization)} />
              <Stat label="P/E (TTM)" value={formatRatio(data.metrics?.peRatio)} />
              <Stat label="P/B" value={formatRatio(data.metrics?.pbRatio)} />
              <Stat label="P/S" value={formatRatio(data.metrics?.psRatio)} />
              <Stat label="Beta" value={formatRatio(data.metrics?.beta)} />
              <Stat label="Current ratio" value={formatRatio(data.metrics?.currentRatio)} />
              <Stat label="Debt/equity" value={formatRatio(data.metrics?.debtToEquity)} />
              <Stat label="Book value/sh" value={formatPrice(data.metrics?.bookValuePerShare)} />
              <Stat
                label="52w range"
                value={formatRange(data.metrics?.week52Low, data.metrics?.week52High)}
              />
            </div>
          </Section>

          <Section title="Margins & growth">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              <Stat label="Gross margin" value={formatPercent(data.metrics?.grossMargin)} />
              <Stat label="Op. margin" value={formatPercent(data.metrics?.operatingMargin)} />
              <Stat label="Net margin" value={formatPercent(data.metrics?.netMargin)} />
              <Stat label="Rev. growth YoY" value={formatPercent(data.metrics?.revenueGrowth)} />
              <Stat label="EPS growth YoY" value={formatPercent(data.metrics?.epsGrowth)} />
            </div>
          </Section>

          {data.recommendation && (
            <Section title={`Analyst recommendations — ${data.recommendation.period}`}>
              <div className="flex gap-6 text-sm font-mono">
                <span className="text-gain-bright">
                  {data.recommendation.strongBuy + data.recommendation.buy} Buy
                </span>
                <span className="text-parchment-faint">{data.recommendation.hold} Hold</span>
                <span className="text-loss-bright">
                  {data.recommendation.sell + data.recommendation.strongSell} Sell
                </span>
              </div>
            </Section>
          )}

          {data.peers && data.peers.length > 0 && (
            <Section title="Peers">
              <div className="flex flex-wrap gap-2">
                {data.peers.slice(0, 10).map((peer) => (
                  <Link
                    key={peer}
                    href={`/sp500/${peer}`}
                    className="font-mono text-xs text-parchment-dim border border-line rounded px-2 py-1 hover:border-gold-dim hover:text-gold-bright transition-colors"
                  >
                    {peer}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data.news && data.news.length > 0 && (
            <Section title="Recent news">
              <ul className="space-y-3">
                {data.news.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-parchment-dim hover:text-gold-bright transition-colors"
                    >
                      {item.headline}
                    </a>
                    <p className="text-xs text-parchment-faint mt-0.5">
                      {formatNewsDate(item.datetime)}
                      {item.source ? ` · ${item.source}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Last 4 quarters — EPS">
            {!data.earnings || data.earnings.length === 0 ? (
              <p className="text-xs text-parchment-faint">No earnings history available.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-parchment-faint border-b border-line">
                    <th className="pb-1.5 font-normal">Quarter</th>
                    <th className="pb-1.5 font-normal text-right">Actual</th>
                    <th className="pb-1.5 font-normal text-right">Estimate</th>
                    <th className="pb-1.5 font-normal text-right">Surprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.earnings.map((row) => {
                    const beat = row.surprise != null ? row.surprise >= 0 : null;
                    return (
                      <tr key={row.period}>
                        <td className="py-1.5 font-mono text-parchment-dim">{row.period}</td>
                        <td className="py-1.5 text-right font-mono text-parchment-dim">
                          {row.actual ?? "—"}
                        </td>
                        <td className="py-1.5 text-right font-mono text-parchment-faint">
                          {row.estimate ?? "—"}
                        </td>
                        <td
                          className={`py-1.5 text-right font-mono ${
                            beat === null
                              ? "text-parchment-faint"
                              : beat
                              ? "text-gain-bright"
                              : "text-loss-bright"
                          }`}
                        >
                          {row.surprisePercent != null ? `${row.surprisePercent.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <h2 className="text-xs uppercase tracking-wide text-parchment-faint mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-parchment-faint mb-1">{label}</p>
      <p className="font-mono text-parchment-dim">{value}</p>
    </div>
  );
}

// Finnhub's marketCapitalization is denominated in millions of USD.
function formatMarketCap(millions) {
  if (millions == null) return "—";
  if (millions >= 1e6) return `$${(millions / 1e6).toFixed(2)}T`;
  if (millions >= 1e3) return `$${(millions / 1e3).toFixed(1)}B`;
  return `$${Math.round(millions)}M`;
}

function formatRatio(value, decimals = 2) {
  return value != null ? value.toFixed(decimals) : "—";
}

// Finnhub's margin/growth metrics are already expressed in percent units
// (e.g. 42.5, not 0.425).
function formatPercent(value, decimals = 1) {
  return value != null ? `${value.toFixed(decimals)}%` : "—";
}

function formatPrice(value) {
  return value != null ? `$${value.toFixed(2)}` : "—";
}

function formatRange(low, high) {
  if (low == null || high == null) return "—";
  return `$${low.toFixed(2)} – $${high.toFixed(2)}`;
}

function formatNewsDate(unixSeconds) {
  if (!unixSeconds) return "";
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
