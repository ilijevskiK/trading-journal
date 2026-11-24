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
import { fetchSplits, latestRequestableDate } from "../lib/massiveData.js";
import { fetchSecCompanyNames, fetchSecExchanges } from "../lib/secEdgar.js";
import { historyIsComplete, rankStocks, screenStocks } from "../lib/screener.js";
import { loadPriceDays, prunePriceDays, saveScreenerRun } from "../lib/screenerDb.js";
import { saveRun, withRankingLock } from "../lib/rsRatingsDb.js";
import { splitsByTicker } from "../lib/priceHistory.js";
import { daysBefore, downloadMissingDays, log, requireEnv, withRetryOnRateLimit } from "../lib/screenerJob.js";

const KEEP_CALENDAR_DAYS = 380; // a year of sessions plus room to step back over holidays
const LOCK_RETRIES = 10;

pg.types.setTypeParser(1082, (val) => val); // DATE as 'YYYY-MM-DD', like lib/db.js

async function main() {
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
    log(`${universe.size} companies in the SEC's list.`);
    // Which exchange each trades on is a nice-to-have: without it the screen still runs.
    let exchanges = new Map();
    try {
      exchanges = await fetchSecExchanges(userAgent);
    } catch (e) {
      log(`Couldn't load the exchange list (${e.message}); the screen will have no exchanges.`);
    }

    const latest = latestRequestableDate();
    const oldest = daysBefore(latest, KEEP_CALENDAR_DAYS);

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

        const screen = screenStocks({ days, splits, universe, ratings, names, exchanges });
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
