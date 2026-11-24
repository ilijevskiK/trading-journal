// One-time backfill of a year of RS Ratings history (`npm run rs-backfill`).
// Downloads the extra year of prices the oldest ratings need (the free
// Massive plan serves about two years back, at 5 requests a minute), ranks
// every stored trading day, saves the ratings, then trims the prices back to
// what the daily job keeps. Safe to stop and rerun: each downloaded day and
// each saved ranking is kept, and days that already have a ranking are
// skipped (pass --force to recompute them).
//
// Needs DATABASE_URL, MASSIVE_API_KEY and SEC_USER_AGENT.

import pg from "pg";
import { fetchSplits, latestRequestableDate } from "../lib/massiveData.js";
import { fetchSecCompanyNames } from "../lib/secEdgar.js";
import { loadPriceDays, prunePriceDays } from "../lib/screenerDb.js";
import { getRunDates, saveRun, withRankingLock } from "../lib/rsRatingsDb.js";
import { splitsByTicker } from "../lib/priceHistory.js";
import { backfillRatings } from "../lib/rsBackfill.js";
import { daysBefore, downloadMissingDays, log, requireEnv, withRetryOnRateLimit } from "../lib/screenerJob.js";

const HISTORY_DAYS = 365; // how much rating history to build
const LOOKBACK_DAYS = 365 + 7; // each rating needs a year of prices behind it, plus a week to step over holidays
const KEEP_PRICE_DAYS = 380; // what the daily job keeps (scripts/run-screener.mjs)

const CONNECTION_RETRIES = 5;
const isConnectionError = (e) =>
  ["EADDRNOTAVAIL", "ECONNRESET", "ETIMEDOUT", "EPIPE", "57P01"].includes(e.code) || /Connection terminated/i.test(e.message ?? "");

pg.types.setTypeParser(1082, (val) => val); // DATE as 'YYYY-MM-DD', like lib/db.js

async function main() {
  const force = process.argv.includes("--force");
  const databaseUrl = requireEnv("DATABASE_URL");
  const apiKey = requireEnv("MASSIVE_API_KEY");
  const userAgent = requireEnv("SEC_USER_AGENT");
  const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false },
    keepAlive: true, // long downloads leave connections idle; keep them from being dropped
    keepAliveInitialDelayMillis: 10_000,
  });
  pool.on("error", (e) => log(`Database connection error: ${e.message}`));

  try {
    const names = await fetchSecCompanyNames(userAgent);
    const universe = new Set(names.keys());
    const latest = latestRequestableDate();
    const since = daysBefore(latest, HISTORY_DAYS);
    const oldest = daysBefore(since, LOOKBACK_DAYS);

    const job = async (client) => {
      await downloadMissingDays(pool, universe, oldest, latest, apiKey);

      const days = await loadPriceDays(pool, oldest);
      if (!days.length) throw new Error("No price history stored.");
      const asOf = days[days.length - 1].date;
      const splits = splitsByTicker(await withRetryOnRateLimit(() => fetchSplits(days[0].date, apiKey)), asOf);
      log(`${days.length} trading days loaded (${days[0].date} to ${asOf}).`);

      const skipDates = force ? new Set() : await getRunDates(client);
      let saved = 0;
      for (const run of backfillRatings(days, splits, universe, { since, skipDates })) {
        await saveRun(client, run.asOf, run.ratings);
        saved++;
        if (saved % 20 === 0) log(`${saved} days ranked (at ${run.asOf}).`);
      }
      log(`Saved RS Ratings for ${saved} day(s)${skipDates.size ? `, skipped ${skipDates.size} already ranked` : ""}.`);

      // The older prices were only needed to rank the older days.
      await prunePriceDays(pool, daysBefore(latest, KEEP_PRICE_DAYS));
    };

    // A dropped connection loses nothing (every day is saved as it goes), so
    // pick up again with a fresh connection instead of starting over by hand.
    for (let attempt = 1; ; attempt++) {
      try {
        if (!(await withRankingLock(pool, job))) throw new Error("Another RS ranking is running; try again in a few minutes.");
        break;
      } catch (e) {
        if (!isConnectionError(e) || attempt === CONNECTION_RETRIES) throw e;
        log(`Database connection lost (${e.code ?? e.message}); reconnecting, attempt ${attempt + 1} of ${CONNECTION_RETRIES}.`);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
