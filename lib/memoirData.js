// Server-side data gathering for the Memoir feature — selecting which
// closed trades go into the next chapter, and fetching the market data
// needed to judge them (peak price during the hold, current price since
// exit). Twelve Data calls happen here, not in a React hook, because this
// runs inside a server action (contexts/memoirActions.js), looping over
// potentially many trades at once rather than rendering one trade's chart.
//
// Free tier is capped at 8 requests/min (see lib/marketData.js) and there's
// no existing throttle utility in this app — hooks/useLiveQuotes.js's
// concurrent Promise.all relies entirely on a browser-only localStorage
// cache to stay under that limit, which doesn't exist server-side. So this
// module throttles for real: strictly sequential, fixed spacing. A manual
// "write next chapter" click doesn't need speed; staying under the rate
// limit does need correctness.

import { fetchDailyCandles, fetchQuote } from "./marketData";
import {
  isFullyClosed,
  lastExitDate,
  peakDuringHold,
  soldTooEarly,
  realizedPnl,
  rMultiple,
  holdDays,
} from "./calc";

// Bounds a single generation run so it comfortably finishes inside a
// serverless function's duration limit (see app/memoir/page.js's
// `maxDuration`). Not a hard architectural limit — raise it if your
// hosting timeout allows more headroom.
export const MAX_TRADES_PER_CHAPTER = 10;

const REQUEST_SPACING_MS = 8000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Closed trades not yet covered by any past chapter, oldest-uncovered
// first — a memoir reads chronologically, and this lets a backlog get
// worked through in order rather than always grabbing the newest handful
// and never catching up on an older one.
function uncoveredClosedTrades(trades, alreadyCoveredIds) {
  const covered = new Set(alreadyCoveredIds);
  return trades
    .filter((t) => isFullyClosed(t) && !covered.has(t.id))
    .sort((a, b) => (lastExitDate(a) || "").localeCompare(lastExitDate(b) || ""));
}

// Capped at MAX_TRADES_PER_CHAPTER — this is what actually gets sent into
// a single chapter generation run.
export function selectTradesForChapter(trades, alreadyCoveredIds) {
  return uncoveredClosedTrades(trades, alreadyCoveredIds).slice(0, MAX_TRADES_PER_CHAPTER);
}

// Uncapped count, for the UI to know upfront whether there's anything new
// to write about — without this, a user only finds out by clicking
// "Write next chapter" and getting an error back.
export function countUncoveredTrades(trades, alreadyCoveredIds) {
  return uncoveredClosedTrades(trades, alreadyCoveredIds).length;
}

async function gatherTradeFacts(trade, apiKey) {
  const exitDate = lastExitDate(trade);

  const candlesRes = await fetchDailyCandles({
    symbol: trade.ticker,
    apiKey,
    startDate: trade.entryDate,
    endDate: exitDate,
  });
  await sleep(REQUEST_SPACING_MS);

  const quoteRes = await fetchQuote({ symbol: trade.ticker, apiKey });
  await sleep(REQUEST_SPACING_MS);

  return {
    tradeId: trade.id,
    ticker: trade.ticker,
    thesis: trade.thesis,
    entryDate: trade.entryDate,
    entryPrice: trade.entryPrice,
    exitDate,
    realizedPnl: realizedPnl(trade),
    rMultiple: rMultiple(trade),
    holdDays: holdDays(trade),
    peak: candlesRes.candles.length ? peakDuringHold(trade, candlesRes.candles) : null,
    soldEarly: quoteRes.price != null ? soldTooEarly(trade, quoteRes.price) : null,
  };
}

// Sequential on purpose — see REQUEST_SPACING_MS above. A single trade's
// fetch failure (bad ticker, momentary Twelve Data error) just yields a
// fact with peak/soldEarly as null rather than failing the whole batch;
// lib/memoirPrompt.js already omits whatever dimensions are missing.
export async function gatherMemoirFacts(trades, apiKey) {
  const facts = [];
  for (const trade of trades) {
    facts.push(await gatherTradeFacts(trade, apiKey));
  }
  return facts;
}

// Deterministic classification, computed from the same numbers handed to
// the prompt — never left for the LLM to label itself, so the stored
// pattern can never drift from the prose that was actually generated.
// Thresholds are starting defaults, not fitted to any real trade history —
// tune freely once you see them against your own trades.
const GIVE_BACK_THRESHOLD_POINTS = 15;
const SOLD_EARLY_THRESHOLD_PERCENT = 15;

export function classifyTradePattern(fact) {
  if (fact.peak && fact.peak.giveBackPoints >= GIVE_BACK_THRESHOLD_POINTS) return "gave_back";
  if (fact.soldEarly && fact.soldEarly.runSincePercent >= SOLD_EARLY_THRESHOLD_PERCENT) return "sold_early";
  return "neutral";
}
