// Storage for the SEC fundamentals summaries (db/0012_fundamentals.sql).

// Map(ticker -> summary) for every company that has one.
export async function getFundamentals(pool) {
  const { rows } = await pool.query("SELECT ticker, data FROM fundamentals WHERE data IS NOT NULL");
  return new Map(rows.map((r) => [r.ticker, r.data]));
}

// Map(cik -> updated_at ms) for every company already asked about.
export async function getFundamentalsAges(pool) {
  const { rows } = await pool.query("SELECT cik, max(updated_at) AS at FROM fundamentals GROUP BY cik");
  return new Map(rows.map((r) => [Number(r.cik), new Date(r.at).getTime()]));
}

// One company's summary saved for each of its tickers (share classes).
export async function saveFundamentals(pool, tickers, cik, data) {
  await pool.query(
    `INSERT INTO fundamentals (ticker, cik, data)
     SELECT t, $2, $3::jsonb FROM unnest($1::text[]) AS t
     ON CONFLICT (ticker) DO UPDATE SET cik = EXCLUDED.cik, data = EXCLUDED.data, updated_at = now()`,
    [tickers, cik, data ? JSON.stringify(data) : null]
  );
}
