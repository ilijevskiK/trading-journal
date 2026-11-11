-- Per-ticker notes for the CAN SLIM pages — what you've confirmed by hand
-- about a stock (the "something new" behind N, your pivot price), kept as
-- one JSON object per user and ticker so later letters can add fields
-- without another migration. Run once; it only needs the users table from
-- 0001, not 0005.

CREATE TABLE stock_notes
(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticker)
);
