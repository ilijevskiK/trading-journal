// Twelve Data client for historical candles.
// Free tier: 800 requests/day, 8/min — plenty for a personal journal once
// results are cached (see lib/chartCache.js). Originally daily-only (this
// app's core use is weeks-to-months swing trades); the fullscreen chart's
// 1H/4H/1D/1W selector also goes through here via the `interval` param.

const BASE_URL = "https://api.twelvedata.com/time_series";
const SYMBOL_SEARCH_URL = "https://api.twelvedata.com/symbol_search";
const QUOTE_URL = "https://api.twelvedata.com/price";

// Sub-daily bars need a real timestamp (time-of-day matters); day/week/month
// bars stay plain "YYYY-MM-DD" strings, matching this app's existing charts
// and trade-log dates.
const INTRADAY_INTERVALS = new Set(["1min", "5min", "15min", "30min", "45min", "1h", "2h", "4h"]);

// Returns { candles: [{ time, open, high, low, close, volume }], error: null }
// or { candles: [], error: { message } } — never throws, so callers can
// render a friendly state instead of crashing. `time` is a "YYYY-MM-DD"
// string for day/week/month intervals, or a Unix-seconds timestamp (UTC)
// for intraday ones.
export async function fetchDailyCandles({ symbol, apiKey, startDate, endDate, interval = "1day" }) {
  if (!apiKey) {
    return { candles: [], error: { message: "No Twelve Data API key set." } };
  }
  if (!symbol) {
    return { candles: [], error: { message: "No ticker symbol provided." } };
  }

  const isIntraday = INTRADAY_INTERVALS.has(interval);

  const url = new URL(BASE_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("apikey", apiKey);
  // Pin intraday bars to UTC so `datetime` has an unambiguous, parseable
  // offset — day/week/month bars are unaffected since only the date portion
  // of `datetime` is used for those.
  if (isIntraday) {
    url.searchParams.set("timezone", "UTC");
  }

  let json;
  try {
    const res = await fetch(url.toString());
    json = await res.json();
  } catch (e) {
    return { candles: [], error: { message: "Network error reaching Twelve Data." } };
  }

  if (json.status === "error" || json.code) {
    return { candles: [], error: { message: json.message || "Twelve Data returned an error." } };
  }

  if (!Array.isArray(json.values)) {
    return { candles: [], error: { message: "No price data found for this symbol." } };
  }

  const candles = json.values
    .map((v) => ({
      time: isIntraday
        ? Math.floor(new Date(`${v.datetime.replace(" ", "T")}Z`).getTime() / 1000)
        : v.datetime.slice(0, 10),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume != null ? parseFloat(v.volume) : null,
    }))
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  return { candles, error: null };
}

// Twelve Data's /symbol_search — an autocomplete endpoint (name or ticker,
// ranked by relevance), not a bulk symbol dump. Returns
// { results: [{ symbol, name, exchange, country, type }], error: null } or
// { results: [], error: { message } } — never throws.
export async function searchSymbols({ query, apiKey, limit = 8 }) {
  if (!apiKey) {
    return { results: [], error: { message: "No Twelve Data API key set." } };
  }
  if (!query || !query.trim()) {
    return { results: [], error: null };
  }

  const url = new URL(SYMBOL_SEARCH_URL);
  url.searchParams.set("symbol", query.trim());
  url.searchParams.set("outputsize", String(limit));
  url.searchParams.set("apikey", apiKey);

  let json;
  try {
    const res = await fetch(url.toString());
    json = await res.json();
  } catch (e) {
    return { results: [], error: { message: "Network error reaching Twelve Data." } };
  }

  if (json.status === "error" || json.code) {
    return { results: [], error: { message: json.message || "Twelve Data returned an error." } };
  }

  if (!Array.isArray(json.data)) {
    return { results: [], error: null };
  }

  const results = json.data.map((d) => ({
    symbol: d.symbol,
    name: d.instrument_name,
    exchange: d.exchange,
    country: d.country,
    type: d.instrument_type,
  }));

  return { results, error: null };
}

// Twelve Data's /price — a single latest-price lookup, cheaper than pulling a
// full candle series. Used where only "as of right now" matters (e.g. valuing
// open positions for the dashboard balance sheet). Returns
// { price: number, error: null } or { price: null, error: { message } } —
// never throws.
export async function fetchQuote({ symbol, apiKey }) {
  if (!apiKey) {
    return { price: null, error: { message: "No Twelve Data API key set." } };
  }
  if (!symbol) {
    return { price: null, error: { message: "No ticker symbol provided." } };
  }

  const url = new URL(QUOTE_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  let json;
  try {
    const res = await fetch(url.toString());
    json = await res.json();
  } catch (e) {
    return { price: null, error: { message: "Network error reaching Twelve Data." } };
  }

  if (json.status === "error" || json.code) {
    return { price: null, error: { message: json.message || "Twelve Data returned an error." } };
  }

  const price = parseFloat(json.price);
  if (Number.isNaN(price)) {
    return { price: null, error: { message: "No price returned for this symbol." } };
  }

  return { price, error: null };
}
