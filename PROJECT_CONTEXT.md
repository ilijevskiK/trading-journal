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
- **Local-only data** (localStorage) — no backend, no accounts, nothing
  leaves the browser. Deliberate simplicity; export/reset available in
  Settings.

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

## Possible next steps (not yet built)

- CSV import for bulk-loading historical trades (March–July) instead of
  entering them one by one.
- Per-ticker notes/tags to spot sector-level patterns (e.g. "how do I do on
  momentum/AI names vs. established large caps").
- Optional current-price field on open trades to show unrealized P&L on the
  dashboard, not just realized.
- A simple "pre-mortem" field on the entry form: "What would make me wrong?"
  paired with the thesis field.

## Reading list referenced in conversation (for context, not code)

O'Neil (*How to Make Money in Stocks*) → Minervini (*Trade Like a Stock
Market Wizard*) → Douglas (*Trading in the Zone*) → Lefèvre (*Reminiscences
of a Stock Operator*) → Covel/Clenow (trend-following) → Schwager (*Market
Wizards*) → Taleb (*Fooled by Randomness*). The discipline-checklist concept
in this app borrows directly from O'Neil's sell rules and Minervini's
risk-management emphasis.


Market Data API

Finnhub (free tier) — chosen over Alpha Vantage/Twelve Data because:

60 requests/min free (vs. Alpha Vantage's 25/day)
20-min delayed data — fine for a journal, not live trading
Also provides fundamentals/earnings data for free

Caching strategy to stay well within free limits:

Closed trades: fetch once, cache indefinitely (DB or IndexedDB) — historical data never changes
Open trades: React Query with staleTime of 5–15 min for polling
Core Data Model (trade schema — starting point)
Trade {
  id
  symbol
  side: 'long' | 'short'
  status: 'open' | 'closed'
  entryDate, entryTime, entryPrice
  exitDate, exitTime, exitPrice (nullable if open)
  positionSize
  fees
  stopLoss, target (planned)
  strategyTag
  notes (free text)
  moodBefore, moodDuring, moodAfter (optional psychological tagging)
  ruleAdherence: boolean/checklist
  screenshots: []
  partialExits: []
}
Feature List
MVP
Trade logging (manual entry form + CSV import from broker export)
Auto-calculated metrics: P&L (gross/net), R-multiple, win rate, avg win/loss, expectancy, hold time
Dashboard: equity curve, P&L by symbol/strategy/day-of-week, win rate trend, max drawdown
Trade detail view with price chart (see below)
Trade Detail Chart Behavior
Closed trades ("postmortem" mode):
Candles from entry-padding to exit-padding
Entry/exit markers, stop-loss/target lines (planned vs. actual)
Extend chart range past the exit date — show what price did after closing (did they exit too early/late?)
Optional: user-added annotations on specific candles ("panicked here")
Computed stat: cost of exiting early/late (price movement in N days after exit)
Open trades (live-ish mode):
Candles from entry-padding to today, polling every 5–15 min
Entry marker + stop/target lines
Unrealized P&L vs. current price
No postmortem features yet (trade isn't finished)
High-value additions
Emotional/psychological tagging (mood, confidence, plan adherence)
Rule-adherence checklist per trade
Tag-based filtering across all stats
Weekly/monthly review view (best/worst trade, what to improve)
Aggregate "mistake" reports (e.g., avg. money left on table from early exits)
Nice-to-have
Position sizing calculator
Backtesting-lite (filter historical trades to test rule changes)
Multi-account support
PDF/CSV export
Read-only share link for individual trades
Architecture Notes
Keep marketData service layer separate from journal domain logic (API integration vs. core business logic)
status: 'open' | 'closed' field should drive which chart mode renders
Free-tier API limits change over time — verify current Finnhub docs before building against them