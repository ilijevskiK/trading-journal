import Link from "next/link";
import { notFound } from "next/navigation";
import { INDICATORS, getIndicator } from "@/content/indicators";
import IndicatorTabs from "@/components/IndicatorTabs";

export function generateStaticParams() {
  return INDICATORS.map((i) => ({ slug: i.slug }));
}

export default function IndicatorDetailPage({ params }) {
  const indicator = getIndicator(params.slug);
  if (!indicator) notFound();

  const { name, developer, category, tradingviewUrl, Content, pineScript, pineLicense } = indicator;

  return (
    <div className="max-w-2xl">
      <Link href="/indicators" className="text-xs text-parchment-faint hover:text-parchment">
        ← Indicators
      </Link>

      <div className="flex items-baseline justify-between flex-wrap gap-2 mt-3">
        <h1 className="font-display text-3xl text-parchment">{name}</h1>
        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-gold-dim text-gold-bright shrink-0">
          {category}
        </span>
      </div>
      <p className="text-xs text-parchment-faint mt-1">
        by {developer}
        {tradingviewUrl && (
          <>
            {" · "}
            <a
              href={tradingviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-bright hover:underline"
            >
              View on TradingView
            </a>
          </>
        )}
      </p>
      <div className="rule-divider mt-4 mb-8" />

      <IndicatorTabs pineScript={pineScript} pineLicense={pineLicense}>
        <Content />
      </IndicatorTabs>
    </div>
  );
}
