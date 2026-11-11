// Per-ticker CAN SLIM notes (db/0006_stock_notes.sql). Pure data access:
// no auth() here; contexts/stockNotesActions.js scopes every call to the
// signed-in user.

export async function getStockNote(pool, userId, ticker) {
  const { rows } = await pool.query("SELECT data FROM stock_notes WHERE user_id = $1 AND ticker = $2", [
    userId,
    ticker,
  ]);
  return rows[0]?.data ?? {};
}

// Merges `patch` into the stored object, so saving the pivot doesn't wipe
// the "something new" note and vice versa.
export async function saveStockNote(pool, userId, ticker, patch) {
  const { rows } = await pool.query(
    `INSERT INTO stock_notes (user_id, ticker, data) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, ticker)
     DO UPDATE SET data = stock_notes.data || EXCLUDED.data, updated_at = now()
     RETURNING data`,
    [userId, ticker, JSON.stringify(patch)]
  );
  return rows[0].data;
}
