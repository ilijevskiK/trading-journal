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
- **Local-only data** — everything is stored in your browser's
  localStorage. Nothing leaves your machine. Export/reset available in
  Settings.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploying

This is a standard Next.js app — it deploys as-is to Vercel, Netlify, or any
Node host:

```bash
npm run build
npm run start
```

Or push it to a GitHub repo and import it in Vercel with zero configuration.

## Data model

Trades are stored as plain objects with fields like `ticker`, `thesis`,
`entryPrice`, `stopPrice`, `shares`, `exits` (an array of partial exits), and
a few discipline flags (`understoodBusiness`, `stopMovedAgainstPlan`). See
`lib/calc.js` for all the derived math (P&L, R-multiples, discipline scoring,
equity curve) — it's plain, commented JS if you want to tweak the rules to
match your own system.

## Note

This tool helps you see your own patterns — it doesn't give trading advice,
and none of the defaults (1–2% risk, 15–25% max position size, etc.) are
guarantees of anything. Treat it as a mirror, not an oracle.
