// Strategies a trade can be tagged with. An entry either has a write-up
// component (`Content`, rendered at /strategies/[slug]), optionally with a
// Pine Script for the Explanation / Pine Script toggle, or an `href` to its
// own section of the app.
export const STRATEGIES = [
  {
    slug: "can-slim",
    title: "CAN SLIM",
    author: "William J. O'Neil",
    category: "Growth",
    href: "/strategies",
  },
];

export function getStrategy(slug) {
  return STRATEGIES.find((s) => s.slug === slug) || null;
}

export function strategyHref(strategy) {
  return strategy.href || `/strategies/${strategy.slug}`;
}
