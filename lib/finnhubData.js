// Finnhub REST client for the S&P 500 "company glimpse" — the first REST
// (non-WebSocket) use of Finnhub in this app; lib/finnhubSocket.js only
// handles the live-trade stream. Free tier only: forward P/E, business
// description, employee count, and revenue actual/estimate all require a
// paid plan on either Finnhub or Twelve Data (confirmed against both
// providers' current docs) and are deliberately not part of this feature.
//
// Same shape as lib/marketData.js throughout: never throws, guards missing
// apiKey/symbol upfront, returns { data, error }.

const BASE_URL = "https://finnhub.io/api/v1";

async function getJson(path, params, apiKey) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("token", apiKey);

  let json;
  try {
    const res = await fetch(url.toString());
    json = await res.json();
    if (!res.ok) {
      return { json: null, error: { message: json?.error || "Finnhub returned an error." } };
    }
  } catch (e) {
    return { json: null, error: { message: "Network error reaching Finnhub." } };
  }
  return { json, error: null };
}

// GET /stock/profile2 -> { name, industry, marketCapitalization, exchange,
// country, currency }, error: null } or { data: null, error }.
export async function fetchCompanyProfile({ symbol, apiKey }) {
  if (!apiKey) return { data: null, error: { message: "No Finnhub API key set." } };
  if (!symbol) return { data: null, error: { message: "No ticker symbol provided." } };

  const { json, error } = await getJson("/stock/profile2", { symbol }, apiKey);
  if (error) return { data: null, error };
  if (!json || !json.name) {
    return { data: null, error: { message: "No company profile found for this symbol." } };
  }

  return {
    data: {
      name: json.name,
      industry: json.finnhubIndustry || null,
      marketCapitalization: json.marketCapitalization ?? null,
      exchange: json.exchange || null,
      country: json.country || null,
      currency: json.currency || null,
    },
    error: null,
  };
}

// GET /stock/metric -> a handful of valuation/margin/growth ratios, each
// pulled via a fallback chain since Finnhub doesn't publish one fixed
// canonical field name (TTM vs. Annual availability varies per symbol).
// Field names confirmed against real captured API responses, not just docs.
export async function fetchBasicFinancials({ symbol, apiKey }) {
  if (!apiKey) return { data: null, error: { message: "No Finnhub API key set." } };
  if (!symbol) return { data: null, error: { message: "No ticker symbol provided." } };

  const { json, error } = await getJson("/stock/metric", { symbol, metric: "all" }, apiKey);
  if (error) return { data: null, error };

  const m = json?.metric || {};
  const peRatio =
    m.peExclExtraTTM ?? m.peBasicExclExtraTTM ?? m.peInclExtraTTM ?? m.peNormalizedAnnual ?? null;

  return {
    data: {
      peRatio,
      pbRatio: m.pbAnnual ?? m.pbQuarterly ?? null,
      psRatio: m.psTTM ?? m.psAnnual ?? null,
      grossMargin: m.grossMarginTTM ?? m.grossMarginAnnual ?? null,
      operatingMargin: m.operatingMarginTTM ?? m.operatingMarginAnnual ?? null,
      netMargin: m.netProfitMarginTTM ?? m.netProfitMarginAnnual ?? null,
      revenueGrowth: m.revenueGrowthTTMYoy ?? m.revenueGrowthQuarterlyYoy ?? null,
      epsGrowth: m.epsGrowthTTMYoy ?? m.epsGrowthQuarterlyYoy ?? null,
      bookValuePerShare: m.bookValuePerShareAnnual ?? m.bookValuePerShareQuarterly ?? null,
      week52High: m["52WeekHigh"] ?? null,
      week52Low: m["52WeekLow"] ?? null,
      beta: m.beta ?? null,
      currentRatio: m.currentRatioAnnual ?? m.currentRatioQuarterly ?? null,
      debtToEquity: m["totalDebt/totalEquityAnnual"] ?? m["totalDebt/totalEquityQuarterly"] ?? null,
    },
    error: null,
  };
}

// GET /stock/peers -> array of peer tickers in the same sub-industry
// (Finnhub's default grouping), excluding the symbol itself.
export async function fetchPeers({ symbol, apiKey }) {
  if (!apiKey) return { data: [], error: { message: "No Finnhub API key set." } };
  if (!symbol) return { data: [], error: { message: "No ticker symbol provided." } };

  const { json, error } = await getJson("/stock/peers", { symbol }, apiKey);
  if (error) return { data: [], error };
  if (!Array.isArray(json)) return { data: [], error: null };

  return { data: json.filter((t) => t && t !== symbol), error: null };
}

// GET /company-news -> last 5 headlines within a 14-day window. Finnhub's
// free tier caps history at 1 year and North American companies only.
export async function fetchCompanyNews({ symbol, apiKey }) {
  if (!apiKey) return { data: [], error: { message: "No Finnhub API key set." } };
  if (!symbol) return { data: [], error: { message: "No ticker symbol provided." } };

  const to = new Date();
  const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const { json, error } = await getJson(
    "/company-news",
    { symbol, from: fmt(from), to: fmt(to) },
    apiKey
  );
  if (error) return { data: [], error };
  if (!Array.isArray(json)) return { data: [], error: null };

  const data = json.slice(0, 5).map((row) => ({
    id: row.id,
    headline: row.headline,
    source: row.source,
    url: row.url,
    datetime: row.datetime,
  }));

  return { data, error: null };
}

// GET /stock/recommendation -> most recent month's analyst buy/hold/sell
// counts. Sorted by period ourselves rather than trusting response order.
export async function fetchRecommendationTrends({ symbol, apiKey }) {
  if (!apiKey) return { data: null, error: { message: "No Finnhub API key set." } };
  if (!symbol) return { data: null, error: { message: "No ticker symbol provided." } };

  const { json, error } = await getJson("/stock/recommendation", { symbol }, apiKey);
  if (error) return { data: null, error };
  if (!Array.isArray(json) || json.length === 0) return { data: null, error: null };

  const latest = [...json].sort((a, b) => (a.period < b.period ? 1 : -1))[0];

  return {
    data: {
      period: latest.period,
      strongBuy: latest.strongBuy ?? 0,
      buy: latest.buy ?? 0,
      hold: latest.hold ?? 0,
      sell: latest.sell ?? 0,
      strongSell: latest.strongSell ?? 0,
    },
    error: null,
  };
}

// GET /stock/earnings -> last 4 quarters (Finnhub free-tier limit) of EPS
// actual vs. estimate. EPS only — Finnhub's free tier has no revenue
// actual/estimate field on this endpoint.
export async function fetchCompanyEarnings({ symbol, apiKey }) {
  if (!apiKey) return { data: [], error: { message: "No Finnhub API key set." } };
  if (!symbol) return { data: [], error: { message: "No ticker symbol provided." } };

  const { json, error } = await getJson("/stock/earnings", { symbol }, apiKey);
  if (error) return { data: [], error };
  if (!Array.isArray(json)) return { data: [], error: null };

  const data = json.map((row) => ({
    period: row.period,
    actual: row.actual ?? null,
    estimate: row.estimate ?? null,
    surprise: row.surprise ?? null,
    surprisePercent: row.surprisePercent ?? null,
  }));

  return { data, error: null };
}
