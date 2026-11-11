"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STRATEGIES } from "@/content/strategies";

export default function StrategiesPage() {
  const [activeCategory, setActiveCategory] = useState(null);

  const categories = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const strategy of STRATEGIES) {
      if (!seen.has(strategy.category)) {
        seen.add(strategy.category);
        list.push(strategy.category);
      }
    }
    return list;
  }, []);

  const visibleStrategies = activeCategory
    ? STRATEGIES.filter((strategy) => strategy.category === activeCategory)
    : STRATEGIES;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">Trading Strategies</h1>
        <span className="font-mono text-xs text-parchment-faint">
          {visibleStrategies.length} of {STRATEGIES.length} strateg
          {STRATEGIES.length === 1 ? "y" : "ies"}
        </span>
      </div>
      <p className="text-xs text-parchment-faint mt-2 max-w-lg">
        Trading systems and setups worth actually using — what to look for,
        the entry/exit rules, and how to manage risk. Curated, not
        user-editable.
      </p>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
              activeCategory === null
                ? "border-gold-dim text-gold-bright bg-surface-alt"
                : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
                activeCategory === category
                  ? "border-gold-dim text-gold-bright bg-surface-alt"
                  : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="rule-divider mt-4 mb-6" />

      {visibleStrategies.length === 0 ? (
        <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
          {STRATEGIES.length === 0
            ? "No strategies written up yet."
            : "No strategies in this category."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleStrategies.map((strategy) => (
            <Link
              key={strategy.slug}
              href={`/strategies/${strategy.slug}`}
              className="block border border-line rounded-lg bg-surface px-4 py-3 hover:bg-surface-alt/50 hover:border-gold-dim transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-sm text-parchment shrink-0">
                  {strategy.title}
                </span>
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-gold-dim text-gold-bright shrink-0">
                  {strategy.category}
                </span>
                <span className="text-xs text-parchment-faint truncate hidden sm:inline">
                  {strategy.summary}
                </span>
              </div>
              <p className="text-xs text-parchment-faint mt-1.5 sm:hidden">
                {strategy.summary}
              </p>
              {strategy.author && (
                <p className="text-[11px] text-parchment-faint mt-1">
                  by {strategy.author}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
