-- CAN SLIM screener (see scripts/run-screener.mjs). Shared by all users,
-- since it's market data. Run once; needs nothing earlier.
--
-- price_days: every US company's unadjusted daily bar, one row per trading
-- date with the values in arrays lined up by ticker (about a year is
-- kept). A date with empty arrays was a market holiday.
CREATE TABLE price_days
(
  date DATE PRIMARY KEY,
  tickers TEXT[] NOT NULL,
  closes REAL[] NOT NULL,
  highs REAL[] NOT NULL,
  volumes REAL[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One run per trading day: how many stocks survived each check, and the
-- ones that passed them all. Only the last 30 days of runs are kept.
CREATE TABLE screener_runs
(
  as_of DATE PRIMARY KEY,
  funnel JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE screener_results
(
  as_of DATE NOT NULL REFERENCES screener_runs(as_of) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  rs_rating SMALLINT NOT NULL,
  metrics JSONB NOT NULL,
  PRIMARY KEY (as_of, ticker)
);
