import { describe, it, expect } from "vitest";
import { backfillRatings } from "./rsBackfill.js";
import { makeDay } from "./priceHistory.js";

// 520 consecutive calendar days, one bar per day. Each of 600 stocks climbs
// at its own steady rate, so rank never changes and the ratings are known.
const START = Date.parse("2024-01-01T00:00:00Z");
const TICKERS = Array.from({ length: 600 }, (_, i) => `T${i}`);
const days = Array.from({ length: 520 }, (_, d) => {
  const date = new Date(START + d * 86_400_000).toISOString().slice(0, 10);
  const closes = TICKERS.map((_, i) => 10 * Math.pow(1 + 0.0005 * (i + 1), d));
  return makeDay(date, TICKERS, closes, closes, TICKERS.map(() => 1e6));
});
const universe = new Set(TICKERS);
const splits = new Map();

describe("backfillRatings", () => {
  const runs = [...backfillRatings(days, splits, universe)];

  it("only ranks days with a full year of history behind them", () => {
    const first = new Date(START + 365 * 86_400_000).toISOString().slice(0, 10);
    expect(runs[0].asOf >= first).toBe(true);
    expect(runs.at(-1).asOf).toBe(days.at(-1).date);
  });

  it("ranks every stock on each day", () => {
    const run = runs.at(-1);
    expect(run.ratings).toHaveLength(600);
    const top = run.ratings.find((r) => r.ticker === "T599");
    const bottom = run.ratings.find((r) => r.ticker === "T0");
    expect(top.rating).toBe(99);
    expect(bottom.rating).toBe(1);
  });

  it("skips days that are already ranked and days before `since`", () => {
    const skipDates = new Set([days.at(-1).date]);
    const since = days.at(-5).date;
    const some = [...backfillRatings(days, splits, universe, { since, skipDates })];
    expect(some.map((r) => r.asOf)).toEqual(days.slice(-5, -1).map((d) => d.date));
  });
});
