# Roadmap — Ledger (Trading Journal)

Tracks the post-MVP roadmap developed from an audit of the app against its
own `PROJECT_CONTEXT.md` scope. Phases are ordered roughly by risk/effort —
lower first. Update this file as phases complete or the plan changes.

## Phase 1 — Close the loop on existing trade data ✅ done

No new architecture, just filling gaps in data/UI that already existed.

- Vitest test suite for `lib/calc.js` and `lib/csvImport.js`
- Max drawdown stat on the Dashboard (`lib/calc.js:maxDrawdown`)
- Wired up the previously-dead `tags` field: tag input on New Trade, tag
  chip editor on `TradeRow`, tag filter pills on Journal
- Pre-mortem field ("What would make you wrong?") next to the thesis field
- `/breakdowns` page: P&L, win rate, avg R by symbol / day-of-week / emotion

## Phase 2 — Deepen the review & discipline workflow ✅ done

- `/review` page: discipline-score and win-rate trend by month
  (`lib/calc.js:monthlyReviewTrend`), plus a month-by-month table
- "Cost of exiting early/late" postmortem stat under each closed trade's
  chart (`lib/calc.js:exitPostmortem`) — reuses candles the chart was
  already fetching 15 days past the exit date, no new API calls
- Trades can be linked to a Strategy from the existing Strategies content
  library, editable at entry or later from `TradeRow`; surfaced as a new
  "By strategy" table on `/breakdowns`

## Phase 3 — Durability & reach — decided, not started

Bigger architectural lift, not incremental fixes. The backend/auth decision
below is made — multi-device sync matters, and the app is expected to have
more than one real user (not single-user-forever, but not mass-scale
either). Everything else in this phase depends on it, so it goes first.

### Phase 3.1 — Auth — not started
- Auth.js (NextAuth v5) with a Postgres adapter.
- Sign-in via Google OAuth and/or email magic link — no passwords, so no
  hashing/reset-flow surface to build or secure. There's no separate signup
  form: the first successful sign-in creates the account via the adapter.
- Middleware protects every route except `/signin` and the auth callback
  routes.
- **Access control — allowlist.** An `allowed_emails` table (`email`,
  `added_at`) checked in Auth.js's `signIn` callback: anyone not on the list
  is rejected before an account is ever created — no pending/approval
  state, no account to "decline" after the fact. Managed by inserting rows
  directly via the Postgres SQL browser (no admin UI needed to start); a
  small `/admin` page to manage it is a later nice-to-have, not required for
  launch at this scale.

### Phase 3.2 — Database schema — not started
Postgres (Neon or Vercel Postgres). Auth.js's adapter owns `users`,
`accounts`, `sessions`, `verification_tokens`. App-owned tables on top:

```
user_settings
  user_id (PK, FK -> users.id)
  account_size, default_risk_percent, max_position_percent_allowed
  twelve_data_api_key (encrypted), finnhub_api_key (encrypted, nullable)
  onboarding_completed boolean default false
  created_at, updated_at

trades
  id (PK), user_id (FK, indexed)
  ticker, thesis, understood_business, entry_date, entry_price, stop_price,
  shares, target1, target2, emotion, notes, premortem,
  tags jsonb, strategy_id, account_size_at_entry,
  max_position_percent_allowed, stop_moved_against_plan, status
  created_at, updated_at

exits
  id (PK), trade_id (FK -> trades.id, cascade delete, indexed)
  date, price, shares, reason, created_at

deposits
  id (PK), user_id (FK, indexed)
  date, amount, created_at
```

Near 1:1 with today's trade object — `tags` stays a JSON array rather than
a normalized table, matching the current shape since there's no query need
to justify the join. Every query is scoped by `user_id` from the session;
Postgres row-level security policies are a good hardening add later, not
required to launch at this scale.

### Phase 3.3 — Onboarding gate — not started
After first sign-in, middleware checks `user_settings.onboarding_completed`.
If false, every route redirects to `/onboarding` — a locked-down version of
today's Settings form asking specifically for the **Twelve Data key** (plus
starting account size / risk defaults). Saving it sets
`onboarding_completed = true` and unlocks the rest of the app. Finnhub stays
optional, same as today — it only adds live watchlist ticks.

### Phase 3.4 — Server-backed data layer — not started
`contexts/TradesContext.js` already exposes one clean interface (`addTrade`,
`updateTrade`, `deleteTrade`, `addExit`, `removeExit`, `updateSettings`,
`addDeposit`, `removeDeposit`, `resetAll`, `importData`). Swap what's
*inside* those functions — from `localStorage.setItem` to authenticated API
route calls against the Phase 3.2 tables — without changing the function
signatures, so every consumer (`TradeRow`, `app/journal`, `app/page.js`,
`lib/calc.js`, etc.) needs zero changes.

### Phase 3.5 — Migration path for existing local data — not started
No separate migration script: the JSON export/import already in Settings
becomes the bridge. Export the current localStorage journal, sign in,
"Import journal from JSON" against the new API-backed `importData`.

### Phase 3.6 — Security hardening — not started
- Encrypt `twelve_data_api_key`/`finnhub_api_key` at rest (AES via a
  server-only secret env var) — they're moving from "never leaves your
  browser" to "stored in a shared database," a real trust-boundary change
  worth being explicit about.
- Auth.js handles CSRF/session security by default; Vercel gives HTTPS by
  default.

### Phase 3.7 — Cleanup — not started
Remove the old `localStorage` read/write effects once the DB-backed flow is
verified in production; update `README.md`/`PROJECT_CONTEXT.md` to describe
the new architecture.

### Still deferred, unchanged
- **PDF export** — currently only JSON export/import and CSV import exist;
  no polished, shareable report format.
- **Multi-account support** — tracking more than one brokerage
  account/portfolio separately within the same journal.
- **Share links** — a read-only link to show someone (e.g. a mentor) a
  specific trade or stats without giving them the whole app. Waits on 3.1–3.4
  since it basically requires the backend to exist first.

## Resuming Phase 3

Start at 3.1 (auth) — everything else in the phase depends on having a real
user/session to scope data to.
