# Ledger — A Discipline-First Trading Journal

A personal Next.js trading journal built around one idea: most trading
mistakes aren't stock-picking mistakes, they're process mistakes (no thesis,
no stop, oversized positions, moved stops, no profit-taking plan). This app
logs your trades and turns those specific habits into visible numbers.

## Features

- **Pre-trade checklist** — thesis, stop-loss, position size, targets — filled
  in *before* you can log a trade.
- **Position-size calculator** — enter your account size, risk tolerance,
  entry, and stop; it tells you exactly how many shares keep your risk in
  line, and flags trades sized above your own limit.
- **Partial exits** — log scaling out in thirds (or however you exit),
  matching the "sell into strength" approach rather than all-or-nothing.
- **Discipline score** — a 0–100 score per trade and overall, tracking
  whether you actually followed your own rules (thesis written, stop set,
  business understood, stop not moved, size within limit).
- **Dashboard analytics** — win rate, average R-multiple, expectancy,
  equity curve, R-multiple distribution, and a "trades to review" list that
  surfaces exactly which rule you broke on your worst trades.
- **Your own account** — sign in via Google (an allowlist gates who can
  create one). Data is stored per-account in Postgres, not the
  browser — see `ROADMAP.md` Phase 3 for how this replaced the original
  `localStorage`-only design. API keys are encrypted at rest.

## Getting started

1. Copy `.env.example` to `.env.local` and fill in every value — you'll
   need a Postgres database (Neon works well, free tier, no card
   required) and a Google OAuth client (Google Cloud Console → APIs &
   Services → Credentials → OAuth client ID, type "Web application",
   with `http://localhost:3000/api/auth/callback/google` as an Authorized
   redirect URI — add your production URL's equivalent once deployed).
   `AUTH_SECRET`/`SETTINGS_ENCRYPTION_KEY` are just generated secrets
   (`npx auth secret` / `openssl rand -base64 32`).
2. Run `db/0001_init_auth.sql`, then `db/0002_app_tables.sql` (in that
   order — the second references tables the first creates) against your
   Postgres database, e.g. via Neon's SQL editor.
3. Seed your own email into the `allowed_emails` table — nobody can sign
   in otherwise (see the commented `INSERT` at the bottom of
   `db/0001_init_auth.sql`).
4. ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:3000, sign in, and complete the one-time
   onboarding step (it asks for a Twelve Data API key — free tier, see
   Settings for the signup link).

## Deploying

This is a standard Next.js app — it deploys as-is to Vercel, Netlify, or any
Node host, but **isn't zero-configuration** anymore: every var in
`.env.example` needs to be set in your host's environment, pointing at a
real (already-migrated) Postgres database.

```bash
npm run build
npm run start
```

## Data model

Trades/exits/deposits/settings live in Postgres (`db/0002_app_tables.sql`
has the exact schema), scoped per user via the session from Auth.js.
`lib/tradesDb.js` is the JS↔SQL boundary — mapping snake_case columns to
the camelCase shape the rest of the app uses (`ticker`, `thesis`,
`entryPrice`, `stopPrice`, `shares`, `exits`, discipline flags like
`understoodBusiness`/`stopMovedAgainstPlan`), and transparently
encrypting/decrypting the two API-key fields (`lib/crypto.js`). Everything
downstream — `contexts/TradesContext.js` and every page/component — still
works with the same plain JS objects as before; only the persistence layer
changed. See `lib/calc.js` for all the derived math (P&L, R-multiples,
discipline scoring, equity curve) — it's plain, commented JS if you want to
tweak the rules to match your own system.

## Recovering data logged before accounts existed

Early on, this app stored everything in the browser's own `localStorage` —
no sign-in, no database. That's no longer true (see `ROADMAP.md` Phase 3),
but if you have trades from that era trapped in an old browser profile,
here's how to bring them into your account:

1. Open that browser, on this site, and open DevTools → **Console**.
2. Paste and run:
   ```js
   (function () {
     const trades = JSON.parse(localStorage.getItem("tj_trades_v1") || "[]");
     const deposits = JSON.parse(localStorage.getItem("tj_deposits_v1") || "[]");
     const settings = JSON.parse(localStorage.getItem("tj_settings_v1") || "{}");
     const { twelveDataApiKey, finnhubApiKey, ...settingsWithoutKey } = settings;
     const blob = new Blob(
       [JSON.stringify({ trades, deposits, settings: settingsWithoutKey }, null, 2)],
       { type: "application/json" }
     );
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `trading-journal-localstorage-export-${new Date().toISOString().slice(0, 10)}.json`;
     a.click();
     URL.revokeObjectURL(url);
   })();
   ```
3. Sign in to your account, then **Settings → Import journal from JSON**
   and pick the downloaded file. Each trade gets inserted as a new row
   (ids aren't preserved) — only run this once per file, since re-importing
   the same file duplicates everything (no dedup — see `ROADMAP.md` Phase
   3.4 for why).

This was used once already, for the original single-browser data this app
started with — kept here for reference in case it's ever needed again.

## Note

This tool helps you see your own patterns — it doesn't give trading advice,
and none of the defaults (1–2% risk, 15–25% max position size, etc.) are
guarantees of anything. Treat it as a mirror, not an oracle.
