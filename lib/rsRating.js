// O'Neil's RS Rating, rebuilt: each stock's price performance over the last
// 12 months, with the latest quarter weighted double, ranked against every
// other stock and expressed as a percentile from 1 to 99 (87 = it beat 87%
// of stocks). Pure functions; snapshots are Map(ticker -> close).

export const RS_PERIODS = [
  { key: "m3", months: 3, weight: 0.4 },
  { key: "m6", months: 6, weight: 0.2 },
  { key: "m9", months: 9, weight: 0.2 },
  { key: "m12", months: 12, weight: 0.2 },
];

// Weighted performance for one stock. Stocks listed for less than a year
// are scored on the periods they have, with the weights rescaled, so a
// recent IPO isn't simply left out (it still needs 3 months of history).
export function rsScore(now, past) {
  if (!(now > 0)) return null;
  let total = 0;
  let weight = 0;
  for (const p of RS_PERIODS) {
    const then = past[p.key];
    if (!(then > 0)) continue;
    total += ((now - then) / then) * 100 * p.weight;
    weight += p.weight;
  }
  if (!past.m3 || weight === 0) return null;
  return total / weight;
}

// `universe` limits the ranking to real operating companies (the SEC's
// ticker list), leaving out ETFs, warrants and other instruments.
export function computeRsRatings(snapshots, universe = null) {
  const scores = [];
  for (const [ticker, close] of snapshots.now) {
    if (universe && !universe.has(ticker)) continue;
    const past = Object.fromEntries(RS_PERIODS.map((p) => [p.key, snapshots[p.key]?.get(ticker)]));
    const score = rsScore(close, past);
    if (score != null && Number.isFinite(score)) scores.push({ ticker, score });
  }
  scores.sort((a, b) => a.score - b.score);
  const n = scores.length;
  return scores.map((s, i) => {
    // Share of other stocks it beat; ties share the lower rank.
    let lower = i;
    while (lower > 0 && scores[lower - 1].score === s.score) lower--;
    const percentile = n > 1 ? lower / (n - 1) : 1;
    return { ...s, rating: Math.min(99, Math.max(1, Math.round(percentile * 99))) };
  });
}

function addMonths(date, months) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

// The calendar dates to look for each snapshot on. Weekends and holidays
// have no data, so callers step back day by day from each target.
export function snapshotTargets(latestDate) {
  return {
    now: latestDate,
    ...Object.fromEntries(RS_PERIODS.map((p) => [p.key, addMonths(latestDate, -p.months)])),
  };
}
