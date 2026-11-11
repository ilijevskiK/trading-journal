import { describe, it, expect } from "vitest";
import { rsScore, computeRsRatings, snapshotTargets } from "./rsRating";

function snapshots(stocks) {
  const maps = { now: new Map(), m3: new Map(), m6: new Map(), m9: new Map(), m12: new Map() };
  for (const [ticker, prices] of Object.entries(stocks)) {
    for (const [key, price] of Object.entries(prices)) if (price != null) maps[key].set(ticker, price);
  }
  return maps;
}

describe("rsScore", () => {
  it("weights the latest quarter double", () => {
    // +10% over 3 months, flat before that: 0.4*10 + 0.2*(10+10+10) = 10.
    expect(rsScore(110, { m3: 100, m6: 100, m9: 100, m12: 100 })).toBeCloseTo(10);
    // Same 12-month gain but all of it long ago scores lower.
    expect(rsScore(110, { m3: 110, m6: 110, m9: 110, m12: 100 })).toBeCloseTo(2);
  });

  it("scores a recent listing on the periods it has", () => {
    expect(rsScore(120, { m3: 100 })).toBeCloseTo(20);
    expect(rsScore(120, {})).toBeNull();
  });
});

describe("computeRsRatings", () => {
  const stocks = {
    WEAK: { now: 80, m3: 100, m6: 100, m9: 100, m12: 100 },
    FLAT: { now: 100, m3: 100, m6: 100, m9: 100, m12: 100 },
    GOOD: { now: 130, m3: 100, m6: 100, m9: 100, m12: 100 },
    BEST: { now: 200, m3: 120, m6: 110, m9: 100, m12: 90 },
    ETF: { now: 300, m3: 100, m6: 100, m9: 100, m12: 100 },
  };

  it("ranks stocks from 1 to 99 by weighted performance", () => {
    const ratings = Object.fromEntries(computeRsRatings(snapshots(stocks)).map((r) => [r.ticker, r.rating]));
    expect(ratings.WEAK).toBe(1);
    expect(ratings.ETF).toBe(99);
    expect(ratings.FLAT).toBeLessThan(ratings.GOOD);
    expect(ratings.GOOD).toBeLessThan(ratings.BEST);
  });

  it("only ranks tickers in the universe", () => {
    const universe = new Set(["WEAK", "FLAT", "GOOD", "BEST"]);
    const ratings = computeRsRatings(snapshots(stocks), universe);
    expect(ratings.map((r) => r.ticker)).not.toContain("ETF");
    expect(ratings.find((r) => r.ticker === "BEST").rating).toBe(99);
  });

  it("gives tied scores the same rating", () => {
    const tied = snapshots({
      A: { now: 110, m3: 100 },
      B: { now: 110, m3: 100 },
      C: { now: 90, m3: 100 },
    });
    const ratings = computeRsRatings(tied);
    expect(ratings.find((r) => r.ticker === "A").rating).toBe(ratings.find((r) => r.ticker === "B").rating);
  });
});

describe("snapshotTargets", () => {
  it("targets the latest date and 3, 6, 9 and 12 months before it", () => {
    expect(snapshotTargets("2026-11-10")).toEqual({
      now: "2026-11-10",
      m3: "2026-08-10",
      m6: "2026-05-10",
      m9: "2026-02-10",
      m12: "2025-11-10",
    });
  });
});
