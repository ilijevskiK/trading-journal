// Storage for the daily Composite Ratings (db/0011_composite.sql).

const KEEP_DAYS = 30;

export async function saveComposite(client, asOf, rows) {
  await client.query("BEGIN");
  try {
    await client.query("DELETE FROM composite_ratings WHERE as_of = $1", [asOf]);
    for (let i = 0; i < rows.length; i += 1000) {
      const chunk = rows.slice(i, i + 1000);
      await client.query(
        `INSERT INTO composite_ratings (as_of, ticker, composite, parts, info)
         SELECT $1, * FROM unnest($2::text[], $3::smallint[], $4::jsonb[], $5::jsonb[])`,
        [
          asOf,
          chunk.map((r) => r.ticker),
          chunk.map((r) => r.composite),
          chunk.map((r) => JSON.stringify(r.parts)),
          chunk.map((r) =>
            JSON.stringify({
              name: r.name,
              price: r.price,
              pctBelowHigh: r.pctBelowHigh,
              adBalance: r.adBalance,
              group: r.group ? { name: r.group.name, rank: r.group.rank, total: r.group.total } : null,
              facts: r.facts ?? null,
            })
          ),
        ]
      );
    }
    await client.query("DELETE FROM composite_ratings WHERE as_of < $1::date - $2::int", [asOf, KEEP_DAYS]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

// The latest day's ratings, best first, in a compact shape for the page, or
// null before the first run.
export async function getLatestComposite(pool) {
  const { rows: latest } = await pool.query("SELECT max(as_of) AS as_of FROM composite_ratings");
  const asOf = latest[0]?.as_of;
  if (!asOf) return null;
  const { rows } = await pool.query(
    "SELECT ticker, composite, parts, info FROM composite_ratings WHERE as_of = $1 ORDER BY composite DESC, ticker",
    [asOf]
  );
  return {
    asOf,
    stocks: rows.map((r) => ({
      ticker: r.ticker,
      composite: r.composite,
      eps: r.parts.eps ?? null,
      rs: r.parts.rs ?? null,
      smr: r.parts.smr ?? null,
      groupRating: r.parts.group ?? null,
      accDist: r.parts.accDist ?? null,
      nearHigh: r.parts.nearHigh ?? null,
      name: r.info.name ?? null,
      price: r.info.price ?? null,
      pctBelowHigh: r.info.pctBelowHigh ?? null,
      group: r.info.group ?? null,
      facts: r.info.facts ?? null,
    })),
  };
}
