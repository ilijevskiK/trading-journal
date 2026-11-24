// Lines a stock's daily RS Rating history up with a price chart's candles.
// `history` is [{ asOf: 'YYYY-MM-DD', rating }] oldest first (from
// getRsRatingAction); candle times are 'YYYY-MM-DD' strings (day/week
// bars) or Unix-second numbers (intraday bars).

const dateOf = (time) => (typeof time === "number" ? new Date(time * 1000).toISOString().slice(0, 10) : time);

// One { time, value } per candle: the latest rating on or before that
// candle's date, so a weekly or intraday bar shows the rating in force when
// it printed. Candles before the first ranked day get no point.
export function ratingPointsForCandles(candles, history) {
  if (!history?.length) return [];
  const points = [];
  let h = -1;
  for (const c of candles) {
    const date = dateOf(c.time);
    while (h + 1 < history.length && history[h + 1].asOf <= date) h++;
    if (h >= 0) points.push({ time: c.time, value: history[h].rating });
  }
  return points;
}
