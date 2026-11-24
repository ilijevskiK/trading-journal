// Reads each rated company's SEC filings and stores a small earnings /
// sales / margin / ROE summary (lib/fundamentals.js) for the Composite
// Screener. A company is refreshed when its stored summary is older than
// 21 days, so after the first run only a slice is read each day. The first
// run reads every company (about 5,000 downloads, some several MB each, so
// expect half an hour or more). Safe to stop and rerun: each company is
// saved as it's read.
//
//   node --env-file=.env.local scripts/run-fundamentals.mjs [--limit N]
//
// --limit caps how many companies one run reads (the daily workflow uses it).
// Needs DATABASE_URL and SEC_USER_AGENT.

import pg from "pg";
import { fetchSecCiks, fetchSecFacts } from "../lib/secEdgar.js";
import { summarizeFundamentals } from "../lib/fundamentals.js";
import { getAssignments, getLatestRatedTickers } from "../lib/industriesDb.js";
import { getFundamentalsAges, saveFundamentals } from "../lib/fundamentalsDb.js";
import { log, requireEnv } from "../lib/screenerJob.js";

const PAUSE_MS = 150; // SEC allows 10 requests a second; stay under it
const STALE_MS = 21 * 24 * 60 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(cik, userAgent) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchSecFacts(cik, userAgent);
    } catch (e) {
      if (attempt === 4 || ![429, 500, 502, 503, 504].includes(e.status)) throw e;
      await sleep(5_000 * attempt);
    }
  }
}

function limitArg() {
  const i = process.argv.indexOf("--limit");
  const n = i > 0 ? Number(process.argv[i + 1]) : Infinity;
  if (i > 0 && !(n > 0)) throw new Error("--limit needs a positive number.");
  return n;
}

async function main() {
  const userAgent = requireEnv("SEC_USER_AGENT");
  const limit = limitArg();
  const pool = new pg.Pool({
    connectionString: requireEnv("DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
  });
  pool.on("error", (e) => log(`Database connection error: ${e.message}`));
  try {
    const [ciks, rated, assignments, ages] = await Promise.all([
      fetchSecCiks(userAgent),
      getLatestRatedTickers(pool),
      getAssignments(pool).catch(() => new Map()),
      getFundamentalsAges(pool),
    ]);
    if (!rated.length) throw new Error("No RS Ratings stored yet; run `npm run screener` first.");

    // Share classes share a company, so read each CIK once.
    const byCik = new Map();
    for (const ticker of rated) {
      const cik = ciks.get(ticker);
      if (cik === undefined || assignments.get(ticker) === "Unclassified") continue;
      if (!byCik.has(cik)) byCik.set(cik, []);
      byCik.get(cik).push(ticker);
    }
    const now = Date.now();
    const due = [...byCik]
      .filter(([cik]) => !ages.has(cik) || now - ages.get(cik) > STALE_MS)
      .sort((a, b) => (ages.get(a[0]) ?? 0) - (ages.get(b[0]) ?? 0)) // never-read first, then oldest
      .slice(0, limit);
    if (!due.length) return log("Every company's fundamentals are up to date.");
    log(`Reading ${due.length} of ${byCik.size} companies' filings.`);

    const asOf = new Date().toISOString().slice(0, 10);
    let done = 0;
    let withData = 0;
    for (const [cik, tickers] of due) {
      const facts = await fetchWithRetry(cik, userAgent);
      const summary = facts ? summarizeFundamentals(facts, asOf) : null;
      await saveFundamentals(pool, tickers, cik, summary);
      if (summary) withData++;
      if (++done % 250 === 0) log(`${done}/${due.length} read, ${withData} with usable figures.`);
      await sleep(PAUSE_MS);
    }
    log(`Done: ${done} read, ${withData} with usable figures, ${done - withData} without (foreign filers, no standard EPS).`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
