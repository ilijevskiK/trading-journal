// Massive (formerly Polygon.io) "grouped daily" bars: every US stock's
// daily bar for one date in a single request. Server-only (MASSIVE_API_KEY).
// The free Stocks Basic plan allows 5 requests a minute and serves a day's
// bars only after midnight New York time.

const GROUPED_URL = (date, apiKey) =>
  `https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${encodeURIComponent(apiKey)}`;
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

function previousDay(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const isWeekend = (date) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());

// Closes for one date as Map(ticker -> close), or null if markets were
// closed that day (a holiday returns no results).
export async function fetchGroupedCloses(date, apiKey) {
  await throttle();
  const res = await fetch(GROUPED_URL(date, apiKey), { cache: "no-store" });
  if (res.status === 403) return null; // not available yet on this plan
  if (res.status === 429) throw new Error("Massive rate limit hit. Try again in a minute.");
  if (res.status === 401) throw new Error("Massive rejected the API key. Check MASSIVE_API_KEY.");
  if (!res.ok) throw new Error(`Massive returned ${res.status}.`);
  const json = await res.json();
  if (!json.results?.length) return null;
  return new Map(json.results.filter((r) => r.T && r.c > 0).map((r) => [r.T, r.c]));
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
