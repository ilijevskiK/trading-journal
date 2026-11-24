-- Composite Rating per stock per day (see lib/composite.js and
-- scripts/run-composite.mjs). Shared by all users, since it's market data.
-- `parts` holds the 1-99 ratings it was built from (rs, group, accDist,
-- nearHigh, and later eps and smr), `info` the display facts. Only the last
-- 30 days are kept. Run once; needs nothing earlier.
CREATE TABLE composite_ratings
(
  as_of DATE NOT NULL,
  ticker TEXT NOT NULL,
  composite SMALLINT NOT NULL,
  parts JSONB NOT NULL,
  info JSONB NOT NULL,
  PRIMARY KEY (as_of, ticker)
);
CREATE INDEX composite_ratings_rank_idx ON composite_ratings (as_of, composite DESC);
