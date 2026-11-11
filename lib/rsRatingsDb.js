// Storage for the daily RS Rating runs (db/0007_rs_ratings.sql).

const KEEP_DAYS = 60;
const LOCK_KEY = 717_017; // arbitrary, app-wide: only one ranking run at a time

export async function getLatestRun(pool) {
  const { rows } = await pool.query("SELECT as_of, universe, created_at FROM rs_runs ORDER BY as_of DESC LIMIT 1");
  return rows[0] ?? null;
}

export async function getRating(pool, ticker) {
  const { rows } = await pool.query(
    `SELECT r.as_of, r.score, r.rating, runs.universe
     FROM rs_ratings r JOIN rs_runs runs ON runs.as_of = r.as_of
     WHERE r.ticker = $1 ORDER BY r.as_of DESC LIMIT 1`,
    [ticker]
  );
  const row = rows[0];
  return row
    ? { asOf: row.as_of, score: parseFloat(row.score), rating: row.rating, universe: row.universe }
    : null;
}

// Rating history for one ticker, oldest first (for showing its trend).
export async function getRatingHistory(pool, ticker) {
  const { rows } = await pool.query("SELECT as_of, rating FROM rs_ratings WHERE ticker = $1 ORDER BY as_of", [ticker]);
  return rows.map((r) => ({ asOf: r.as_of, rating: r.rating }));
}

export async function saveRun(client, asOf, ratings) {
  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO rs_runs (as_of, universe) VALUES ($1, $2)
       ON CONFLICT (as_of) DO UPDATE SET universe = EXCLUDED.universe, created_at = now()`,
      [asOf, ratings.length]
    );
    await client.query("DELETE FROM rs_ratings WHERE as_of = $1", [asOf]);
    await client.query(
      `INSERT INTO rs_ratings (as_of, ticker, score, rating)
       SELECT $1, * FROM unnest($2::text[], $3::numeric[], $4::smallint[])`,
      [asOf, ratings.map((r) => r.ticker), ratings.map((r) => r.score), ratings.map((r) => r.rating)]
    );
    await client.query("DELETE FROM rs_runs WHERE as_of < $1::date - $2::int", [asOf, KEEP_DAYS]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

// Runs `fn(client)` only if no other ranking run holds the lock; returns
// false without waiting if one does.
export async function withRankingLock(pool, fn) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS locked", [LOCK_KEY]);
    if (!rows[0].locked) return false;
    try {
      await fn(client);
      return true;
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}
