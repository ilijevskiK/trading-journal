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

### Phase 3.1 — Auth — ✅ done, verified end-to-end
- Auth.js (NextAuth v5) with a Postgres adapter (Neon, created directly at
  neon.tech to avoid a card on file) — `auth.config.js` (edge-safe) +
  `auth.js` (full config), `middleware.js`, `app/api/auth/[...nextauth]/route.js`.
- Sign-in via email magic link only for this pass (Google OAuth deferred,
  trivial to add later given the split-config pattern) — `app/signin/page.js`
  + `app/signin/actions.js`. No separate signup form: the first successful
  sign-in creates the account via the adapter.
- Middleware protects every route except `/signin` — confirmed live: a real
  sign-in via Resend's magic link successfully created a session and landed
  back on `/`.
- Allowlist gate: `allowed_emails` table + `lib/allowlist.js`
  (`isEmailAllowed`, unit tested), checked in `auth.js`'s `signIn` callback —
  confirmed the allowlisted email passed through to Resend.
- `db/0001_init_auth.sql` has the adapter schema + `allowed_emails` table, run
  once against Neon via its SQL editor.
- `AUTH_EMAIL_FROM` is still Resend's sandbox sender (`onboarding@resend.dev`),
  which only delivers to the Resend account's own email — fine for solo
  testing, but a custom verified domain is required before inviting anyone
  else to sign in.
- Note for later: a Chrome-extension-only "Could not establish connection"
  console error showed up during testing — confirmed unrelated to the app
  (extension messaging noise, appears on any page).
- **Access control — allowlist.** An `allowed_emails` table (`email`,
  `added_at`) checked in Auth.js's `signIn` callback: anyone not on the list
  is rejected before an account is ever created — no pending/approval
  state, no account to "decline" after the fact. Managed by inserting rows
  directly via the Postgres SQL browser (no admin UI needed to start); a
  small `/admin` page to manage it is a later nice-to-have, not required for
  launch at this scale.

### Phase 3.2 — Database schema — ✅ done
`db/0002_app_tables.sql` ran against Neon — `user_settings`, `trades`,
`exits`, `deposits` all exist alongside the Phase 3.1 auth tables. IDs are
`SERIAL` integers (matching the adapter's own convention), every FK is
`ON DELETE CASCADE`. No app code changes yet — `TradesContext` keeps using
`localStorage` until Phase 3.4. One thing flagged for that phase:
`node-postgres` returns `NUMERIC` columns as strings, so the future query
layer will need `parseFloat(...)` before handing rows to `lib/calc.js`.

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

### Phase 3.3 — Onboarding gate — ✅ done, verified end-to-end
After first sign-in, middleware redirects every route to `/onboarding`
until `user_settings.onboarding_completed` is true — a locked-down version
of Settings asking for starting account size / risk defaults and the
**Twelve Data key** (required; Finnhub stays optional, same as today).
Verified live: an existing pre-Phase-3.3 session correctly got redirected
to onboarding (its token predates the flag); submitting without a Twelve
Data key showed the "enter your key" error and stayed put; submitting with
one landed on `/` and stuck across a reload with no re-login needed.

**Bug caught during that same testing, fixed:** `completeOnboarding` in
`app/onboarding/actions.js` originally ran a plain `UPDATE ... WHERE
user_id = $1`, assuming `ensureUserSettingsRow` (in `auth.js`'s `jwt`
callback, `trigger === "signIn"` branch) had already created the row. A
session that predates this table having a row for its user never
re-triggers `"signIn"` — so the `UPDATE` silently affected zero rows (no
error thrown) while `unstable_update()` still marked the session
"onboarded" regardless, making it *look* successful with nothing actually
in Postgres. Fixed by changing it to `INSERT ... ON CONFLICT (user_id) DO
UPDATE`, so the save is self-sufficient regardless of session history.

Key wiring detail worth remembering if this ever needs touching again:
`auth.config.js` (edge-safe) owns both the `session` callback (re-adds
`id`/`onboardingCompleted` onto `session.user`, since Auth.js's default
session shape strips both) and the `authorized` callback's redirect —
`middleware.js` builds its own separate `NextAuth(authConfig).auth`
instance, so anything defined only in `auth.js` never reaches it.
`unstable_update()` (from `auth.js`) rewrites the session cookie
server-side right after the onboarding write, with no `SessionProvider`
needed.

**Known temporary gap:** the Twelve Data/Finnhub keys entered here go
straight to Postgres `user_settings` — `/settings` still reads/writes
`localStorage` via `TradesContext` until Phase 3.4, so they won't show up
there yet, and editing them in Settings won't touch Postgres either.
Resolves once 3.4 swaps `TradesContext` over.

### Phase 3.4 — Server-backed data layer — ✅ done, verified live
`contexts/TradesContext.js`'s functions now call `contexts/tradesActions.js`
("use server") → `lib/tradesDb.js` (pure, pool-first-arg query/mapping
functions, unit tested) against Postgres, instead of `localStorage`. Three
consumers needed small `async`/`await` touch-ups (`app/new/page.js`,
`components/TradeRow.js`, `app/settings/page.js`) — the roadmap's original
"zero changes" framing wasn't quite literal once persistence became async.

Verified live: logging a new trade, Trading212 CSV import (confirmed
trades landed in Neon's `trades`/`exits` tables), Journal/Dashboard/
Breakdowns all rendering correctly from Postgres, editing Settings, adding
a deposit — each round-tripped and persisted across a reload.
`resetAll`/JSON-reimport-dedup/CSV-mid-import-rollback are code-reviewed
but not live-tested (the first is destructive against real data, not
worth risking to test manually).

Real bugs hit and fixed during this rollout, worth remembering:
- Ran `rm -rf .next` while the dev server was serving an active browser
  session — the browser's already-loaded JS referenced chunk hashes that
  no longer existed, surfacing as a client-side-navigation 404. Fixed by a
  hard reload. Lesson: don't clear `.next` while a dev server has an open
  browser tab attached.
- Separately, a dev server can get into a bad Fast-Refresh state after a
  lot of edits to files used by the root layout (`TradesContext.js` and
  everything it pulls in) — a hard *browser* reload doesn't fix a stale
  *server* compile. Fixed by fully restarting `npm run dev`.

### Phase 3.5 — Migration path for existing local data — ✅ done
The user's own pre-migration `localStorage` data (real trade history) was
recovered with a one-off browser-console script reading `tj_trades_v1`/
`tj_deposits_v1`/`tj_settings_v1` directly and downloading them as a JSON
file, then imported via Settings' "Import journal from JSON" — proving the
JSON-export-then-import bridge actually works end-to-end against the new
Postgres-backed `importData`. Now formalized in `README.md`'s "Recovering
data logged before accounts existed" section, so it's documented if this
app ever gets a second real user who needs the same recovery — no code
changes, this phase was documentation only.

### Phase 3.6 — Security hardening — ✅ done (API key encryption), verified live
`twelve_data_api_key`/`finnhub_api_key` are now AES-256-GCM encrypted at
rest (`lib/crypto.js`, Node's built-in `crypto`, no new dependency) — they'd
moved from "never leaves your browser" to "stored in a shared database" in
Phase 3.1, a real trust-boundary change now closed. Key is
`SETTINGS_ENCRYPTION_KEY` in `.env.local` (32 bytes, base64, generated via
`openssl rand -base64 32`) — losing it makes existing encrypted keys
permanently undecryptable, an accepted tradeoff for two easily-re-entered
optional keys, not worth building rotation/backup infra for.

No separate migration script was needed: `decrypt()` is lenient — a value
with no `enc:v1:` prefix is treated as legacy plaintext and passed through
unchanged, so the existing plaintext row kept working immediately and
self-healed the moment it was saved through Settings once. Verified live:
existing key displayed correctly before any change, "Save settings" once
re-wrote it as `enc:v1:...` in Neon, and it still displayed correctly
after that. Every write path that touches these columns was updated:
`lib/tradesDb.js`'s `updateSettings`/`resetAll`/`bulkImport`, and
`app/onboarding/actions.js`'s separate upsert (easy to miss since it
doesn't go through `lib/tradesDb.js` at all).

Auth.js handles CSRF/session security by default; Vercel gives HTTPS by
default — no further action needed there.

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
