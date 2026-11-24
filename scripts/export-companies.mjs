// Writes the companies still to be put into an industry group, one per
// line as "TICKER<TAB>Company name<TAB>SIC description", for classifying
// into lib/industryTaxonomy.js. Skips companies that already have a group
// (use --all for every rated company).
//
//   node --env-file=.env.local scripts/export-companies.mjs <output file> [--all]
//
// Needs DATABASE_URL and SEC_USER_AGENT.

import fs from "node:fs";
import pg from "pg";
import { fetchSecCompanyNames } from "../lib/secEdgar.js";
import { getAssignments, getLatestRatedTickers } from "../lib/industriesDb.js";
import { log, requireEnv } from "../lib/screenerJob.js";

const out = process.argv[2];
if (!out || out.startsWith("--")) {
  console.error("Usage: export-companies.mjs <output file> [--all]");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL"), ssl: { rejectUnauthorized: false } });
try {
  const [names, rated, assigned, { rows: sics }] = await Promise.all([
    fetchSecCompanyNames(requireEnv("SEC_USER_AGENT")),
    getLatestRatedTickers(pool),
    getAssignments(pool).catch(() => new Map()), // table may not exist yet
    pool.query("SELECT ticker, sic_description FROM stock_industries"),
  ]);
  const sicText = new Map(sics.map((r) => [r.ticker, r.sic_description]));
  const clean = (s) => String(s ?? "").replace(/[\t\r\n]+/g, " ").trim();
  const todo = rated
    .filter((t) => names.has(t)) // warrants and preferred shares were dropped from the universe
    .filter((t) => process.argv.includes("--all") || !assigned.has(t))
    .sort()
    .map((t) => `${t}\t${clean(names.get(t))}\t${clean(sicText.get(t))}`);
  fs.writeFileSync(out, todo.join("\n") + "\n");
  log(`${todo.length} companies written to ${out} (${rated.length} rated, ${assigned.size} already grouped).`);
} finally {
  await pool.end();
}
