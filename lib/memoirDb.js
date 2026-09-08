// Query/mapping functions for memoir_entries — mirrors lib/tradesDb.js's
// conventions (pool passed as first arg, snake_case<->camelCase mapping,
// no auth() calls here; contexts/memoirActions.js is the thin "use server"
// layer that checks the session).

function mapMemoirRow(row) {
  return {
    id: row.id,
    chapterNumber: row.chapter_number,
    title: row.title,
    content: row.content,
    tradeIds: row.trade_ids || [],
    patternsDetected: row.patterns_detected || [],
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at,
  };
}

// Ascending (chapter 1 first) — a memoir reads front-to-back, not
// newest-first.
export async function listChapters(pool, userId) {
  const { rows } = await pool.query(
    "SELECT * FROM memoir_entries WHERE user_id = $1 ORDER BY chapter_number ASC",
    [userId]
  );
  return rows.map(mapMemoirRow);
}

// chapter_number is computed by the caller (previousChapters.length + 1),
// not in SQL — a double-click race is a known, accepted simplification for
// a single-user app with a disabled-while-generating button.
export async function insertChapter(pool, userId, chapter) {
  const { rows } = await pool.query(
    `INSERT INTO memoir_entries
       (user_id, chapter_number, title, content, trade_ids, patterns_detected, model, input_tokens, output_tokens)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      userId,
      chapter.chapterNumber,
      chapter.title,
      chapter.content,
      JSON.stringify(chapter.tradeIds || []),
      JSON.stringify(chapter.patternsDetected || []),
      chapter.model,
      chapter.inputTokens ?? null,
      chapter.outputTokens ?? null,
    ]
  );
  return mapMemoirRow(rows[0]);
}
