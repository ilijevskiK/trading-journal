// Core calculation helpers for the trading journal.
// All money math is plain JS numbers (fine for a personal journal; not for
// accounting-grade precision). Percentages are stored as whole numbers (e.g. 2 = 2%).

export function round(n, decimals = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return 0;
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// `new Date().toISOString().slice(0, 10)` converts to UTC first — near
// midnight in any UTC+ timezone (e.g. just after midnight CEST), UTC is
// still "yesterday", silently producing a date one calendar day behind the
// user's actual wall-clock today. This reads the browser's local date
// fields directly instead, matching the plain "YYYY-MM-DD" trade/exit dates
// used everywhere else in this app.
export function todayLocalDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Suggested position size given account size, risk % tolerance, entry & stop.
export function suggestedPosition({ accountSize, riskPercent, entryPrice, stopPrice }) {
  const riskAmount = accountSize * (riskPercent / 100);
  const stopDistancePercent = entryPrice > 0 ? Math.abs(entryPrice - stopPrice) / entryPrice : 0;
  if (stopDistancePercent === 0) {
    return { riskAmount, stopDistancePercent: 0, positionValue: 0, shares: 0 };
  }
  const positionValue = riskAmount / stopDistancePercent;
  const shares = entryPrice > 0 ? Math.floor(positionValue / entryPrice) : 0;
  return {
    riskAmount: round(riskAmount),
    stopDistancePercent: round(stopDistancePercent * 100, 2),
    positionValue: round(positionValue),
    shares,
  };
}

// Realized P&L for a trade based on its exits array: [{ price, shares }]
export function realizedPnl(trade) {
  const exits = trade.exits || [];
  return exits.reduce((sum, e) => sum + (e.price - trade.entryPrice) * e.shares, 0);
}

export function sharesExited(trade) {
  return (trade.exits || []).reduce((sum, e) => sum + Number(e.shares || 0), 0);
}

export function sharesRemaining(trade) {
  return Math.max(0, Number(trade.shares || 0) - sharesExited(trade));
}

export function riskAmountForTrade(trade) {
  return Math.abs(trade.entryPrice - trade.stopPrice) * trade.shares;
}

export function rMultiple(trade) {
  const risk = riskAmountForTrade(trade);
  if (!risk) return 0;
  return realizedPnl(trade) / risk;
}

export function isFullyClosed(trade) {
  return sharesRemaining(trade) <= 0 && (trade.exits || []).length > 0;
}

// The date a trade became fully closed — its last exit's date, or null if
// it has no exits yet.
export function lastExitDate(trade) {
  const exits = trade.exits || [];
  if (!exits.length) return null;
  return exits.reduce((latest, e) => (e.date > latest ? e.date : latest), exits[0].date);
}

export function positionValue(trade) {
  return trade.entryPrice * trade.shares;
}

// Total cost basis committed across a set of trades (entry price × shares)
// — the denominator for "return on capital deployed" over a filtered set,
// as opposed to return on total account size.
export function capitalDeployed(trades) {
  return trades.reduce((sum, t) => sum + (Number(t.entryPrice) || 0) * (Number(t.shares) || 0), 0);
}

export function riskPercentOfAccount(trade) {
  if (!trade.accountSizeAtEntry) return 0;
  return (riskAmountForTrade(trade) / trade.accountSizeAtEntry) * 100;
}

// Discipline checklist score for a single trade (0-100).
// Checks the habits discussed: thesis written, stop set, business understood,
// stop never moved against you, position sized within account-size discipline.
export function disciplineChecks(trade) {
  const checks = {
    hasThesis: Boolean(trade.thesis && trade.thesis.trim().length > 0),
    hasStop: trade.stopPrice !== null && trade.stopPrice !== undefined && trade.stopPrice !== "",
    understoodBusiness: Boolean(trade.understoodBusiness),
    stopNotMoved: !trade.stopMovedAgainstPlan,
    sizedWithinLimit: trade.accountSizeAtEntry
      ? positionValue(trade) / trade.accountSizeAtEntry <= (trade.maxPositionPercentAllowed || 25) / 100
      : true,
  };
  const total = Object.keys(checks).length;
  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, score: round((passed / total) * 100, 0) };
}

export function overallDisciplineScore(trades) {
  if (!trades.length) return 0;
  const scores = trades.map((t) => disciplineChecks(t).score);
  return round(scores.reduce((a, b) => a + b, 0) / scores.length, 0);
}

// Trades relevant to [from, to] (inclusive "YYYY-MM-DD" strings — either
// bound may be null/empty for open-ended), each judged by whichever date
// actually happened: a still-open trade is dated by when it was *entered*
// (it doesn't have a close date yet), a fully-closed trade by when it was
// *closed* (its entry could be long before the period). Used by the
// Journal page's date-range filter, so "Open" + "Last Month" means "opened
// last month" and "Closed" + "Last Month" means "closed last month".
export function filterTradesByPeriod(trades, from, to) {
  return trades.filter((t) => {
    const date = isFullyClosed(t) ? lastExitDate(t) : t.entryDate;
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

// Aggregate performance stats across closed (or partially closed) trades.
export function computeStats(trades) {
  const withRealized = trades.filter((t) => (t.exits || []).length > 0);
  const closed = trades.filter((t) => isFullyClosed(t));

  const pnls = withRealized.map((t) => realizedPnl(t));
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);

  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const winRate = withRealized.length ? (wins.length / withRealized.length) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const rMultiples = withRealized.map((t) => rMultiple(t));
  const avgR = rMultiples.length ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;

  const lossRate = withRealized.length ? losses.length / withRealized.length : 0;
  const winRateFraction = withRealized.length ? wins.length / withRealized.length : 0;
  const expectancy = winRateFraction * avgWin + lossRate * avgLoss; // avgLoss is negative

  return {
    totalTrades: trades.length,
    tradesWithExits: withRealized.length,
    closedTrades: closed.length,
    openTrades: trades.length - closed.length,
    totalPnl: round(totalPnl),
    winRate: round(winRate, 1),
    avgWin: round(avgWin),
    avgLoss: round(avgLoss),
    avgR: round(avgR, 2),
    expectancy: round(expectancy),
  };
}

// Sum of all logged deposits — capital contributed on top of the starting
// account size (see currentAccountSize below and Settings' "Add funds").
export function totalDeposited(deposits) {
  return (deposits || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
}

// The account size to actually size positions/value cash against right now:
// the original starting size plus everything deposited since. Deliberately
// excludes trading P&L (tracked separately as `realized`/the equity curve)
// so this stays "money put in," not "current equity."
export function currentAccountSize(baseAccountSize, deposits) {
  return round((Number(baseAccountSize) || 0) + totalDeposited(deposits));
}

// Equity curve: two series sharing one timeline, so a chart can plot both
// and the gap between them at any date is exactly cumulative trading P&L.
// - `balance`: starting size + deposits + realized P&L (the real account
//   value over time).
// - `contributed`: starting size + deposits only, flat except when a
//   deposit lands — "your own money," untouched by trading results.
// A deposit moves both; a trade's exit moves only `balance`.
export function computeEquityCurve(trades, deposits, startingBalance) {
  const events = [];
  trades.forEach((t) => {
    (t.exits || []).forEach((e) => {
      events.push({
        date: e.date,
        pnl: (e.price - t.entryPrice) * e.shares,
        kind: "exit",
        ticker: t.ticker,
      });
    });
  });
  (deposits || []).forEach((d) => {
    events.push({ date: d.date, pnl: Number(d.amount) || 0, kind: "deposit" });
  });
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  let running = startingBalance;
  let contributed = startingBalance;
  const curve = [
    { date: "Start", balance: round(startingBalance), contributed: round(startingBalance) },
  ];
  events.forEach((ev) => {
    running += ev.pnl;
    if (ev.kind === "deposit") contributed += ev.pnl;
    curve.push({
      date: ev.date,
      balance: round(running),
      contributed: round(contributed),
      kind: ev.kind,
      ticker: ev.ticker,
    });
  });
  return curve;
}

// Current balance-sheet snapshot: cash + each open position. Realized P&L
// from closed (or partially closed) trades is folded into cash; open
// positions are valued at a live price when one's available, falling back to
// cost basis (entry price) otherwise so the chart still renders without an
// API key — just without any unrealized gain/loss signal.
export function computeBalanceSheet({ trades, accountSize, livePrices = {} }) {
  const openByTicker = new Map();

  trades.forEach((t) => {
    const remaining = sharesRemaining(t);
    if (remaining <= 0) return;

    const livePrice = livePrices[t.ticker];
    const price = livePrice != null ? livePrice : t.entryPrice;
    const costBasis = remaining * t.entryPrice;
    const marketValue = remaining * price;

    const existing = openByTicker.get(t.ticker) || {
      ticker: t.ticker,
      shares: 0,
      costBasis: 0,
      marketValue: 0,
      isLive: false,
    };
    existing.shares += remaining;
    existing.costBasis += costBasis;
    existing.marketValue += marketValue;
    existing.isLive = existing.isLive || livePrice != null;
    openByTicker.set(t.ticker, existing);
  });

  const positions = Array.from(openByTicker.values())
    .map((p) => ({
      ticker: p.ticker,
      shares: p.shares,
      isLive: p.isLive,
      costBasis: round(p.costBasis),
      marketValue: round(p.marketValue),
      unrealizedPnl: round(p.marketValue - p.costBasis),
      avgEntryPrice: p.shares > 0 ? round(p.costBasis / p.shares) : 0,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);

  const realized = trades.reduce((sum, t) => sum + realizedPnl(t), 0);
  const deployedCostBasis = positions.reduce((sum, p) => sum + p.costBasis, 0);
  const openMarketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);

  const cash = round(accountSize + realized - deployedCostBasis);
  const totalEquity = round(cash + openMarketValue);

  return { cash, totalEquity, positions };
}

// Folds multiple lots of the same ticker into one position row so scaling
// into (or out of) a name shows up as one holding instead of N unrelated
// journal rows. Each lot keeps its own thesis/stop/emotion/exits untouched
// underneath; this only changes how they're grouped for display.
//
// Two cases are merged:
//  - open lots, grouped by ticker alone (combined remaining shares, a
//    shares-weighted average entry price)
//  - closed lots, grouped by ticker *and* last exit date — only lots that
//    were both fully closed on the same day, since that's the strongest
//    signal they're fragments of one round trip rather than separate
//    decisions that just happened to close on the same date by coincidence
//    (combined shares, weighted average entry, summed realized P&L and R)
//
// Tickers with only one lot in a given bucket are returned as standalone
// rows, unchanged.
export function groupTradesByTicker(trades) {
  const openByTicker = new Map();
  const closedByKey = new Map();

  trades.forEach((t) => {
    if (t.status === "open") {
      if (!openByTicker.has(t.ticker)) openByTicker.set(t.ticker, []);
      openByTicker.get(t.ticker).push(t);
    } else if (isFullyClosed(t)) {
      const key = `${t.ticker}__${lastExitDate(t)}`;
      if (!closedByKey.has(key)) closedByKey.set(key, []);
      closedByKey.get(key).push(t);
    }
  });

  const openGroupIds = new Set();
  openByTicker.forEach((lots, ticker) => {
    if (lots.length > 1) lots.forEach((t) => openGroupIds.add(t.id));
    else openByTicker.delete(ticker);
  });

  const closedGroupIds = new Set();
  closedByKey.forEach((lots, key) => {
    if (lots.length > 1) lots.forEach((t) => closedGroupIds.add(t.id));
    else closedByKey.delete(key);
  });

  const emittedOpenTickers = new Set();
  const emittedClosedKeys = new Set();
  const rows = [];

  trades.forEach((t) => {
    if (openGroupIds.has(t.id)) {
      if (emittedOpenTickers.has(t.ticker)) return;
      emittedOpenTickers.add(t.ticker);

      const lots = openByTicker.get(t.ticker);
      const shares = lots.reduce((sum, l) => sum + sharesRemaining(l), 0);
      const costBasis = lots.reduce((sum, l) => sum + sharesRemaining(l) * l.entryPrice, 0);

      rows.push({
        type: "group",
        kind: "open",
        key: `open:${t.ticker}`,
        ticker: t.ticker,
        lots,
        shares,
        avgEntryPrice: shares > 0 ? round(costBasis / shares) : 0,
      });
      return;
    }

    if (closedGroupIds.has(t.id)) {
      const exitDate = lastExitDate(t);
      const key = `${t.ticker}__${exitDate}`;
      if (emittedClosedKeys.has(key)) return;
      emittedClosedKeys.add(key);

      const lots = closedByKey.get(key);
      const shares = lots.reduce((sum, l) => sum + l.shares, 0);
      const costBasis = lots.reduce((sum, l) => sum + l.shares * l.entryPrice, 0);
      const realized = lots.reduce((sum, l) => sum + realizedPnl(l), 0);
      const risk = lots.reduce((sum, l) => sum + riskAmountForTrade(l), 0);

      rows.push({
        type: "group",
        kind: "closed",
        key: `closed:${key}`,
        ticker: t.ticker,
        exitDate,
        lots,
        shares,
        avgEntryPrice: shares > 0 ? round(costBasis / shares) : 0,
        realizedPnl: round(realized),
        rMultiple: risk > 0 ? round(realized / risk, 2) : 0,
      });
      return;
    }

    rows.push({ type: "single", trade: t });
  });

  return rows;
}

// The `limit` biggest winning and losing trades by realized P&L — only
// trades with at least one exit are eligible (an open trade has no realized
// result yet to rank).
export function topMovers(trades, limit = 3) {
  const withRealized = trades
    .filter((t) => (t.exits || []).length > 0)
    .map((t) => ({ trade: t, pnl: realizedPnl(t) }));

  const winners = withRealized
    .filter((x) => x.pnl > 0)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, limit);

  const losers = withRealized
    .filter((x) => x.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl)
    .slice(0, limit);

  return { winners, losers };
}

// Largest peak-to-trough decline in the equity curve's balance series — the
// "how bad did it get along the way" number that a single cumulative P&L
// figure can't show (a curve can end up net positive after a brutal dip).
export function maxDrawdown(equityCurve) {
  if (!equityCurve || equityCurve.length < 2) return { amount: 0, percent: 0 };
  let peak = equityCurve[0].balance;
  let maxAmount = 0;
  let maxPercent = 0;
  equityCurve.forEach((point) => {
    if (point.balance > peak) peak = point.balance;
    const drawdown = peak - point.balance;
    if (drawdown > maxAmount) {
      maxAmount = drawdown;
      maxPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
    }
  });
  return { amount: round(maxAmount), percent: round(maxPercent, 1) };
}

// Shared aggregation for the breakdown views below — same shape as
// computeStats but scoped to one group (a symbol, a weekday, an emotion).
function aggregateTradeGroup(trades) {
  const withRealized = trades.filter((t) => (t.exits || []).length > 0);
  const pnls = withRealized.map((t) => realizedPnl(t));
  const wins = pnls.filter((p) => p > 0);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const rMultiples = withRealized.map((t) => rMultiple(t));
  const avgR = rMultiples.length ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;
  return {
    trades: trades.length,
    tradesWithExits: withRealized.length,
    totalPnl: round(totalPnl),
    winRate: withRealized.length ? round((wins.length / withRealized.length) * 100, 1) : 0,
    avgR: round(avgR, 2),
  };
}

function groupAndAggregate(groups) {
  return Array.from(groups.entries())
    .map(([key, groupTrades]) => ({ key, ...aggregateTradeGroup(groupTrades) }))
    .filter((g) => g.tradesWithExits > 0)
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

// P&L, win rate, and avg R grouped by ticker — surfaces which names are
// actually carrying (or dragging) the account, which the aggregate-only
// dashboard stats can't show.
export function statsBySymbol(trades) {
  const groups = new Map();
  trades.forEach((t) => {
    if (!groups.has(t.ticker)) groups.set(t.ticker, []);
    groups.get(t.ticker).push(t);
  });
  return groupAndAggregate(groups);
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Parses a plain "YYYY-MM-DD" string as a local calendar date rather than
// UTC midnight — `new Date(dateStr)` would shift the weekday by one day in
// negative-UTC-offset timezones, same gotcha the Journal page's date-range
// filter already works around.
function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

// P&L, win rate, and avg R grouped by the weekday a trade was closed on —
// only fully-closed trades are attributable to a single close-out day.
export function statsByDayOfWeek(trades) {
  const groups = new Map();
  trades.forEach((t) => {
    if (!isFullyClosed(t)) return;
    const date = lastExitDate(t);
    if (!date) return;
    const day = dayOfWeek(date);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(t);
  });
  return WEEKDAYS.filter((day) => groups.has(day)).map((day) => ({
    key: day,
    ...aggregateTradeGroup(groups.get(day)),
  }));
}

// P&L, win rate, and avg R grouped by the emotion logged at entry.
export function statsByEmotion(trades) {
  const groups = new Map();
  trades.forEach((t) => {
    const emotion = t.emotion || "Unknown";
    if (!groups.has(emotion)) groups.set(emotion, []);
    groups.get(emotion).push(t);
  });
  return groupAndAggregate(groups);
}

// P&L, win rate, and avg R grouped by strategyId (a slug from
// content/strategies, or null/untagged) — kept decoupled from the content
// layer itself; callers resolve a strategy's display title from the key.
export function statsByStrategy(trades) {
  const groups = new Map();
  trades.forEach((t) => {
    const key = t.strategyId || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  });
  return groupAndAggregate(groups);
}

// Discipline score and win rate bucketed by calendar month, so the
// dashboard's point-in-time aggregates can be seen as a trend instead —
// "is this actually improving" rather than just "what's the overall number."
// Uses the same date-per-trade rule as filterTradesByPeriod: a closed trade
// is dated by when it closed, a still-open one by when it was entered.
export function monthlyReviewTrend(trades) {
  const buckets = new Map();
  trades.forEach((t) => {
    const date = isFullyClosed(t) ? lastExitDate(t) : t.entryDate;
    if (!date) return;
    const month = date.slice(0, 7);
    if (!buckets.has(month)) buckets.set(month, []);
    buckets.get(month).push(t);
  });
  return Array.from(buckets.keys())
    .sort()
    .map((month) => {
      const groupTrades = buckets.get(month);
      const stats = computeStats(groupTrades);
      return {
        month,
        discipline: overallDisciplineScore(groupTrades),
        winRate: stats.winRate,
        totalPnl: stats.totalPnl,
        trades: groupTrades.length,
      };
    });
}

// "Did you exit too early or too late" — looks at price action after a
// fully-closed trade's final exit, using whatever post-exit candles are
// already on hand (TradeChart's fetch already pads 15 days past the exit
// date for chart breathing room; this reuses that data instead of firing a
// second request). Returns null if the trade isn't closed or there's no
// post-exit candle data yet to judge it against.
export function exitPostmortem(trade, candles) {
  if (!isFullyClosed(trade)) return null;
  const exits = trade.exits || [];
  if (!exits.length) return null;

  const exitDate = lastExitDate(trade);
  const finalExit = exits.find((e) => e.date === exitDate) || exits[0];
  const after = (candles || []).filter((c) => c.time > exitDate);
  if (!after.length) return null;

  const highestAfter = Math.max(...after.map((c) => c.high));
  const lowestAfter = Math.min(...after.map((c) => c.low));

  return {
    exitDate,
    exitPrice: finalExit.price,
    sharesAtExit: finalExit.shares,
    daysObserved: after.length,
    highestAfter: round(highestAfter),
    lowestAfter: round(lowestAfter),
    leftOnTable: round(Math.max(0, highestAfter - finalExit.price) * finalExit.shares),
    avoidedLoss: round(Math.max(0, finalExit.price - lowestAfter) * finalExit.shares),
  };
}

export function formatCurrency(n) {
  const val = Number(n) || 0;
  const sign = val < 0 ? "-" : "";
  return `${sign}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatPercent(n, decimals = 1) {
  const val = Number(n) || 0;
  return `${val.toFixed(decimals)}%`;
}
