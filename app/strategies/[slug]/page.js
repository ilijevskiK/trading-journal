import Link from "next/link";
import { notFound } from "next/navigation";
import { STRATEGIES, getStrategy } from "@/content/strategies";
import IndicatorTabs from "@/components/IndicatorTabs";

export function generateStaticParams() {
  return STRATEGIES.map((s) => ({ slug: s.slug }));
}

export default function StrategyDetailPage({ params }) {
  const strategy = getStrategy(params.slug);
  if (!strategy) notFound();

  const { title, author, category, Content, pineScript, pineLicense } = strategy;

  return (
    <div className="max-w-2xl">
      <Link href="/strategies" className="text-xs text-parchment-faint hover:text-parchment">
        ← Trading Strategies
      </Link>

      <div className="flex items-baseline justify-between flex-wrap gap-2 mt-3">
        <h1 className="font-display text-3xl text-parchment">{title}</h1>
        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-gold-dim text-gold-bright shrink-0">
          {category}
        </span>
      </div>
      {author && <p className="text-xs text-parchment-faint mt-1">by {author}</p>}
      <div className="rule-divider mt-4 mb-8" />

      <IndicatorTabs pineScript={pineScript} pineLicense={pineLicense}>
        <Content />
      </IndicatorTabs>
    </div>
  );
}
