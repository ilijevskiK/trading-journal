-- Each company's industry group from the AI classification (see
-- lib/industryTaxonomy.js and scripts/load-groups.mjs). The group name
-- must be one in the taxonomy, or 'Unclassified' for shells and funds.
-- Once any rows exist, the group ranking uses these instead of SIC codes.
-- Run once.
CREATE TABLE stock_groups
(
  ticker TEXT PRIMARY KEY,
  group_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
