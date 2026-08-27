// Converts a candle's own `time` (a numeric Unix-seconds timestamp for
// intraday bars, or a plain "YYYY-MM-DD" string for day/week/month bars —
// see lib/marketData.js) to a comparable "YYYY-MM-DD" trading-day string.
function candleDateStr(time) {
  return typeof time === "number" ? new Date(time * 1000).toISOString().slice(0, 10) : time;
}

// Merges a live trade tick into a daily candle series for display, without
// mutating the original array (which stays exactly what was fetched/cached
// — the merge is presentation-only, and gets replaced wholesale by the next
// scheduled refetch regardless of what this produces).
//
// Only nudges the *last* candle when the tick actually falls on that same
// trading day. While the market is open and the daily feed hasn't posted a
// bar for today yet, the "last candle" is still yesterday's finalized one —
// nudging it there would corrupt already-settled history and never show a
// bar for today at all. When the tick is from a later day, this starts a
// fresh candle instead.
export function applyLiveTick(candles, tick) {
  if (!tick || !candles || candles.length === 0) return candles;

  const last = candles[candles.length - 1];
  const tickDate = new Date(tick.timestamp).toISOString().slice(0, 10);
  const lastDate = candleDateStr(last.time);

  if (tickDate === lastDate) {
    const updated = {
      ...last,
      close: tick.price,
      high: Math.max(last.high, tick.price),
      low: Math.min(last.low, tick.price),
    };
    return [...candles.slice(0, -1), updated];
  }

  // An out-of-order/stale tick timestamped before the last known bar —
  // nothing sane to do with it.
  if (tickDate < lastDate) return candles;

  // The tick is from a later trading day than the feed has posted a bar
  // for yet — start a new one rather than overwriting the previous day's
  // already-finalized candle.
  const time = typeof last.time === "number" ? Math.floor(tick.timestamp / 1000) : tickDate;
  return [
    ...candles,
    { time, open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: 0 },
  ];
}