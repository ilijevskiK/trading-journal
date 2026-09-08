import { describe, it, expect } from "vitest";
import {
  selectTradesForChapter,
  countUncoveredTrades,
  classifyTradePattern,
  MAX_TRADES_PER_CHAPTER,
} from "./memoirData";

function makeClosedTrade(id, exitDate) {
  return {
    id,
    ticker: "AAPL",
    entryDate: "2026-01-01",
    entryPrice: 100,
    shares: 10,
    exits: [{ date: exitDate, price: 110, shares: 10 }],
  };
}

describe("selectTradesForChapter", () => {
  it("excludes trades already covered by a past chapter", () => {
    const trades = [makeClosedTrade(1, "2026-01-10"), makeClosedTrade(2, "2026-01-11")];
    const result = selectTradesForChapter(trades, [1]);
    expect(result.map((t) => t.id)).toEqual([2]);
  });

  it("excludes trades that aren't fully closed", () => {
    const openTrade = { id: 3, ticker: "TSLA", entryDate: "2026-01-01", entryPrice: 100, shares: 10, exits: [] };
    const result = selectTradesForChapter([openTrade], []);
    expect(result).toEqual([]);
  });

  it("orders oldest-uncovered-first by exit date", () => {
    const trades = [makeClosedTrade(1, "2026-03-01"), makeClosedTrade(2, "2026-01-01"), makeClosedTrade(3, "2026-02-01")];
    const result = selectTradesForChapter(trades, []);
    expect(result.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("caps the result at MAX_TRADES_PER_CHAPTER", () => {
    const trades = Array.from({ length: MAX_TRADES_PER_CHAPTER + 5 }, (_, i) =>
      makeClosedTrade(i, `2026-01-${String(i + 1).padStart(2, "0")}`)
    );
    const result = selectTradesForChapter(trades, []);
    expect(result.length).toBe(MAX_TRADES_PER_CHAPTER);
  });
});

describe("countUncoveredTrades", () => {
  it("counts uncovered closed trades without the MAX_TRADES_PER_CHAPTER cap", () => {
    const trades = Array.from({ length: MAX_TRADES_PER_CHAPTER + 5 }, (_, i) =>
      makeClosedTrade(i, `2026-01-${String(i + 1).padStart(2, "0")}`)
    );
    expect(countUncoveredTrades(trades, [])).toBe(MAX_TRADES_PER_CHAPTER + 5);
  });

  it("returns 0 when every closed trade is already covered", () => {
    const trades = [makeClosedTrade(1, "2026-01-10"), makeClosedTrade(2, "2026-01-11")];
    expect(countUncoveredTrades(trades, [1, 2])).toBe(0);
  });

  it("returns 0 when there are no closed trades at all", () => {
    const openTrade = { id: 3, ticker: "TSLA", entryDate: "2026-01-01", entryPrice: 100, shares: 10, exits: [] };
    expect(countUncoveredTrades([openTrade], [])).toBe(0);
  });
});

describe("classifyTradePattern", () => {
  it("classifies gave_back when giveBackPoints crosses the threshold", () => {
    const fact = { peak: { giveBackPoints: 20 }, soldEarly: null };
    expect(classifyTradePattern(fact)).toBe("gave_back");
  });

  it("classifies sold_early when runSincePercent crosses the threshold", () => {
    const fact = { peak: null, soldEarly: { runSincePercent: 30 } };
    expect(classifyTradePattern(fact)).toBe("sold_early");
  });

  it("prefers gave_back when both thresholds are crossed", () => {
    const fact = { peak: { giveBackPoints: 20 }, soldEarly: { runSincePercent: 30 } };
    expect(classifyTradePattern(fact)).toBe("gave_back");
  });

  it("classifies neutral when neither threshold is crossed", () => {
    const fact = { peak: { giveBackPoints: 2 }, soldEarly: { runSincePercent: 3 } };
    expect(classifyTradePattern(fact)).toBe("neutral");
  });

  it("classifies neutral when peak/soldEarly data is missing entirely", () => {
    expect(classifyTradePattern({ peak: null, soldEarly: null })).toBe("neutral");
  });
});
