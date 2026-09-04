# Project Context — Ledger (Trading Journal)

This file captures the reasoning behind the app's design, so an AI coding
assistant (or future-you) has the "why" behind the code, not just the code.

## Background / why this app exists

- User started trading individual stocks in March 2026, weeks-to-months
  holding period.
- Ran up ~30% gain, then gave almost all of it back, currently ~1.3%.
- Root causes identified in conversation:
  1. **Oversized positions** — buying ~20% of account per stock (e.g. IREN,
     Oklo, CTSH), leaving no room for a normal losing trade without major
     account damage.
  2. **Buying without understanding** — Oklo and CTSH bought at full size
     without a real thesis, unlike TSLA/AMZN/NOW which were at least
     understood businesses.
  3. **No profit-taking discipline** — not selling into strength, giving
     back gains on names that ran up.
  4. **No stop-loss discipline** — stops not set before entry, or moved
     against the plan under pressure.

## Design decisions baked into the app

- **Risk-first position sizing**: `positionSize = riskAmount / stopDistance%`.
  Encourages smaller size on volatile/uncertain names automatically, rather
  than relying on willpower.
- **Default risk per trade: 1–2%** of account (configurable in Settings,
  default 1.5%). This is a widely-used starting point for retail traders,
  not a guarantee of anything — user should adjust based on their own
  comfort as they get more data.
- **Default max position size: 15–25%** of account (configurable, default
  20%) — flags trades sized above this in the discipline checklist. Directly
  responds to the 20%-per-stock pattern that contributed to the drawdown.
- **Discipline checklist (5 checks per trade)**, deliberately mechanical
  rather than subjective:
  1. Thesis written (one sentence, forces articulation before buying)
  2. Stop-loss set
  3. Business understood (self-reported checkbox — intentionally not
     inferred, so the user can't fudge it)
  4. Stop not moved against the original plan
  5. Position sized within the account's own limit
- **Scale-out exit model** (thirds): sell ~1/3 at first target, move stop to
  breakeven, sell ~1/3 at second target or on technical weakness, trail the
  final third. Directly addresses "not taking profit at highs."
- **Real accounts, Postgres-backed** (originally: local-only `localStorage`,
  no backend, no accounts — see `ROADMAP.md` Phase 3 for why and how this
  changed). Sign-in is email-magic-link only, gated by an allowlist; each
  user's trades/settings/deposits live in their own Postgres rows. Export/
  reset still available in Settings.

## Worked example used to build/validate the exit-strategy logic

Trade: IREN, entry $41.42, 61.85 shares, July 13 2026.
- No stop was set at entry (retroactive gap identified in conversation) —
  stop decided after the fact at $38.00 (~8% below entry, "1R" = $3.42/share).
- Position size ~25.6% of a $10k account — over the 20% default limit,
  intentionally left flagged rather than "fixed" by changing settings.
- Scale-out plan calculated from entry/stop:
  - 1st exit at +2R ($48.26) — sell ~1/3, move stop to breakeven ($41.42)
  - 2nd exit at +4R ($55.10) or on technical breakdown — sell ~1/3
  - Final 1/3 trailed below a moving average (21-day or 50-day)
  - Separate thesis-invalidation trigger discussed: since the buy reason was
    "fundamentals + momentum" rather than deep conviction, a specific
    condition (e.g. "AI cloud contract momentum stalls") was recommended as
    an exit trigger independent of price.
- Explicit point made in conversation: an exit plan does not fix an
  oversized position — trimming to get under the size limit is a separate
  decision from setting price targets.

## Status

Everything originally listed here as "not yet built" — CSV import
(`lib/csvImport.js`, Trading212), per-trade tags, live unrealized P&L on
the dashboard (`computeBalanceSheet`), and the pre-mortem field on the
entry form — has since shipped. See `ROADMAP.md` for what's actually next
(currently: multi-user backend migration, in progress as of Phase 3).

## Reading list referenced in conversation (for context, not code)

O'Neil (*How to Make Money in Stocks*) → Minervini (*Trade Like a Stock
Market Wizard*) → Douglas (*Trading in the Zone*) → Lefèvre (*Reminiscences
of a Stock Operator*) → Covel/Clenow (trend-following) → Schwager (*Market
Wizards*) → Taleb (*Fooled by Randomness*). The discipline-checklist concept
in this app borrows directly from O'Neil's sell rules and Minervini's
risk-management emphasis.
