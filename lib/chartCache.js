// localStorage cache for per-trade candle data, keyed by trade id.
// Closed trades: cache indefinitely once the needed range is covered — the
// history never changes. Open trades: cache for OPEN_TTL_MS since "today"
// keeps moving, then refetch to extend the range.

const CACHE_KEY = "tj_chart_cache_v1";
const OPEN_TTL_MS = 15 * 60 * 1000;

const QUOTE_CACHE_KEY = "tj_quote_cache_v1";
const QUOTE_TTL_MS = 15 * 60 * 1000; // same "open" cadence as the rest of the app

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function isQuotaExceeded(e) {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

// Writes `cache` to `key`, evicting the least-recently-fetched entry and
// retrying if the write hits the browser's storage quota. Several tickers'
// worth of years-long daily history adds up fast — without this, the first
// write past the quota fails, and every write after it fails the exact same
// way forever (nothing ever gets cached again, silently). Evicting oldest
// first keeps whatever's most likely still useful.
function writeWithEviction(key, cache, label) {
  let attempt = cache;
  for (;;) {
    try {
      window.localStorage.setItem(key, JSON.stringify(attempt));
      return;
    } catch (e) {
      if (!isQuotaExceeded(e)) {
        console.error(`Failed to save ${label}`, e);
        return;
      }
      const entries = Object.entries(attempt);
      if (entries.length === 0) {
        console.error(`Failed to save ${label}: quota exceeded with nothing left to evict`, e);
        return;
      }
      const oldestKey = entries.reduce((oldest, [k, v]) => {
        const oldestTime = attempt[oldest]?.fetchedAt ?? 0;
        return (v?.fetchedAt ?? 0) < oldestTime ? k : oldest;
      }, entries[0][0]);
      const { [oldestKey]: _removed, ...rest } = attempt;
      attempt = rest;
    }
  }
}

function writeCache(cache) {
  writeWithEviction(CACHE_KEY, cache, "chart cache");
}

// entry.from/to cover the range that was actually fetched, so we can tell
// whether a cached entry satisfies a newly-requested [from, to] range.
export function getCachedCandles(tradeId, { from, to, isOpen }) {
  const cache = readCache();
  const entry = cache[tradeId];
  if (!entry) return null;

  const coversRange = entry.from <= from && entry.to >= to;
  if (!coversRange) return null;

  if (isOpen && Date.now() - entry.fetchedAt > OPEN_TTL_MS) return null;

  return entry.candles;
}

export function setCachedCandles(tradeId, { from, to, candles }) {
  const cache = readCache();
  cache[tradeId] = { from, to, candles, fetchedAt: Date.now() };
  writeCache(cache);
}

// Separate, much smaller cache for single-price quotes (dashboard balance
// sheet) — same short-TTL "open" logic as candles, but keyed by ticker
// rather than trade id since there's no date range to cover.
function readQuoteCache() {
  try {
    const raw = window.localStorage.getItem(QUOTE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeQuoteCache(cache) {
  writeWithEviction(QUOTE_CACHE_KEY, cache, "quote cache");
}

export function getCachedQuote(ticker) {
  const cache = readQuoteCache();
  const entry = cache[ticker];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > QUOTE_TTL_MS) return null;
  return entry.price;
}

export function setCachedQuote(ticker, price) {
  const cache = readQuoteCache();
  cache[ticker] = { price, fetchedAt: Date.now() };
  writeQuoteCache(cache);
}
