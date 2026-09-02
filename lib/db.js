// Node.js-only — never import this from middleware.js or auth.config.js,
// which run on the Edge runtime and can't use the `pg` driver.
import { Pool, types } from "pg";

// pg parses DATE columns (OID 1082) into JS Date objects by default — every
// date in this app (entryDate, exit date, deposit date) is stored/displayed
// as a plain 'YYYY-MM-DD' string everywhere (todayLocalDateStr(), date
// <input> values), so returning a Date and reformatting it risks a
// timezone off-by-one. Return the raw string instead.
types.setTypeParser(1082, (val) => val);

// Cached on globalThis so Next's dev-mode hot reload doesn't spin up a new
// pool (and leak connections) on every file change.
const globalForPg = globalThis;

const pool =
  globalForPg._pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._pgPool = pool;
}

export default pool;
