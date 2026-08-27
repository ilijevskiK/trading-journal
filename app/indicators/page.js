import Link from "next/link";
import { INDICATORS } from "@/content/indicators";

export default function IndicatorsPage() {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">Indicators</h1>
        <span className="font-mono text-xs text-parchment-faint">
          {INDICATORS.length} indicator{INDICATORS.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-xs text-parchment-faint mt-2 max-w-lg">
        A written reference for the indicators actually used when screening or
        timing a trade — what each one shows, and how it&apos;s meant to be
        read. Curated, not user-editable.
      </p>
      <div className="rule-divider mt-4 mb-6" />

      {INDICATORS.length === 0 ? (
        <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
          No indicators written up yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {INDICATORS.map((indicator) => (
            <Link
              key={indicator.slug}
              href={`/indicators/${indicator.slug}`}
              className="block border border-line rounded-lg bg-surface px-4 py-3 hover:bg-surface-alt/50 hover:border-gold-dim transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-sm text-parchment shrink-0">
                  {indicator.name}
                </span>
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-gold-dim text-gold-bright shrink-0">
                  {indicator.category}
                </span>
                <span className="text-xs text-parchment-faint truncate hidden sm:inline">
                  {indicator.summary}
                </span>
              </div>
              <p className="text-xs text-parchment-faint mt-1.5 sm:hidden">
                {indicator.summary}
              </p>
              <p className="text-[11px] text-parchment-faint mt-1">
                by {indicator.developer}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
