-- Industry groups and their daily ranking for the Leading Groups page
-- (see lib/industries.js and scripts/run-industries.mjs). Shared by all
-- users, since it's market data. Run once; needs 0007_rs_ratings.sql.
--
-- stock_industries: each company's SEC SIC code. The group is worked out
-- in code from the SIC, so regrouping needs no migration. A row with a
-- NULL sic means the SEC lists none (so it isn't asked again).
CREATE TABLE stock_industries
(
  ticker TEXT PRIMARY KEY,
  sic SMALLINT,
  sic_description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- group_rankings: one row per group per trading day, ranked 1 (best) by the
-- median RS score of its stocks. Groups with too few stocks aren't ranked.
-- Only the last 400 days are kept, like the RS Ratings.
CREATE TABLE group_rankings
(
  as_of DATE NOT NULL,
  group_key TEXT NOT NULL,
  rank SMALLINT NOT NULL,
  members SMALLINT NOT NULL,
  median_score NUMERIC NOT NULL,
  median_rating SMALLINT NOT NULL,
  PRIMARY KEY (as_of, group_key)
);
CREATE INDEX group_rankings_group_idx ON group_rankings (group_key, as_of DESC);
