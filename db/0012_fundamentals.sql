-- Each company's earnings, sales, margin and ROE summary from its SEC
-- filings, for the Composite Screener's EPS Rating and SMR (see
-- lib/fundamentals.js and scripts/run-fundamentals.mjs). `data` is NULL for
-- companies with no usable US GAAP filings (so they aren't asked again until
-- they go stale). Run once; needs nothing earlier.
CREATE TABLE fundamentals
(
  ticker TEXT PRIMARY KEY,
  cik BIGINT NOT NULL,
  data JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
