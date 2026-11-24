// Storage for the daily price history and screener runs
// (db/0008_screener.sql).

import { makeDay } from "./priceHistory.js";

const KEEP_RUN_DAYS = 30;

// Every stored date, holidays included, as 'YYYY-MM-DD' strings.
export async function getStoredDates(pool) {
  const { rows } = await pool.query("SELECT date FROM price_days");
  return new Set(rows.map((r) => r.date));
}

// `bars` is Massive's [{ T, c, h, v }]; an empty list records a holiday.
export async function savePriceDay(pool, date, bars) {
  await pool.query(
    `INSERT INTO price_days (date, tickers, closes, highs, volumes) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (date) DO UPDATE SET tickers = EXCLUDED.tickers, closes = EXCLUDED.closes,
       highs = EXCLUDED.highs, volumes = EXCLUDED.volumes, created_at = now()`,
    [date, bars.map((b) => b.T), bars.map((b) => b.c), bars.map((b) => b.h ?? b.c), bars.map((b) => b.v ?? 0)]
  );
}

export async function prunePriceDays(pool, before) {
  await pool.query("DELETE FROM price_days WHERE date < $1", [before]);
}

// Trading days on or after `since`, oldest first (holidays left out).
export async function loadPriceDays(pool, since) {
  const { rows } = await pool.query(
    `SELECT date, tickers, closes, highs, volumes FROM price_days
     WHERE date >= $1 AND cardinality(tickers) > 0 ORDER BY date`,
    [since]
  );
  return rows.map((r) => makeDay(r.date, r.tickers, r.closes.map(Number), r.highs.map(Number), r.volumes.map(Number)));
}

export async function saveScreenerRun(client, asOf, { candidates, funnel }) {
  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO screener_runs (as_of, funnel) VALUES ($1, $2::jsonb)
       ON CONFLICT (as_of) DO UPDATE SET funnel = EXCLUDED.funnel, created_at = now()`,
      [asOf, JSON.stringify(funnel)]
    );
    await client.query("DELETE FROM screener_results WHERE as_of = $1", [asOf]);
    await client.query(
      `INSERT INTO screener_results (as_of, ticker, rs_rating, metrics)
       SELECT $1, * FROM unnest($2::text[], $3::smallint[], $4::jsonb[])`,
      [
        asOf,
        candidates.map((c) => c.ticker),
        candidates.map((c) => c.rsRating),
        candidates.map(({ ticker, rsRating, ...metrics }) => JSON.stringify(metrics)),
      ]
    );
    await client.query("DELETE FROM screener_runs WHERE as_of < $1::date - $2::int", [asOf, KEEP_RUN_DAYS]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

// For each ticker in the latest run, how many screens in a row (counting
// the latest) it has been on. `runDates` is newest first; `tickersByDate`
// is Map(date -> Set(ticker)).
export function listingStreaks(runDates, tickersByDate, tickers) {
  const streaks = new Map();
  for (const ticker of tickers) {
    let n = 0;
    while (n < runDates.length && tickersByDate.get(runDates[n])?.has(ticker)) n++;
    streaks.set(ticker, n);
  }
  return streaks;
}

// The latest run with its stocks, best RS first, or null before the first
// run. Each stock carries `daysOnList` (consecutive screens it has passed,
// 1 = first day) and `isNew`: it passed today but not on the previous run.
// Nothing is "new" on the very first run, when there's nothing to compare to.
export async function getLatestScreen(pool) {
  const { rows: runs } = await pool.query(
    "SELECT as_of, funnel, created_at FROM screener_runs ORDER BY as_of DESC LIMIT $1",
    [KEEP_RUN_DAYS]
  );
  const run = runs[0];
  if (!run) return null;
  const { rows } = await pool.query(
    "SELECT ticker, rs_rating, metrics FROM screener_results WHERE as_of = $1 ORDER BY rs_rating DESC, ticker",
    [run.as_of]
  );
  const runDates = runs.map((r) => r.as_of);
  const tickersByDate = new Map(runDates.map((d) => [d, new Set()]));
  if (runDates.length > 1) {
    const { rows: past } = await pool.query("SELECT as_of, ticker FROM screener_results WHERE as_of = ANY($1::date[])", [runDates]);
    for (const p of past) tickersByDate.get(p.as_of)?.add(p.ticker);
  }
  const streaks = listingStreaks(runDates, tickersByDate, rows.map((r) => r.ticker));
  return {
    asOf: run.as_of,
    funnel: run.funnel,
    createdAt: run.created_at.toISOString(),
    stocks: rows.map((r) => {
      const daysOnList = Math.max(1, streaks.get(r.ticker) ?? 1);
      return { ticker: r.ticker, rsRating: r.rs_rating, ...r.metrics, daysOnList, isNew: runDates.length > 1 && daysOnList === 1 };
    }),
  };
}
