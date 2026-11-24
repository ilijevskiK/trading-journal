// Classifies companies by SEC SIC code and ranks the industry groups for
// every trading day that has RS Ratings (run `npm run screener` first).
// Locally: `npm run industries`. The first run asks the SEC about every
// company, about 15 minutes at a polite 6 requests a second; later runs
// only ask about new tickers. Safe to stop and rerun: each company is
// saved as it's read.
//
// `--rerank` ranks every stored day again (after changing lib/industries.js).
//
// Needs DATABASE_URL and SEC_USER_AGENT.

import pg from "pg";
import { fetchSecCiks, fetchSecSic } from "../lib/secEdgar.js";
import { groupForSic } from "../lib/industries.js";
import {
  getClassifiedTickers,
  getLatestRatedTickers,
  loadResolver,
  getUnrankedDates,
  rankAndSaveDate,
  saveIndustries,
} from "../lib/industriesDb.js";
import { log, requireEnv } from "../lib/screenerJob.js";

const PAUSE_MS = 160; // SEC allows 10 requests a second; stay well under it

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(cik, userAgent) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchSecSic(cik, userAgent);
    } catch (e) {
      if (attempt === 4 || ![429, 500, 502, 503, 504].includes(e.status)) throw e;
      await sleep(5_000 * attempt);
    }
  }
}

async function classify(pool, userAgent) {
  const [ciks, known, rated] = await Promise.all([
    fetchSecCiks(userAgent),
    getClassifiedTickers(pool),
    getLatestRatedTickers(pool),
  ]);
  if (!rated.length) throw new Error("No RS Ratings stored yet; run `npm run screener` first.");

  // Share classes share a CIK, so ask once per company.
  const byCik = new Map();
  for (const ticker of rated) {
    const cik = ciks.get(ticker);
    if (cik === undefined || known.has(ticker)) continue;
    if (!byCik.has(cik)) byCik.set(cik, []);
    byCik.get(cik).push(ticker);
  }
  if (!byCik.size) return log("Every rated company is already classified.");
  log(`Classifying ${byCik.size} companies, about ${Math.ceil((byCik.size * PAUSE_MS) / 60_000)} min.`);

  let done = 0;
  for (const [cik, tickers] of byCik) {
    const result = await fetchWithRetry(cik, userAgent);
    await saveIndustries(pool, tickers, result?.sic ?? null, result?.description ?? null);
    if (++done % 500 === 0) log(`${done}/${byCik.size} classified.`);
    await sleep(PAUSE_MS);
  }
  log(`${done} companies classified.`);
}

async function rank(pool) {
  const dates = await getUnrankedDates(pool, { all: process.argv.includes("--rerank") });
  if (!dates.length) return log("Group rankings are up to date.");
  const { scheme, resolve } = await loadResolver(pool);
  log(`Grouping by ${scheme === "ai" ? "the AI-assigned groups" : "SIC codes (no AI groups loaded)"}.`);
  for (const asOf of dates) {
    const ranked = await rankAndSaveDate(pool, asOf, resolve);
    if (asOf === dates[dates.length - 1]) {
      log(`${asOf}: ${ranked.length} groups ranked. Top 5: ${ranked.slice(0, 5).map((g) => `${g.rank}. ${g.name}`).join("; ")}.`);
    }
  }
  log(`Ranked ${dates.length} day(s).`);
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const userAgent = requireEnv("SEC_USER_AGENT");
  const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, keepAlive: true });
  pool.on("error", (e) => log(`Database connection error: ${e.message}`));
  try {
    await classify(pool, userAgent);
    await rank(pool);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
