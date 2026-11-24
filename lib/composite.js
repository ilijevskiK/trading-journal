// A Composite Rating in the spirit of IBD's SmartSelect Composite (O'Neil,
// HMMIS): several 1-99 ratings blended with weights, then ranked against
// every other stock. IBD publishes the weights, not the formulas, so each
// piece here is our own version of it.
//
// The parts, as the book describes the weights: EPS Rating (x2) and RS Rating
// (x2), then Industry Group rating, SMR (sales growth, margins, return on
// equity), Accumulation/Distribution, and how close the price is to its
// 52-week high at normal weight. A stock missing a part (no filings, no
// group, too new) is rated on the rest.
//
// Pure functions: `days` are the stored price days (lib/priceHistory.js).

import { barOn } from "./priceHistory.js";
import { stockMetrics } from "./screener.js";
import { epsScore, smrInputs } from "./fundamentals.js";

export const COMPOSITE_WEIGHTS = { eps: 2, rs: 2, group: 1, smr: 1, accDist: 1, nearHigh: 1 };
export const AD_SESSIONS = 63; // about 13 weeks, IBD's "last 3 months"
const MIN_AD_SESSIONS = 40;

const clampRating = (n) => Math.min(99, Math.max(1, Math.round(n)));

// A group's rank (1 = best of `total`) as a 1-99 rating.
export function groupRating(rank, total) {
  if (!(rank >= 1) || !(total >= 1)) return null;
  return total === 1 ? 99 : clampRating(99 - ((rank - 1) / (total - 1)) * 98);
}

// Ratings 1-99 for Map(key -> number): the share of others each beats, ties
// sharing the lower rank (the same rule as the RS Rating).
export function percentileRatings(values) {
  const sorted = [...values.entries()].filter(([, v]) => Number.isFinite(v)).sort((a, b) => a[1] - b[1]);
  const n = sorted.length;
  const ratings = new Map();
  sorted.forEach(([key, v], i) => {
    let lower = i;
    while (lower > 0 && sorted[lower - 1][1] === v) lower--;
    ratings.set(key, clampRating((n > 1 ? lower / (n - 1) : 1) * 99));
  });
  return ratings;
}

// IBD's A-E letters from a 1-99 rating: top fifth is A, bottom fifth is E.
export function letterGrade(rating) {
  if (rating == null) return null;
  return rating >= 80 ? "A" : rating >= 60 ? "B" : rating >= 40 ? "C" : rating >= 20 ? "D" : "E";
}

// Accumulation/Distribution over the last `sessions`: volume on up days minus
// volume on down days, as a share of all volume (+1 = all buying, -1 = all
// selling). Null without enough sessions. Volume-weighted, so heavy buying
// on up days counts for more than quiet drift.
export function accDistBalance(ticker, days, splits, { sessions = AD_SESSIONS, minSessions = MIN_AD_SESSIONS } = {}) {
  let up = 0;
  let down = 0;
  let used = 0;
  for (let i = days.length - 1; i >= Math.max(1, days.length - sessions); i--) {
    const bar = barOn(days[i], ticker, splits);
    const prev = barOn(days[i - 1], ticker, splits);
    if (!bar || !prev) continue;
    used++;
    if (bar.close > prev.close) up += bar.volume;
    else if (bar.close < prev.close) down += bar.volume;
  }
  const total = up + down;
  return used >= minSessions && total > 0 ? (up - down) / total : null;
}

// Weighted average of the ratings that exist; a missing one drops out and
// the rest are rescaled (a recent IPO has no 3-month A/D, say). Null if none.
export function weightedAverage(parts, weights = COMPOSITE_WEIGHTS) {
  let total = 0;
  let weight = 0;
  for (const [key, w] of Object.entries(weights)) {
    if (parts[key] == null) continue;
    total += parts[key] * w;
    weight += w;
  }
  return weight > 0 ? total / weight : null;
}

// SMR 1-99 for Map(ticker -> { growth, margin, roe }): each measure is ranked
// across stocks, a stock's ranks are averaged (it needs at least two), and
// the averages are ranked again so the letters split into even fifths.
export function smrRatings(inputs) {
  const ranked = ["growth", "margin", "roe"].map((key) =>
    percentileRatings(new Map([...inputs].map(([t, v]) => [t, v[key]]).filter(([, v]) => v != null)))
  );
  const averages = new Map();
  for (const ticker of inputs.keys()) {
    const own = ranked.map((r) => r.get(ticker)).filter((v) => v != null);
    if (own.length >= 2) averages.set(ticker, own.reduce((s, v) => s + v, 0) / own.length);
  }
  return percentileRatings(averages);
}

// One row per stock in `tickers` that traded on the latest day and has an RS
// Rating, best Composite first. `ratings` is Map(ticker -> RS Rating),
// `groups` is Map(ticker -> { name, rank, total }), `names` Map(ticker -> name),
// `fundamentals` Map(ticker -> summarizeFundamentals result).
export function buildComposite(
  { days, splits, tickers, ratings, groups = new Map(), names = new Map(), fundamentals = new Map() },
  weights = COMPOSITE_WEIGHTS
) {
  const base = [];
  const balances = new Map();
  const nearness = new Map();
  for (const ticker of tickers) {
    const rs = ratings.get(ticker);
    if (!(rs >= 1)) continue;
    const m = stockMetrics(ticker, days, splits);
    if (!m || m.pctBelowHigh == null) continue;
    base.push({ ticker, rs, m });
    const balance = accDistBalance(ticker, days, splits);
    if (balance != null) balances.set(ticker, balance);
    nearness.set(ticker, -m.pctBelowHigh); // closer to the high = higher
  }
  const accDist = percentileRatings(balances);
  const nearHigh = percentileRatings(nearness);
  const eps = percentileRatings(new Map(base.map(({ ticker }) => [ticker, epsScore(fundamentals.get(ticker))]).filter(([, v]) => v != null)));
  const smr = smrRatings(new Map(base.map(({ ticker }) => [ticker, smrInputs(fundamentals.get(ticker))])));

  const scored = base.map(({ ticker, rs, m }) => {
    const g = groups.get(ticker) ?? null;
    const parts = {
      eps: eps.get(ticker) ?? null,
      rs,
      group: g ? groupRating(g.rank, g.total) : null,
      smr: smr.get(ticker) ?? null,
      accDist: accDist.get(ticker) ?? null,
      nearHigh: nearHigh.get(ticker) ?? null,
    };
    const f = fundamentals.get(ticker);
    return {
      ticker,
      name: names.get(ticker) ?? null,
      parts,
      score: weightedAverage(parts, weights),
      price: m.price,
      pctBelowHigh: m.pctBelowHigh,
      adBalance: balances.get(ticker) ?? null,
      group: g,
      facts: f
        ? { epsGrowth: f.epsQ?.[f.epsQ.length - 1]?.growth ?? null, revenueGrowth: f.revenueGrowth ?? null, netMargin: f.netMargin ?? null, roe: f.roe ?? null }
        : null,
    };
  });
  const composite = percentileRatings(new Map(scored.map((r) => [r.ticker, r.score])));
  return scored
    .map(({ score, ...r }) => ({ ...r, composite: composite.get(r.ticker) ?? null }))
    .filter((r) => r.composite != null)
    .sort((a, b) => b.composite - a.composite || b.parts.rs - a.parts.rs || a.ticker.localeCompare(b.ticker));
}
