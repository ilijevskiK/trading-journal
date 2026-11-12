# Changelog

All notable changes to this project are documented here.

## Unreleased

- **CAN SLIM Screener** — a new first tile in the CAN SLIM hub. Every
  trading day, every US company is run through the price checks: $15+,
  at least $10M traded a day, RS Rating 80+ and within 15% of its 52-week
  high. The page shows how many stocks survived each step and the ones
  that passed, linked to their C/A/N/S/L/I pages. Built by a daily GitHub
  Action (`scripts/run-screener.mjs`) that keeps a year of prices in the
  database, adjusted for stock splits, and now also builds the daily RS
  Ratings, so the Leadership page no longer waits for them. Needs
  `db/0008_screener.sql` and three repository secrets (see README).
- **Tag trades as CAN SLIM** — "CAN SLIM" is now an option in the
  strategy dropdown on New Trade and in each Journal trade, linking to the
  CAN SLIM hub; Breakdowns' "By strategy" groups those trades under it.
- **RS Rating** — the Leadership (L) page now shows O'Neil's RS Rating
  (1-99): weighted 12-month performance ranked against every SEC-listed
  US company, rebuilt once per trading day from Massive's free
  all-stocks daily prices. 80+ passes, 70-79 warns, below 70 fails. Needs
  `MASSIVE_API_KEY` and `db/0007_rs_ratings.sql`.
- **CAN SLIM: S, L and I** — every letter now has its own tile and page.
  Supply & Demand: up- vs down-day volume, share count vs a year ago,
  debt vs equity. Leadership: weighted 12-month performance vs the S&P
  500 and the RS line. Institutions: a saved checklist (fund count trend,
  quality buyers, over-owned). Every letter page links to the others for
  the same ticker.
- **CAN SLIM: New Highs (N)** — its own tile and page: distance from the
  52-week high, and once you enter a pivot, the base's depth and length,
  volume drying up, breakout-day volume and whether price is still in the
  +5% buy range. Tick "something new" with a note; the pivot and note are
  saved per ticker. Run `db/0006_stock_notes.sql` to enable saving.
- **CAN SLIM: Annual Earnings (A)** — its own tile and page: EPS up each of the last three fiscal years at 25%+ a year,
  return on equity 17%+, and operating cash flow vs earnings, with a
  table and an EPS-by-year chart. Quarterly and annual EPS are now
  adjusted for stock splits.
- **CAN SLIM: Current Earnings (C)** — a new tile in the CAN SLIM hub. Enter a
  ticker to see its last four quarters from SEC EDGAR filings (EPS and
  sales vs a year ago, net margin) with a strong / pass / warning / fail
  verdict for current quarterly earnings. Needs `SEC_USER_AGENT` set.
- **CAN SLIM: Market Status** — the Strategies tile now opens a CAN SLIM
  hub (tiles plus the seven letters). Its Market Status tile is the market
  direction check (the "M"): overall status with plain-language reasons,
  plus S&P 500, Nasdaq, Dow and Russell 2000 charts with 50/200-day
  averages, distribution and stalling days, follow-through days (and
  failed ones) marked, and a band showing the status over time. Uses ETF
  prices (SPY, QQQ, DIA, IWM) from Twelve Data.
- **Removed Review** — the monthly discipline/win-rate trend page and its
  tile. The Journal's date-range filters cover the same analysis.
- **New home screen** — after signing in you land on a grid of tiles (one
  per section, icon plus name) with no sidebar. The dashboard moved to
  `/dashboard`. The sidebar is gone from every page; each page has a
  "← Home" button back to the tiles instead.
- **Removed Memoir** — the AI-written chapters section, its Settings
  entry (OpenRouter API key) and its nav link are gone. Run
  `db/0005_drop_memoir.sql` to drop the leftover `memoir_entries` table
  and `openrouter_api_key` column (this deletes saved chapters).

## v1.2.0

- **Memoir** — a new section that writes an AI-generated, first-person
  reflective chapter on your closed trades, on demand (a "Write next
  chapter" button, not automatic). Each chapter covers up to 10
  not-yet-covered closed trades, oldest first.
  - Every number the chapter cites — how much of a peak gain was given
    back during the hold, how far a price has run since you exited — is
    computed by this app in plain code first, using real Twelve Data
    price history/quotes. The AI is instructed to only narrate those
    already-verified numbers, never invent or estimate its own; which
    trades classify as "gave back" vs. "sold early" is also decided by
    fixed thresholds in code, not by the model.
  - Uses OpenRouter (a free-tier model by default) — a new, optional API
    key in Settings. The key is encrypted and used only server-side,
    unlike the market-data keys, which are also used client-side.
  - Chapters are numbered and read front-to-back; a "Contents" list at
    the top links straight to each one, plus a back-to-top button once
    you've scrolled down a chapter.
- Centered the narrow-content pages (Memoir, Settings, New Trade, and the
  S&P 500/Books/Strategies/Indicators detail pages) — they were sitting
  flush-left with unused space on wide screens.

## v1.1.0

- **Hold time tracking** — every trade in the Journal now shows how many
  days it's been held (or was held, for closed trades). Breakdowns gets a
  new "Hold time: winners vs. losers" comparison, a direct check for the
  disposition effect (holding losers longer than winners).
- **S&P 500 section** — a new nav item listing all current S&P 500
  constituents, grouped into Mega/Large/Mid cap tiers with a sector
  filter. Constituent data is a static, sourced snapshot (see the
  "as of" date on the page), not live.
- **Company snapshot page** — clicking a ticker on the S&P 500 page opens
  a dedicated page (`/sp500/[ticker]`, with a back link to the list)
  showing, via Finnhub's free tier:
  - Valuation: market cap, trailing P/E, P/B, P/S, beta, current ratio,
    debt/equity, book value/share, 52-week range.
  - Margins & growth: gross/operating/net margin, revenue and EPS growth
    (YoY).
  - Analyst recommendations (buy/hold/sell counts, most recent period).
  - Peer tickers (linked, so you can jump between related companies).
  - Recent news headlines (last 14 days).
  - Last 4 quarters of earnings (actual vs. estimate, surprise %).

  Requires a Finnhub API key (free tier, set in Settings). Results are
  cached for 24 hours per ticker since fundamentals don't change
  intraday.
- Added a version number to the sidebar, below the app title.

## v1.0.0

Initial release — pre-trade checklist, position-size calculator, partial
exits, discipline scoring, dashboard analytics, and account-based storage
(Google sign-in, Postgres, encrypted API keys). See `ROADMAP.md` for the
migration history off `localStorage`.
