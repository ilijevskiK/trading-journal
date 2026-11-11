-- CAN SLIM RS Ratings: every US-listed company ranked 1-99 on weighted
-- 12-month price performance, computed once per trading day (see
-- contexts/rsActions.js). Shared by all users, since it's market data.
-- Only the last 60 days of runs are kept. Run once; needs nothing earlier.

CREATE TABLE rs_runs
(
  as_of DATE PRIMARY KEY,
  universe INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rs_ratings
(
  as_of DATE NOT NULL REFERENCES rs_runs(as_of) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  score NUMERIC NOT NULL,
  rating SMALLINT NOT NULL,
  PRIMARY KEY (as_of, ticker)
);
CREATE INDEX rs_ratings_ticker_idx ON rs_ratings (ticker, as_of DESC);
