// Daily CAN SLIM screener job (run by .github/workflows/screener.yml, or
// locally with `npm run screener`). Downloads any trading days missing
// from the stored year of prices, then rebuilds the RS Ratings and the
// screener from that history. The first run backfills about 260 days at
// Massive's free 5 requests a minute, so it takes about an hour; later
// runs fetch one day. Safe to stop and rerun: each day is saved as it's
// downloaded.
//
// Needs DATABASE_URL, MASSIVE_API_KEY and SEC_USER_AGENT.

import pg from "pg";
import { fetchGroupedBars, fetchSplits, isWeekend, latestRequestableDate, previousDay } from "../lib/massiveData.js";
import { fetchSecCompanyNames } from "../lib/secEdgar.js";
import { historyIsComplete, rankStocks, screenStocks } from "../lib/screener.js";
import { getStoredDates, loadPriceDays, prunePriceDays, savePriceDay, saveScreenerRun } from "../lib/screenerDb.js";
import { saveRun, withRankingLock } from "../lib/rsRatingsDb.js";
import { splitsByTicker } from "../lib/priceHistory.js";

const KEEP_CALENDAR_DAYS = 380; // a year of sessions plus room to step back over holidays
const LOCK_RETRIES = 10;

pg.types.setTypeParser(1082, (val) => val); // DATE as 'YYYY-MM-DD', like lib/db.js

function log(message) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} isn't set.`);
  return value;
}

function weekdaysBetween(oldest, latest) {
  const dates = [];
  for (let d = latest; d >= oldest; d = previousDay(d)) if (!isWeekend(d)) dates.push(d);
  return dates; // newest first, so an interrupted backfill still has recent days
}

async function withRetryOnRateLimit(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e.status !== 429) throw e;
    log("Rate limited; waiting a minute.");
    await new Promise((r) => setTimeout(r, 61_000));
    return fn();
  }
}

async function downloadMissingDays(pool, universe, oldest, latest, apiKey) {
  const stored = await getStoredDates(pool);
  const missing = weekdaysBetween(oldest, latest).filter((d) => !stored.has(d));
  if (!missing.length) return log("Price history is up to date.");
  log(`Downloading ${missing.length} day(s), about ${Math.ceil(missing.length / 5)} min.`);
  for (const [i, date] of missing.entries()) {
    const bars = await withRetryOnRateLimit(() => fetchGroupedBars(date, apiKey, { adjusted: false }));
    if (bars === null) {
      log(`${date}: not available yet, skipped.`);
      continue;
    }
    await savePriceDay(pool, date, bars.filter((b) => universe.has(b.T)));
    log(`${date}: ${bars.length ? `${bars.length} bars` : "market closed"} (${i + 1}/${missing.length})`);
  }
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const apiKey = requireEnv("MASSIVE_API_KEY");
  const userAgent = requireEnv("SEC_USER_AGENT");
  const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    const names = await fetchSecCompanyNames(userAgent);
    const universe = new Set(names.keys());
    log(`${universe.size} companies in the SEC's list.`);

    const latest = latestRequestableDate();
    const oldest = new Date(Date.parse(`${latest}T00:00:00Z`) - KEEP_CALENDAR_DAYS * 86_400_000).toISOString().slice(0, 10);

    // The Leadership page ranks on demand when no fresh run exists; the
    // lock keeps it from downloading at the same time (and sharing the
    // 5-a-minute limit) while this job runs.
    for (let attempt = 1; ; attempt++) {
      const ran = await withRankingLock(pool, async (client) => {
        await downloadMissingDays(pool, universe, oldest, latest, apiKey);
        await prunePriceDays(pool, oldest);

        const days = await loadPriceDays(pool, oldest);
        if (!historyIsComplete(days)) {
          log(`Only ${days.length} trading days stored so far; rerun to finish the backfill.`);
          return;
        }
        const asOf = days[days.length - 1].date;
        const splits = splitsByTicker(await withRetryOnRateLimit(() => fetchSplits(days[0].date, apiKey)), asOf);
        log(`${days.length} trading days loaded (${days[0].date} to ${asOf}), ${splits.size} tickers with splits.`);

        const ratings = rankStocks(days, splits, universe);
        if (ratings.length < 500) throw new Error(`Only ${ratings.length} stocks could be ranked; the history looks incomplete.`);
        await saveRun(client, asOf, ratings);
        log(`RS Ratings saved for ${ratings.length} stocks.`);

        const screen = screenStocks({ days, splits, universe, ratings, names });
        await saveScreenerRun(client, asOf, screen);
        log(`Screener: ${JSON.stringify(screen.funnel)}.`);
      });
      if (ran) break;
      if (attempt === LOCK_RETRIES) throw new Error("Another RS ranking kept running; try again later.");
      log("An RS ranking is already running; waiting a minute.");
      await new Promise((r) => setTimeout(r, 60_000));
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
