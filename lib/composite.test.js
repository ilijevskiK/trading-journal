import { describe, it, expect } from "vitest";
import { makeDay } from "./priceHistory";
import { AD_SESSIONS, accDistBalance, buildComposite, groupRating, letterGrade, percentileRatings, smrRatings, weightedAverage } from "./composite";

function history(count, prices, volumes = {}) {
  const dates = [];
  for (let d = new Date("2026-11-10T00:00:00Z"); dates.length < count; d.setUTCDate(d.getUTCDate() - 1)) {
    if (![0, 6].includes(d.getUTCDay())) dates.unshift(d.toISOString().slice(0, 10));
  }
  return dates.map((date, i) => {
    const tickers = Object.keys(prices).filter((t) => prices[t](i) != null);
    const closes = tickers.map((t) => prices[t](i));
    return makeDay(date, tickers, closes, closes.map((c) => c * 1.01), tickers.map((t) => volumes[t]?.(i) ?? 1_000_000));
  });
}
const noSplits = new Map();

describe("groupRating", () => {
  it("maps rank 1 to 99 and the last rank to 1", () => {
    expect(groupRating(1, 200)).toBe(99);
    expect(groupRating(200, 200)).toBe(1);
    expect(groupRating(100, 199)).toBe(50);
    expect(groupRating(1, 1)).toBe(99);
    expect(groupRating(null, 10)).toBeNull();
  });
});

describe("percentileRatings", () => {
  it("rates the share of others beaten, ties sharing the lower rank", () => {
    const r = percentileRatings(new Map([["A", 1], ["B", 2], ["C", 2], ["D", 3], ["E", NaN]]));
    expect(r.get("A")).toBe(1);
    expect(r.get("B")).toBe(r.get("C"));
    expect(r.get("D")).toBe(99);
    expect(r.has("E")).toBe(false);
  });
});

describe("letterGrade", () => {
  it("splits 1-99 into fifths", () => {
    expect([99, 80, 79, 60, 59, 40, 39, 20, 19, 1].map(letterGrade)).toEqual(["A", "A", "B", "B", "C", "C", "D", "D", "E", "E"]);
    expect(letterGrade(null)).toBeNull();
  });
});

describe("weightedAverage", () => {
  it("weights present parts and rescales over missing ones", () => {
    expect(weightedAverage({ rs: 90, group: 60, accDist: 60, nearHigh: 60 }, { rs: 2, group: 1, accDist: 1, nearHigh: 1 })).toBe(72);
    expect(weightedAverage({ rs: 90, group: null }, { rs: 2, group: 1 })).toBe(90);
    expect(weightedAverage({}, { rs: 2 })).toBeNull();
  });
});

describe("accDistBalance", () => {
  const sessions = AD_SESSIONS + 5;
  it("is positive when volume is heavier on up days", () => {
    const days = history(sessions, { UP: (i) => 100 + i, DOWN: (i) => 200 - i, FLAT: () => 50 }, { UP: () => 1_000_000, DOWN: () => 1_000_000 });
    expect(accDistBalance("UP", days, noSplits)).toBe(1);
    expect(accDistBalance("DOWN", days, noSplits)).toBe(-1);
    expect(accDistBalance("FLAT", days, noSplits)).toBeNull(); // no up or down volume
  });

  it("weights by volume, not by counting days", () => {
    // up on odd sessions with 3x volume, down on even ones
    const price = (i) => 100 + (i % 2 ? 1 : 0);
    const vol = (i) => (i % 2 ? 3_000_000 : 1_000_000);
    const b = accDistBalance("X", history(sessions, { X: price }, { X: vol }), noSplits);
    expect(b).toBeCloseTo(0.5, 1);
  });

  it("needs enough sessions", () => {
    expect(accDistBalance("A", history(20, { A: (i) => 100 + i }), noSplits)).toBeNull();
  });

  it("isn't fooled by a split", () => {
    const days = history(sessions, { A: (i) => (i < 40 ? 1000 + i : 100 + i) });
    const splits = new Map([["A", [{ date: days[40].date, ratio: 10 }]]]);
    expect(accDistBalance("A", days, splits)).toBe(1);
  });
});

describe("buildComposite", () => {
  const days = history(300, {
    LEAD: (i) => 100 + i, // steady climb, at its high
    LAG: (i) => 400 - i, // steady decline
    NEW: (i) => (i < 250 ? null : 50 + i), // listed recently
  });
  const ratings = new Map([["LEAD", 95], ["LAG", 10], ["NEW", 70], ["NORS", 50], ["GONE", 90]]);
  const groups = new Map([["LEAD", { name: "Top group", rank: 1, total: 100 }], ["LAG", { name: "Bottom group", rank: 100, total: 100 }]]);

  const rows = buildComposite({ days, splits: noSplits, tickers: ["LEAD", "LAG", "NEW", "NORS", "GONE"], ratings, groups, names: new Map([["LEAD", "Lead Inc"]]) });

  it("ranks the strong stock above the weak one, 1-99", () => {
    expect(rows.map((r) => r.ticker)).toEqual(["LEAD", "NEW", "LAG"]);
    expect(rows[0].composite).toBe(99);
    expect(rows[2].composite).toBe(1);
    expect(rows[0]).toMatchObject({ name: "Lead Inc", group: { name: "Top group" } });
  });

  it("drops stocks with no RS Rating or no trading on the latest day", () => {
    expect(rows.find((r) => r.ticker === "NORS")).toBeUndefined();
    expect(rows.find((r) => r.ticker === "GONE")).toBeUndefined();
  });

  it("scores a stock without a group on the parts it has", () => {
    const r = rows.find((x) => x.ticker === "NEW");
    expect(r.parts.group).toBeNull();
    expect(r.parts.rs).toBe(70);
    expect(r.composite).not.toBeNull();
  });
});

describe("smrRatings", () => {
  it("averages each stock's ranks on growth, margin and ROE, and needs at least two", () => {
    const r = smrRatings(
      new Map([
        ["GOOD", { growth: 40, margin: 25, roe: 30 }],
        ["MID", { growth: 10, margin: 10, roe: 10 }],
        ["POOR", { growth: -5, margin: -3, roe: -8 }],
        ["ONE", { growth: 50, margin: null, roe: null }],
        ["NONE", { growth: null, margin: null, roe: null }],
      ])
    );
    expect(r.get("GOOD")).toBeGreaterThan(r.get("MID"));
    expect(r.get("MID")).toBeGreaterThan(r.get("POOR"));
    expect(r.has("ONE")).toBe(false);
    expect(r.has("NONE")).toBe(false);
  });
});

describe("buildComposite with fundamentals", () => {
  // Same price action for both, so only the earnings and SMR can separate them.
  const days = history(300, { A: (i) => 100 + i, B: (i) => 100 + i });
  const ratings = new Map([["A", 80], ["B", 80]]);
  const q = (growth) => [{ eps: 1, growth, turnaround: false }];
  const fundamentals = new Map([
    ["A", { epsQ: q(60), revenueGrowth: 30, netMargin: 20, roe: 25 }],
    ["B", { epsQ: q(-20), revenueGrowth: -5, netMargin: 2, roe: 3 }],
  ]);

  it("ranks the stock with stronger earnings and SMR higher", () => {
    const rows = buildComposite({ days, splits: new Map(), tickers: ["A", "B"], ratings, fundamentals });
    expect(rows.map((r) => r.ticker)).toEqual(["A", "B"]);
    expect(rows[0].parts.eps).toBeGreaterThan(rows[1].parts.eps);
    expect(rows[0].parts.smr).toBeGreaterThan(rows[1].parts.smr);
    expect(rows[0].facts).toMatchObject({ epsGrowth: 60, roe: 25 });
  });

  it("still rates a stock with no filings, on the other parts", () => {
    const rows = buildComposite({ days, splits: new Map(), tickers: ["A", "B"], ratings, fundamentals: new Map() });
    expect(rows).toHaveLength(2);
    expect(rows[0].parts.eps).toBeNull();
    expect(rows[0].facts).toBeNull();
  });
});
