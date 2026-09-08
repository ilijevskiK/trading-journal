-- Memoir feature — an OpenRouter API key on user_settings (server-only,
-- never decrypted into anything sent to the client — see
-- lib/tradesDb.js's mapSettingsRow) and the table storing generated
-- chapters. Run this once against your Postgres database, after
-- 0001_init_auth.sql and 0002_app_tables.sql.

ALTER TABLE user_settings ADD COLUMN openrouter_api_key TEXT;

CREATE TABLE memoir_entries
(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  trade_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  patterns_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX memoir_entries_user_id_idx ON memoir_entries (user_id);
-- trade_ids: which closed trades this chapter covers, so future chapters
-- know what's already been narrated (see lib/memoirData.js's
-- selectTradesForChapter). patterns_detected: computed deterministically
-- in lib/memoirData.js's classifyTradePattern, not by the LLM — stored so
-- the label can never drift from the numbers actually narrated.
