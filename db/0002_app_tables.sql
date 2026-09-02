-- Phase 3.2 — the app's own tables (user_settings, trades, exits, deposits).
-- Run this once against your Postgres database, after 0001_init_auth.sql
-- (these tables reference users.id from the Auth.js adapter schema).

CREATE TABLE user_settings
(
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_size NUMERIC NOT NULL DEFAULT 0,
  default_risk_percent NUMERIC NOT NULL DEFAULT 1.5,
  max_position_percent_allowed NUMERIC NOT NULL DEFAULT 20,
  twelve_data_api_key TEXT,
  finnhub_api_key TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- twelve_data_api_key / finnhub_api_key are stored plain for now — Phase
-- 3.6 (Security hardening) adds app-layer encryption before this table
-- holds anything real.

CREATE TABLE trades
(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  thesis TEXT NOT NULL DEFAULT '',
  understood_business BOOLEAN NOT NULL DEFAULT false,
  entry_date DATE NOT NULL,
  entry_price NUMERIC NOT NULL,
  stop_price NUMERIC,
  shares NUMERIC NOT NULL,
  target1 NUMERIC,
  target2 NUMERIC,
  emotion TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  premortem TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  strategy_id TEXT,
  account_size_at_entry NUMERIC,
  max_position_percent_allowed NUMERIC,
  stop_moved_against_plan BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trades_user_id_idx ON trades (user_id);
CREATE INDEX trades_user_id_ticker_idx ON trades (user_id, ticker);
CREATE INDEX trades_user_id_status_idx ON trades (user_id, status);
-- stop_price / target1 / target2 / account_size_at_entry /
-- max_position_percent_allowed are nullable: CSV-imported trades
-- genuinely don't have these (see app/settings/page.js's Trading212
-- import note), and target1/target2 are already optional in the New
-- Trade form today.

CREATE TABLE exits
(
  id SERIAL PRIMARY KEY,
  trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  shares NUMERIC NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exits_trade_id_idx ON exits (trade_id);

CREATE TABLE deposits
(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX deposits_user_id_idx ON deposits (user_id);
