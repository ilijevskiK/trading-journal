// Builds today's Composite Ratings (lib/composite.js) from what the other
// jobs stored: RS Ratings, the group ranking, SEC fundamentals and the price
// history. Run `npm run screener`, `npm run industries` and
// `npm run fundamentals` first. Locally:
// `npm run composite`.
//
// Needs DATABASE_URL, MASSIVE_API_KEY (for splits) and SEC_USER_AGENT.

import pg from "pg";
import { fetchSplits } from "../lib/massiveData.js";
import { fetchSecCompanyNames } from "../lib/secEdgar.js";
import { splitsByTicker } from "../lib/priceHistory.js";
import { loadPriceDays } from "../lib/screenerDb.js";
import { buildComposite } from "../lib/composite.js";
import { saveComposite } from "../lib/compositeDb.js";
import { getAssignments, getGroupsForTickers } from "../lib/industriesDb.js";
import { getFundamentals } from "../lib/fundamentalsDb.js";
import { log, requireEnv, withRetryOnRateLimit } from "../lib/screenerJob.js";

pg.types.setTypeParser(1082, (val) => val); // DATE as 'YYYY-MM-DD', like lib/db.js

async function main() {
  const apiKey = requireEnv("MASSIVE_API_KEY");
  const userAgent = requireEnv("SEC_USER_AGENT");
  const pool = new pg.Pool({
    connectionString: requireEnv("DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
  });
  pool.on("error", (e) => log(`Database connection error: ${e.message}`));
  try {
    const days = await loadPriceDays(pool, "1900-01-01");
    if (!days.length) throw new Error("No price history stored; run `npm run screener` first.");
    const asOf = days[days.length - 1].date;

    const { rows } = await pool.query(
      "SELECT ticker, rating FROM rs_ratings WHERE as_of = $1",
      [asOf]
    );
    if (!rows.length) throw new Error(`No RS Ratings for ${asOf}; run npm run screener first.`);
    const ratings = new Map(rows.map((r) => [r.ticker, r.rating]));

    // Funds, SPACs and preferred shares are marked Unclassified; leave them out.
    const assignments = await getAssignments(pool).catch(() => new Map());
    const tickers = [...ratings.keys()].filter((t) => assignments.get(t) !== "Unclassified");
    log(`${ratings.size} rated stocks, ${tickers.length} after leaving out funds and shells.`);

    const [names, groups, fundamentals, splitList] = await Promise.all([
      fetchSecCompanyNames(userAgent),
      getGroupsForTickers(pool, tickers).catch(() => new Map()),
      getFundamentals(pool).catch(() => new Map()), // table may not exist yet

      withRetryOnRateLimit(() => fetchSplits(days[0].date, apiKey)),
    ]);
    const splits = splitsByTicker(splitList, asOf);

    const composite = buildComposite({ days, splits, tickers, ratings, groups, names, fundamentals });
    const client = await pool.connect();
    try {
      await saveComposite(client, asOf, composite);
    } finally {
      client.release();
    }
    log(`${asOf}: Composite Ratings saved for ${composite.length} stocks (${groups.size} with a group, ${composite.filter((r) => r.parts.eps != null).length} with an EPS Rating).`);
    log(`Top 5: ${composite.slice(0, 5).map((r) => `${r.ticker} ${r.composite}`).join(", ")}.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
