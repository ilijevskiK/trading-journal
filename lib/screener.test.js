import { describe, it, expect } from "vitest";
import { makeDay } from "./priceHistory";
import { historyIsComplete, rsSnapshots, stockMetrics, screenStocks, SCREENER_RULES } from "./screener";

// `count` weekday sessions ending 2026-11-10; `price(i)` gives each
// ticker's close on session i (0 = oldest).
function history(count, prices, volume = 1_000_000) {
  const dates = [];
  for (let d = new Date("2026-11-10T00:00:00Z"); dates.length < count; d.setUTCDate(d.getUTCDate() - 1)) {
    if (![0, 6].includes(d.getUTCDay())) dates.unshift(d.toISOString().slice(0, 10));
  }
  return dates.map((date, i) => {
    const tickers = Object.keys(prices).filter((t) => prices[t](i) != null);
    const closes = tickers.map((t) => prices[t](i));
    return makeDay(date, tickers, closes, closes.map((c) => c * 1.01), tickers.map(() => volume));
  });
}

const noSplits = new Map();

describe("historyIsComplete", () => {
  it("needs a year of sessions", () => {
    expect(historyIsComplete(history(100, { A: () => 10 }))).toBe(false);
    expect(historyIsComplete(history(265, { A: () => 10 }))).toBe(true);
    expect(historyIsComplete([])).toBe(false);
  });
});

describe("rsSnapshots", () => {
  it("picks the closes 3, 6, 9 and 12 months back", () => {
    const days = history(265, { A: (i) => 100 + i });
    const snap = rsSnapshots(days, noSplits);
    expect(snap.now.get("A")).toBe(364);
    expect(snap.m3.get("A")).toBeGreaterThan(snap.m6.get("A"));
    expect(snap.m12.get("A")).toBeLessThan(snap.m9.get("A"));
  });

  it("applies splits so a 10-for-1 split doesn't look like a crash", () => {
    const days = history(265, { A: (i) => (i < 200 ? 1000 : 100) });
    const splits = new Map([["A", [{ date: days[200].date, ratio: 10 }]]]);
    expect(rsSnapshots(days, splits).m12.get("A")).toBeCloseTo(100);
  });
});

describe("stockMetrics", () => {
  it("measures distance from the 52-week high and average dollar volume", () => {
    const days = history(265, { A: (i) => (i === 200 ? 50 : 40) });
    const m = stockMetrics("A", days, noSplits);
    expect(m.price).toBe(40);
    expect(m.high52).toBeCloseTo(50.5);
    expect(m.pctBelowHigh).toBeCloseTo(20.8, 1);
    expect(m.avgDollarVolume).toBe(40_000_000);
  });

  it("is null if the stock didn't trade on the latest day, and has no volume average when thinly traded", () => {
    expect(stockMetrics("A", history(265, { A: (i) => (i < 264 ? 40 : null) }), noSplits)).toBeNull();
    const thin = stockMetrics("A", history(265, { A: (i) => (i % 2 === 0 ? 40 : null) }), noSplits);
    expect(thin.avgDollarVolume).toBeNull();
  });
});

describe("screenStocks", () => {
  const days = history(265, {
    LEAD: () => 40, // at its high
    CHEAP: () => 5,
    FALLEN: (i) => (i === 100 ? 80 : 40), // 50% off its high
    WEAK: () => 40,
  });
  const ratings = [
    { ticker: "LEAD", rating: 95 },
    { ticker: "CHEAP", rating: 99 },
    { ticker: "FALLEN", rating: 90 },
    { ticker: "WEAK", rating: 40 },
  ];

  it("keeps only stocks passing every check and counts each step", () => {
    const { candidates, funnel } = screenStocks({
      days,
      splits: noSplits,
      universe: new Set(["LEAD", "CHEAP", "FALLEN", "WEAK", "GONE"]),
      ratings,
      names: new Map([["LEAD", "Leader Inc"]]),
    });
    expect(candidates.map((c) => c.ticker)).toEqual(["LEAD"]);
    expect(candidates[0]).toMatchObject({ name: "Leader Inc", rsRating: 95 });
    expect(funnel).toEqual({ universe: 4, priceAndVolume: 3, rsRating: 2, nearHigh: 1 });
  });

  it("follows the rules it's given", () => {
    const { candidates } = screenStocks(
      { days, splits: noSplits, universe: new Set(["FALLEN", "LEAD"]), ratings },
      { ...SCREENER_RULES, maxBelowHighPct: 60 }
    );
    expect(candidates.map((c) => c.ticker)).toEqual(["LEAD", "FALLEN"]);
  });
});
