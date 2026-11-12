// CAN SLIM screener, stage 1: the price and volume checks that cut 6,000+
// US stocks down to a list worth checking letter by letter. Pure
// functions over the stored daily history (lib/priceHistory.js).

import { computeRsRatings, snapshotTargets, RS_PERIODS } from "./rsRating.js";
import { barOn, closesMap, dayOnOrBefore } from "./priceHistory.js";

// O'Neil favours stocks priced $15+ and near their highs; the dollar-volume
// floor is this app's own liquidity cut, so a fund could actually buy in.
export const SCREENER_RULES = {
  minPrice: 15,
  minAvgDollarVolume: 10_000_000,
  minRsRating: 80,
  maxBelowHighPct: 15,
  highSessions: 252, // 52 weeks
  volumeSessions: 50,
  minVolumeSessions: 40, // traded on most of those sessions
};

// True once the stored history reaches back far enough for a 12-month
// comparison and a 52-week high.
export function historyIsComplete(days) {
  if (!days.length) return false;
  const yearAgo = snapshotTargets(days[days.length - 1].date).m12;
  return days[0].date <= yearAgo && days.length >= SCREENER_RULES.highSessions;
}

// The five snapshots computeRsRatings needs, all split-adjusted.
export function rsSnapshots(days, splits) {
  const latest = days[days.length - 1];
  const targets = snapshotTargets(latest.date);
  const snapshots = { now: closesMap(latest, splits) };
  for (const p of RS_PERIODS) snapshots[p.key] = closesMap(dayOnOrBefore(days, targets[p.key]), splits);
  return snapshots;
}

export function rankStocks(days, splits, universe) {
  return computeRsRatings(rsSnapshots(days, splits), universe);
}

// Price, 52-week high and average volume for one stock, or null if it
// didn't trade on the latest day.
export function stockMetrics(ticker, days, splits, rules = SCREENER_RULES) {
  const latest = barOn(days[days.length - 1], ticker, splits);
  if (!latest) return null;
  let high = 0;
  let dollarVolume = 0;
  let volume = 0;
  let volumeDays = 0;
  const from = Math.max(0, days.length - rules.highSessions);
  for (let i = days.length - 1, n = 0; i >= from; i--, n++) {
    const bar = barOn(days[i], ticker, splits);
    if (!bar) continue;
    high = Math.max(high, bar.high);
    if (n < rules.volumeSessions) {
      dollarVolume += bar.close * bar.volume;
      volume += bar.volume;
      volumeDays++;
    }
  }
  return {
    price: latest.close,
    high52: high,
    pctBelowHigh: high > 0 ? ((high - latest.close) / high) * 100 : null,
    avgDollarVolume: volumeDays >= rules.minVolumeSessions ? dollarVolume / volumeDays : null,
    avgVolume: volumeDays >= rules.minVolumeSessions ? volume / volumeDays : null,
  };
}

// Runs every stock in `universe` through the checks in order. Returns the
// stocks that pass all of them (best RS first) and how many survived each
// step, so the page can show the funnel.
export function screenStocks({ days, splits, universe, ratings, names = new Map() }, rules = SCREENER_RULES) {
  const ratingOf = new Map(ratings.map((r) => [r.ticker, r.rating]));
  const funnel = { universe: 0, priceAndVolume: 0, rsRating: 0, nearHigh: 0 };
  const candidates = [];
  for (const ticker of universe) {
    const m = stockMetrics(ticker, days, splits, rules);
    if (!m) continue;
    funnel.universe++;
    if (m.price < rules.minPrice || !(m.avgDollarVolume >= rules.minAvgDollarVolume)) continue;
    funnel.priceAndVolume++;
    const rsRating = ratingOf.get(ticker);
    if (!(rsRating >= rules.minRsRating)) continue;
    funnel.rsRating++;
    if (!(m.pctBelowHigh <= rules.maxBelowHighPct)) continue;
    funnel.nearHigh++;
    candidates.push({ ticker, name: names.get(ticker) ?? null, rsRating, ...m });
  }
  candidates.sort((a, b) => b.rsRating - a.rsRating || a.pctBelowHigh - b.pctBelowHigh);
  return { candidates, funnel };
}
