// A year of every US stock's daily bars, stored unadjusted (one row per
// date, see db/0008_screener.sql) with splits applied on read. Pure
// functions; a day is { date, index: Map(ticker -> i), closes, highs,
// volumes } with the arrays lined up by index.

export function makeDay(date, tickers, closes, highs, volumes) {
  return { date, index: new Map(tickers.map((t, i) => [t, i])), closes, highs, volumes };
}

// Massive split records grouped by ticker, keeping only splits that have
// already taken effect by `asOf` (the feed lists upcoming ones too).
export function splitsByTicker(splits, asOf) {
  const byTicker = new Map();
  for (const s of splits) {
    if (!s.ticker || !(s.split_from > 0) || !(s.split_to > 0) || s.execution_date > asOf) continue;
    if (!byTicker.has(s.ticker)) byTicker.set(s.ticker, []);
    byTicker.get(s.ticker).push({ date: s.execution_date, ratio: s.split_to / s.split_from });
  }
  return byTicker;
}

// What to multiply an unadjusted price from `date` by to compare it with
// today's: 0.1 before a 10-for-1 split. Volumes divide by it.
export function priceFactor(tickerSplits, date) {
  if (!tickerSplits) return 1;
  let factor = 1;
  for (const s of tickerSplits) if (s.date > date) factor /= s.ratio;
  return factor;
}

// The split-adjusted bar for `ticker` on `day`, or null if it didn't trade.
export function barOn(day, ticker, splits) {
  const i = day.index.get(ticker);
  if (i === undefined) return null;
  const f = priceFactor(splits.get(ticker), day.date);
  return { close: day.closes[i] * f, high: day.highs[i] * f, volume: day.volumes[i] / f };
}

// The last stored day on or before `date`, if it's within a week of it.
export function dayOnOrBefore(days, date) {
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].date > date) continue;
    const gapDays = (new Date(`${date}T00:00:00Z`) - new Date(`${days[i].date}T00:00:00Z`)) / 86_400_000;
    return gapDays <= 7 ? days[i] : null;
  }
  return null;
}

// Split-adjusted closes on `day` for every ticker, as Map(ticker -> close).
export function closesMap(day, splits) {
  const closes = new Map();
  if (!day) return closes;
  for (const [ticker, i] of day.index) closes.set(ticker, day.closes[i] * priceFactor(splits.get(ticker), day.date));
  return closes;
}
