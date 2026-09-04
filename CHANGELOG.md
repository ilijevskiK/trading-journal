# Changelog

All notable changes to this project are documented here.

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
