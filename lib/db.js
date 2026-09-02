// Node.js-only — never import this from middleware.js or auth.config.js,
// which run on the Edge runtime and can't use the `pg` driver.
import { Pool } from "pg";

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
