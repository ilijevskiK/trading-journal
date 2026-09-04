"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SP500_COMPANIES, SP500_LAST_UPDATED } from "@/content/sp500";

const TIERS = [
  { key: "mega", label: "Mega Cap", hint: "≥ $200B" },
  { key: "large", label: "Large Cap", hint: "$15B – $200B" },
  { key: "mid", label: "Mid Cap", hint: "< $15B" },
];

export default function Sp500Page() {
  const [activeSector, setActiveSector] = useState(null);

  const sectors = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const company of SP500_COMPANIES) {
      if (!seen.has(company.sector)) {
        seen.add(company.sector);
        list.push(company.sector);
      }
    }
    return list.sort();
  }, []);

  const visibleCompanies = activeSector
    ? SP500_COMPANIES.filter((c) => c.sector === activeSector)
    : SP500_COMPANIES;

  const formattedDate = new Date(SP500_LAST_UPDATED + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">S&amp;P 500</h1>
        <span className="font-mono text-xs text-parchment-faint">
          {visibleCompanies.length} of {SP500_COMPANIES.length} companies
        </span>
      </div>
      <p className="text-xs text-parchment-faint mt-2 max-w-lg">
        Every current S&amp;P 500 constituent, grouped by market-cap tier.
        Small Cap is omitted deliberately — the index is structurally almost
        all large/mega cap by its own selection criteria.
      </p>
      <p className="text-[11px] text-parchment-faint mt-1">
        Snapshot as of {formattedDate} — a static reference, not live data.
        Constituents and market caps will drift from this over time.
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          onClick={() => setActiveSector(null)}
          className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
            activeSector === null
              ? "border-gold-dim text-gold-bright bg-surface-alt"
              : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
          }`}
        >
          All
        </button>
        {sectors.map((sector) => (
          <button
            key={sector}
            type="button"
            onClick={() => setActiveSector(sector)}
            className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
              activeSector === sector
                ? "border-gold-dim text-gold-bright bg-surface-alt"
                : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      <div className="rule-divider mt-4 mb-6" />

      <div className="space-y-8">
        {TIERS.map((tier) => (
          <TierSection
            key={tier.key}
            tier={tier}
            companies={visibleCompanies.filter((c) => c.tier === tier.key)}
          />
        ))}
      </div>
    </div>
  );
}

function TierSection({ tier, companies }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="font-display text-xl text-parchment">{tier.label}</h2>
        <span className="text-xs text-parchment-faint">{tier.hint}</span>
        <span className="font-mono text-xs text-parchment-faint ml-auto">
          {companies.length}
        </span>
      </div>
      {companies.length === 0 ? (
        <p className="text-sm text-parchment-faint">No companies in this sector.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {companies.map((company) => (
            <Link
              key={company.ticker}
              href={`/sp500/${company.ticker}`}
              className="text-left border border-line rounded-lg bg-surface px-3 py-2 min-w-0 hover:border-gold-dim hover:bg-surface-alt/50 transition-colors"
            >
              <p className="font-mono text-xs text-gold-bright">{company.ticker}</p>
              <p className="text-xs text-parchment-dim truncate" title={company.name}>
                {company.name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
