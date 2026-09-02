-- Phase 3.1 — Auth.js adapter tables + the allowlist gate.
-- Run this once against your Postgres database (Vercel Postgres / Neon
-- console SQL editor, or `psql "$DATABASE_URL" -f db/0001_init_auth.sql`).

-- Exact schema required by @auth/pg-adapter — do not rename columns/tables.
CREATE TABLE verification_token
(
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE users
(
  id SERIAL,
  name VARCHAR(255),
  email VARCHAR(255),
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE accounts
(
  id SERIAL,
  "userId" INTEGER NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT,
  PRIMARY KEY (id)
);

-- Not read from while session.strategy is "jwt" (see auth.js) — kept for
-- adapter-interface compliance and in case database sessions are ever
-- switched on later.
CREATE TABLE sessions
(
  id SERIAL,
  "userId" INTEGER NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

-- Our own allowlist gate (not part of the Auth.js adapter contract) — see
-- lib/allowlist.js and the signIn callback in auth.js.
CREATE TABLE allowed_emails
(
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed your own email so you can actually sign in — replace before running:
-- INSERT INTO allowed_emails (email) VALUES ('ilijevski.k@gmail.com');
