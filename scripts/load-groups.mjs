// Loads classified companies into the stock_groups table. Each input file
// is JSON: { "TICKER": "Group name", ... } where the name is one from
// lib/industryTaxonomy.js (or "Unclassified"). Unknown names are reported
// and skipped. Afterwards run `npm run industries -- --rerank`.
//
//   node --env-file=.env.local scripts/load-groups.mjs <file.json> [more.json ...] [--dry-run]
//
// Needs DATABASE_URL.

import fs from "node:fs";
import pg from "pg";
import { TAXONOMY, UNRANKED } from "../lib/industryTaxonomy.js";
import { saveAssignments } from "../lib/industriesDb.js";
import { log, requireEnv } from "../lib/screenerJob.js";

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");
if (!files.length) {
  console.error("Usage: load-groups.mjs <file.json> [more.json ...] [--dry-run]");
  process.exit(1);
}

const valid = new Set([UNRANKED, ...Object.values(TAXONOMY).flat()]);
const tickers = [];
const names = [];
const unknown = new Map();
for (const file of files) {
  for (const [ticker, group] of Object.entries(JSON.parse(fs.readFileSync(file, "utf8")))) {
    if (valid.has(group)) {
      tickers.push(ticker);
      names.push(group);
    } else {
      unknown.set(group, (unknown.get(group) ?? 0) + 1);
    }
  }
}
for (const [group, n] of unknown) log(`Skipped ${n} ticker(s) with unknown group "${group}".`);
log(`${tickers.length} valid assignment(s) from ${files.length} file(s).`);

if (!dryRun && tickers.length) {
  const pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL"), ssl: { rejectUnauthorized: false } });
  try {
    for (let i = 0; i < tickers.length; i += 1000) {
      await saveAssignments(pool, tickers.slice(i, i + 1000), names.slice(i, i + 1000));
    }
    log("Saved. Now run: npm run industries -- --rerank");
  } finally {
    await pool.end();
  }
}
