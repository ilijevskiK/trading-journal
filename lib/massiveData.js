// Massive (formerly Polygon.io) "grouped daily" bars: every US stock's
// daily bar for one date in a single request. Server-only (MASSIVE_API_KEY).
// The free Stocks Basic plan allows 5 requests a minute and serves a day's
// bars only after midnight New York time.

const GROUPED_URL = (date, apiKey, adjusted) =>
  `https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=${adjusted}&apiKey=${encodeURIComponent(apiKey)}`;
const SPLITS_URL = (since, apiKey) =>
  `https://api.massive.com/stocks/v1/splits?execution_date.gte=${since}&limit=5000&apiKey=${encodeURIComponent(apiKey)}`;
const REQUESTS_PER_MINUTE = 5;
const MAX_STEP_BACK_DAYS = 6;

const requestTimes = [];
async function throttle() {
  for (;;) {
    const now = Date.now();
    while (requestTimes.length && now - requestTimes[0] > 60_000) requestTimes.shift();
    if (requestTimes.length < REQUESTS_PER_MINUTE) {
      requestTimes.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, 60_000 - (now - requestTimes[0]) + 250));
  }
}

export function previousDay(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const isWeekend = (date) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());

async function massiveGet(url) {
  await throttle();
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 403) return null; // not available yet on this plan
  if (res.status === 429) {
    const err = new Error("Massive rate limit hit. Try again in a minute.");
    err.status = 429;
    throw err;
  }
  if (res.status === 401) throw new Error("Massive rejected the API key. Check MASSIVE_API_KEY.");
  if (!res.ok) throw new Error(`Massive returned ${res.status}.`);
  return res.json();
}

// Every stock's bar for one date: [{ T, c, h, v, ... }], [] if markets were
// closed that day (a holiday returns no results), or null if the date
// isn't available yet. Unadjusted bars keep stored history stable; apply
// splits when reading it (see lib/priceHistory.js).
export async function fetchGroupedBars(date, apiKey, { adjusted = true } = {}) {
  const json = await massiveGet(GROUPED_URL(date, apiKey, adjusted));
  if (!json) return null;
  return (json.results ?? []).filter((r) => r.T && r.c > 0);
}

// Closes for one date as Map(ticker -> close), or null if markets were
// closed that day or it isn't available yet.
export async function fetchGroupedCloses(date, apiKey) {
  const bars = await fetchGroupedBars(date, apiKey);
  if (!bars?.length) return null;
  return new Map(bars.map((r) => [r.T, r.c]));
}

// Every split executed on or after `since` (forward, reverse and stock
// dividends), following Massive's pagination.
export async function fetchSplits(since, apiKey) {
  const splits = [];
  let url = SPLITS_URL(since, apiKey);
  while (url) {
    const json = await massiveGet(url);
    if (!json) throw new Error("Massive splits aren't available on this plan.");
    splits.push(...(json.results ?? []));
    const next = json.next_url;
    if (!next) url = null;
    else if (next.includes("apiKey=")) url = next;
    else url = `${next}${next.includes("?") ? "&" : "?"}apiKey=${encodeURIComponent(apiKey)}`;
  }
  return splits;
}

// The nearest trading day on or before `date` that has data, skipping
// weekends without spending a request on them.
export async function closesOnOrBefore(date, apiKey) {
  let d = date;
  for (let i = 0; i <= MAX_STEP_BACK_DAYS; i++, d = previousDay(d)) {
    if (isWeekend(d)) continue;
    const closes = await fetchGroupedCloses(d, apiKey);
    if (closes) return { date: d, closes };
  }
  return null;
}

// Yesterday in New York: on the free plan that's the most recent day whose
// bars can be requested.
export function latestRequestableDate(now = new Date()) {
  const ny = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  return previousDay(ny);
}
