import { describe, it, expect } from "vitest";
import {
  round,
  suggestedPosition,
  realizedPnl,
  sharesRemaining,
  rMultiple,
  isFullyClosed,
  lastExitDate,
  disciplineChecks,
  overallDisciplineScore,
  computeStats,
  totalDeposited,
  currentAccountSize,
  computeEquityCurve,
  computeBalanceSheet,
  groupTradesByTicker,
  topMovers,
  maxDrawdown,
  statsBySymbol,
  statsByDayOfWeek,
  statsByEmotion,
  statsByStrategy,
  monthlyReviewTrend,
  exitPostmortem,
  holdDays,
  holdTimeByOutcome,
  todayLocalDateStr,
} from "./calc";

function makeTrade(overrides = {}) {
  return {
    id: overrides.id || "t1",
    ticker: "AAPL",
    thesis: "Breaking out",
    understoodBusiness: true,
    entryDate: "2026-01-06", // a Tuesday
    entryPrice: 100,
    stopPrice: 90,
    shares: 10,
    emotion: "Confident",
    accountSizeAtEntry: 10000,
    maxPositionPercentAllowed: 20,
    stopMovedAgainstPlan: false,
    status: "open",
    exits: [],
    tags: [],
    ...overrides,
  };
}

describe("round", () => {
  it("rounds to the given decimal count", () => {
    expect(round(1.2345, 2)).toBe(1.23);
    expect(round(1.016, 2)).toBe(1.02);
  });
  it("treats null/NaN as 0", () => {
    expect(round(null)).toBe(0);
    expect(round(undefined)).toBe(0);
    expect(round(NaN)).toBe(0);
  });
});

describe("suggestedPosition", () => {
  it("computes risk amount, stop distance, shares", () => {
    const result = suggestedPosition({
      accountSize: 10000,
      riskPercent: 1,
      entryPrice: 100,
      stopPrice: 90,
    });
    expect(result.riskAmount).toBe(100);
    expect(result.stopDistancePercent).toBe(10);
    expect(result.positionValue).toBe(1000);
    expect(result.shares).toBe(10);
  });

  it("returns zeros when entry equals stop (no stop distance)", () => {
    const result = suggestedPosition({
      accountSize: 10000,
      riskPercent: 1,
      entryPrice: 100,
      stopPrice: 100,
    });
    expect(result.shares).toBe(0);
    expect(result.positionValue).toBe(0);
  });
});

describe("realizedPnl / rMultiple / sharesRemaining", () => {
  it("sums exits against entry price", () => {
    const trade = makeTrade({ exits: [{ price: 110, shares: 5 }, { price: 120, shares: 5 }] });
    expect(realizedPnl(trade)).toBe(50 + 100);
  });

  it("computes r-multiple as pnl over dollar risk", () => {
    const trade = makeTrade({ exits: [{ price: 120, shares: 10 }] }); // +200 pnl
    // risk = |100-90| * 10 = 100 -> R = 200/100 = 2
    expect(rMultiple(trade)).toBe(2);
  });

  it("returns 0 R-multiple when there is no risk (stop == entry)", () => {
    const trade = makeTrade({ stopPrice: 100, exits: [{ price: 120, shares: 10 }] });
    expect(rMultiple(trade)).toBe(0);
  });

  it("tracks shares remaining across partial exits", () => {
    const trade = makeTrade({ shares: 10, exits: [{ price: 110, shares: 4 }] });
    expect(sharesRemaining(trade)).toBe(6);
  });
});

describe("isFullyClosed / lastExitDate", () => {
  it("is not closed with no exits", () => {
    expect(isFullyClosed(makeTrade())).toBe(false);
  });

  it("is closed once all shares are exited", () => {
    const trade = makeTrade({ shares: 10, exits: [{ date: "2026-01-10", price: 110, shares: 10 }] });
    expect(isFullyClosed(trade)).toBe(true);
    expect(lastExitDate(trade)).toBe("2026-01-10");
  });

  it("lastExitDate picks the latest of multiple exits", () => {
    const trade = makeTrade({
      exits: [
        { date: "2026-01-05", price: 105, shares: 5 },
        { date: "2026-01-12", price: 115, shares: 5 },
      ],
    });
    expect(lastExitDate(trade)).toBe("2026-01-12");
  });

  it("returns null lastExitDate when there are no exits", () => {
    expect(lastExitDate(makeTrade())).toBeNull();
  });
});

describe("disciplineChecks / overallDisciplineScore", () => {
  it("scores 100 when every check passes", () => {
    const trade = makeTrade();
    const { score, checks } = disciplineChecks(trade);
    expect(score).toBe(100);
    expect(Object.values(checks).every(Boolean)).toBe(true);
  });

  it("penalizes a missing thesis, missing stop, and oversized position", () => {
    const trade = makeTrade({
      thesis: "",
      stopPrice: null,
      shares: 1000, // positionValue 100,000 vs accountSizeAtEntry 10,000 way over 20%
    });
    const { score, checks } = disciplineChecks(trade);
    expect(checks.hasThesis).toBe(false);
    expect(checks.hasStop).toBe(false);
    expect(checks.sizedWithinLimit).toBe(false);
    expect(score).toBeLessThan(100);
  });

  it("averages scores across trades, and returns 0 for an empty list", () => {
    expect(overallDisciplineScore([])).toBe(0);
    const good = makeTrade({ id: "a" });
    const bad = makeTrade({ id: "b", thesis: "" });
    const avg = overallDisciplineScore([good, bad]);
    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThan(100);
  });
});

describe("computeStats", () => {
  it("returns all-zero stats for an empty trade list", () => {
    const stats = computeStats([]);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.expectancy).toBe(0);
  });

  it("computes win rate/expectancy across a mix of wins and losses", () => {
    const win = makeTrade({ id: "w", exits: [{ price: 120, shares: 10 }] }); // +200
    const loss = makeTrade({ id: "l", exits: [{ price: 95, shares: 10 }] }); // -50
    const stats = computeStats([win, loss]);
    expect(stats.tradesWithExits).toBe(2);
    expect(stats.winRate).toBe(50);
    expect(stats.avgWin).toBe(200);
    expect(stats.avgLoss).toBe(-50);
    expect(stats.totalPnl).toBe(150);
    expect(stats.expectancy).toBe(0.5 * 200 + 0.5 * -50);
  });

  it("treats a trade with no exits as open, not a loss", () => {
    const stats = computeStats([makeTrade()]);
    expect(stats.totalTrades).toBe(1);
    expect(stats.tradesWithExits).toBe(0);
    expect(stats.openTrades).toBe(1);
  });

  it("handles an all-losses set without NaN", () => {
    const loss1 = makeTrade({ id: "l1", exits: [{ price: 95, shares: 10 }] });
    const loss2 = makeTrade({ id: "l2", exits: [{ price: 92, shares: 10 }] });
    const stats = computeStats([loss1, loss2]);
    expect(stats.winRate).toBe(0);
    expect(stats.avgWin).toBe(0);
    expect(Number.isNaN(stats.expectancy)).toBe(false);
  });
});

describe("deposits / account size", () => {
  it("sums deposits and adds them to the base account size", () => {
    const deposits = [{ amount: 500 }, { amount: 250 }];
    expect(totalDeposited(deposits)).toBe(750);
    expect(currentAccountSize(10000, deposits)).toBe(10750);
  });

  it("handles no deposits", () => {
    expect(totalDeposited([])).toBe(0);
    expect(currentAccountSize(10000, [])).toBe(10000);
  });
});

describe("computeEquityCurve", () => {
  it("starts at the starting balance and applies exits/deposits in date order", () => {
    const trade = makeTrade({ exits: [{ date: "2026-01-10", price: 110, shares: 10 }] }); // +100
    const deposits = [{ date: "2026-01-05", amount: 1000 }];
    const curve = computeEquityCurve([trade], deposits, 10000);

    expect(curve[0]).toEqual({ date: "Start", balance: 10000, contributed: 10000 });
    const deposit = curve.find((p) => p.kind === "deposit");
    expect(deposit.balance).toBe(11000);
    expect(deposit.contributed).toBe(11000);
    const exit = curve.find((p) => p.kind === "exit");
    expect(exit.balance).toBe(11100);
    expect(exit.contributed).toBe(11000); // deposit-only line unaffected by trading pnl
  });
});

describe("computeBalanceSheet", () => {
  it("values open positions at cost basis without a live price", () => {
    const trade = makeTrade({ shares: 10, entryPrice: 100 });
    const sheet = computeBalanceSheet({ trades: [trade], accountSize: 10000, livePrices: {} });
    expect(sheet.positions).toHaveLength(1);
    expect(sheet.positions[0].marketValue).toBe(1000);
    expect(sheet.positions[0].unrealizedPnl).toBe(0);
    expect(sheet.cash).toBe(9000);
    expect(sheet.totalEquity).toBe(10000);
  });

  it("uses a live price for unrealized P&L when available", () => {
    const trade = makeTrade({ shares: 10, entryPrice: 100 });
    const sheet = computeBalanceSheet({
      trades: [trade],
      accountSize: 10000,
      livePrices: { AAPL: 120 },
    });
    expect(sheet.positions[0].marketValue).toBe(1200);
    expect(sheet.positions[0].unrealizedPnl).toBe(200);
  });

  it("excludes fully-closed trades from open positions", () => {
    const trade = makeTrade({ shares: 10, exits: [{ date: "2026-01-10", price: 110, shares: 10 }] });
    const sheet = computeBalanceSheet({ trades: [trade], accountSize: 10000, livePrices: {} });
    expect(sheet.positions).toHaveLength(0);
    expect(sheet.cash).toBe(10100); // starting cash + 100 realized pnl
  });

  it("blends multiple open lots of the same ticker into one weighted-average position", () => {
    const lot1 = makeTrade({ id: "l1", shares: 10, entryPrice: 100 });
    const lot2 = makeTrade({ id: "l2", shares: 10, entryPrice: 120 });
    const sheet = computeBalanceSheet({
      trades: [lot1, lot2],
      accountSize: 10000,
      livePrices: {},
    });
    expect(sheet.positions).toHaveLength(1);
    expect(sheet.positions[0].shares).toBe(20);
    expect(sheet.positions[0].avgEntryPrice).toBe(110);
  });
});

describe("groupTradesByTicker", () => {
  it("merges multiple open lots of the same ticker into one group row with a weighted average", () => {
    const lot1 = makeTrade({ id: "l1", shares: 10, entryPrice: 100 });
    const lot2 = makeTrade({ id: "l2", shares: 30, entryPrice: 120 });
    const rows = groupTradesByTicker([lot1, lot2]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "group",
      kind: "open",
      ticker: "AAPL",
      shares: 40,
      avgEntryPrice: 115, // (10*100 + 30*120) / 40
    });
    expect(rows[0].lots.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("leaves a ticker with a single open lot as a standalone row", () => {
    const trade = makeTrade({ id: "l1", shares: 10, entryPrice: 100 });
    const rows = groupTradesByTicker([trade]);
    expect(rows).toEqual([{ type: "single", trade }]);
  });

  it("does not group an open lot with a closed lot of the same ticker", () => {
    const open = makeTrade({ id: "o1", shares: 10, entryPrice: 100, status: "open" });
    const closed = makeTrade({
      id: "c1",
      shares: 10,
      entryPrice: 90,
      status: "closed",
      exits: [{ date: "2026-01-10", price: 95, shares: 10 }],
    });
    const rows = groupTradesByTicker([open, closed]);
    expect(rows).toEqual([
      { type: "single", trade: open },
      { type: "single", trade: closed },
    ]);
  });

  it("accounts for partial exits when weighting the open-lot average", () => {
    const lot1 = makeTrade({
      id: "l1",
      shares: 20,
      entryPrice: 100,
      exits: [{ date: "2026-01-10", price: 110, shares: 10 }],
    }); // 10 remaining @ 100
    const lot2 = makeTrade({ id: "l2", shares: 10, entryPrice: 130 }); // 10 remaining @ 130
    const rows = groupTradesByTicker([lot1, lot2]);
    expect(rows[0].shares).toBe(20);
    expect(rows[0].avgEntryPrice).toBe(115);
  });

  it("merges closed lots of the same ticker that closed on the same day", () => {
    const lot1 = makeTrade({
      id: "c1",
      shares: 10,
      entryPrice: 100,
      stopPrice: 90,
      status: "closed",
      exits: [{ date: "2026-01-15", price: 104.5, shares: 10 }],
    }); // +45 pnl, risk 100 -> 0.45R
    const lot2 = makeTrade({
      id: "c2",
      shares: 40,
      entryPrice: 100,
      stopPrice: 90,
      status: "closed",
      exits: [{ date: "2026-01-15", price: 100.3, shares: 40 }],
    }); // +12 pnl, risk 400 -> 0.03R
    const rows = groupTradesByTicker([lot1, lot2]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "group",
      kind: "closed",
      ticker: "AAPL",
      exitDate: "2026-01-15",
      shares: 50,
      avgEntryPrice: 100,
      realizedPnl: 57,
    });
    expect(rows[0].lots.map((l) => l.id)).toEqual(["c1", "c2"]);
  });

  it("does not merge closed lots of the same ticker that closed on different days", () => {
    const lot1 = makeTrade({
      id: "c1",
      status: "closed",
      exits: [{ date: "2026-01-15", price: 110, shares: 10 }],
    });
    const lot2 = makeTrade({
      id: "c2",
      status: "closed",
      exits: [{ date: "2026-01-20", price: 90, shares: 10 }],
    });
    const rows = groupTradesByTicker([lot1, lot2]);
    expect(rows).toEqual([
      { type: "single", trade: lot1 },
      { type: "single", trade: lot2 },
    ]);
  });
});

describe("topMovers", () => {
  it("splits and ranks winners and losers by realized pnl", () => {
    const win1 = makeTrade({ id: "w1", exits: [{ price: 130, shares: 10 }] }); // +300
    const win2 = makeTrade({ id: "w2", exits: [{ price: 110, shares: 10 }] }); // +100
    const loss1 = makeTrade({ id: "l1", exits: [{ price: 80, shares: 10 }] }); // -200
    const open = makeTrade({ id: "o1" });
    const { winners, losers } = topMovers([win1, win2, loss1, open], 3);
    expect(winners.map((w) => w.trade.id)).toEqual(["w1", "w2"]);
    expect(losers.map((l) => l.trade.id)).toEqual(["l1"]);
  });
});

describe("maxDrawdown", () => {
  it("returns zero for a flat or empty curve", () => {
    expect(maxDrawdown([])).toEqual({ amount: 0, percent: 0 });
    expect(maxDrawdown([{ balance: 100 }])).toEqual({ amount: 0, percent: 0 });
  });

  it("finds the largest peak-to-trough decline, not just the final drop", () => {
    const curve = [
      { balance: 10000 },
      { balance: 12000 }, // peak
      { balance: 9000 }, // trough: drawdown 3000 (25%)
      { balance: 11000 },
      { balance: 10500 }, // smaller drawdown from a lower peak — should not overwrite the max
    ];
    const result = maxDrawdown(curve);
    expect(result.amount).toBe(3000);
    expect(result.percent).toBe(25);
  });
});

describe("statsBySymbol / statsByDayOfWeek / statsByEmotion", () => {
  it("groups by symbol and excludes tickers with no realized exits", () => {
    const aaplWin = makeTrade({ id: "1", ticker: "AAPL", exits: [{ price: 120, shares: 10 }] });
    const aaplLoss = makeTrade({ id: "2", ticker: "AAPL", exits: [{ price: 90, shares: 10 }] });
    const msftOpen = makeTrade({ id: "3", ticker: "MSFT" });
    const groups = statsBySymbol([aaplWin, aaplLoss, msftOpen]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("AAPL");
    expect(groups[0].trades).toBe(2);
    expect(groups[0].totalPnl).toBe(200 - 100);
  });

  it("groups closed trades by the weekday they were closed on", () => {
    // 2026-01-06 is a Tuesday, 2026-01-09 is a Friday
    const t1 = makeTrade({ id: "1", exits: [{ date: "2026-01-06", price: 110, shares: 10 }] });
    const t2 = makeTrade({ id: "2", exits: [{ date: "2026-01-09", price: 90, shares: 10 }] });
    const openTrade = makeTrade({ id: "3" });
    const groups = statsByDayOfWeek([t1, t2, openTrade]);
    const keys = groups.map((g) => g.key);
    expect(keys).toContain("Tuesday");
    expect(keys).toContain("Friday");
    expect(groups.find((g) => g.key === "Tuesday").totalPnl).toBe(100);
  });

  it("groups by emotion", () => {
    const confident = makeTrade({ id: "1", emotion: "Confident", exits: [{ price: 120, shares: 10 }] });
    const fomo = makeTrade({ id: "2", emotion: "FOMO", exits: [{ price: 80, shares: 10 }] });
    const groups = statsByEmotion([confident, fomo]);
    expect(groups.find((g) => g.key === "Confident").totalPnl).toBe(200);
    expect(groups.find((g) => g.key === "FOMO").totalPnl).toBe(-200);
  });

  it("groups by strategyId, treating untagged trades as a null key", () => {
    const tagged = makeTrade({ id: "1", strategyId: "stage-analysis", exits: [{ price: 120, shares: 10 }] });
    const untagged = makeTrade({ id: "2", exits: [{ price: 90, shares: 10 }] });
    const groups = statsByStrategy([tagged, untagged]);
    expect(groups.find((g) => g.key === "stage-analysis").totalPnl).toBe(200);
    expect(groups.find((g) => g.key === null).totalPnl).toBe(-100);
  });
});

describe("monthlyReviewTrend", () => {
  it("buckets trades by month, dating closed trades by close and open trades by entry", () => {
    const closedJan = makeTrade({
      id: "1",
      entryDate: "2026-01-05",
      exits: [{ date: "2026-01-20", price: 120, shares: 10 }],
    });
    const openFeb = makeTrade({ id: "2", entryDate: "2026-02-03" });
    const trend = monthlyReviewTrend([closedJan, openFeb]);
    expect(trend.map((t) => t.month)).toEqual(["2026-01", "2026-02"]);
    expect(trend[0].trades).toBe(1);
    expect(trend[0].winRate).toBe(100);
    expect(trend[1].trades).toBe(1);
    expect(trend[1].winRate).toBe(0); // no exits yet — not a loss, just no realized outcome
  });

  it("returns an empty array for no trades", () => {
    expect(monthlyReviewTrend([])).toEqual([]);
  });
});

describe("exitPostmortem", () => {
  const dailyCandle = (date, high, low) => ({ time: date, high, low, open: high, close: low });

  it("returns null for a trade that isn't fully closed", () => {
    expect(exitPostmortem(makeTrade(), [])).toBeNull();
  });

  it("returns null when there are no candles after the exit date yet", () => {
    const trade = makeTrade({ exits: [{ date: "2026-01-10", price: 110, shares: 10 }] });
    const candles = [dailyCandle("2026-01-09", 111, 108)];
    expect(exitPostmortem(trade, candles)).toBeNull();
  });

  it("computes leftOnTable when price kept climbing after the exit", () => {
    const trade = makeTrade({ exits: [{ date: "2026-01-10", price: 110, shares: 10 }] });
    const candles = [
      dailyCandle("2026-01-11", 115, 112),
      dailyCandle("2026-01-12", 125, 120), // highest
      dailyCandle("2026-01-13", 118, 114),
    ];
    const result = exitPostmortem(trade, candles);
    expect(result.highestAfter).toBe(125);
    expect(result.leftOnTable).toBe((125 - 110) * 10);
    expect(result.avoidedLoss).toBe(0);
  });

  it("computes avoidedLoss when price kept falling after the exit", () => {
    const trade = makeTrade({ exits: [{ date: "2026-01-10", price: 110, shares: 10 }] });
    const candles = [
      dailyCandle("2026-01-11", 108, 104),
      dailyCandle("2026-01-12", 103, 95), // lowest
    ];
    const result = exitPostmortem(trade, candles);
    expect(result.lowestAfter).toBe(95);
    expect(result.avoidedLoss).toBe((110 - 95) * 10);
    expect(result.leftOnTable).toBe(0);
  });
});

describe("holdDays", () => {
  it("counts calendar days from entry to the last exit for a closed trade", () => {
    const trade = makeTrade({
      entryDate: "2026-01-06",
      exits: [
        { date: "2026-01-10", price: 105, shares: 5 },
        { date: "2026-01-20", price: 110, shares: 5 },
      ],
    });
    expect(holdDays(trade)).toBe(14); // Jan 6 -> Jan 20
  });

  it("counts from entry to today for a still-open trade", () => {
    const trade = makeTrade({ entryDate: "2026-01-06" });
    const expected = Math.round(
      (new Date(todayLocalDateStr()).getTime() - new Date("2026-01-06").getTime()) /
        (1000 * 60 * 60 * 24)
    );
    expect(holdDays(trade)).toBe(expected);
  });

  it("counts from entry to today for a partially closed trade", () => {
    const trade = makeTrade({
      entryDate: "2026-01-06",
      shares: 10,
      exits: [{ date: "2026-01-10", price: 105, shares: 5 }],
    });
    const expected = Math.round(
      (new Date(todayLocalDateStr()).getTime() - new Date("2026-01-06").getTime()) /
        (1000 * 60 * 60 * 24)
    );
    expect(holdDays(trade)).toBe(expected);
  });
});

describe("holdTimeByOutcome", () => {
  it("averages hold time separately for winners and losers, ignoring open trades", () => {
    const winner1 = makeTrade({
      id: "w1",
      entryDate: "2026-01-01",
      exits: [{ date: "2026-01-06", price: 110, shares: 10 }], // +100, held 5 days
    });
    const winner2 = makeTrade({
      id: "w2",
      entryDate: "2026-01-01",
      exits: [{ date: "2026-01-11", price: 110, shares: 10 }], // +100, held 10 days
    });
    const loser = makeTrade({
      id: "l1",
      entryDate: "2026-01-01",
      exits: [{ date: "2026-02-01", price: 90, shares: 10 }], // -100, held 31 days
    });
    const open = makeTrade({ id: "o1" });

    const result = holdTimeByOutcome([winner1, winner2, loser, open]);
    expect(result.winners).toEqual({ count: 2, avgDays: 7.5 });
    expect(result.losers).toEqual({ count: 1, avgDays: 31 });
  });

  it("returns null averages when there are no closed trades of that outcome", () => {
    const result = holdTimeByOutcome([makeTrade({ id: "o1" })]);
    expect(result.winners).toEqual({ count: 0, avgDays: null });
    expect(result.losers).toEqual({ count: 0, avgDays: null });
  });
});
