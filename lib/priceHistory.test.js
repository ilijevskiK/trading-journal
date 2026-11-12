import { describe, it, expect } from "vitest";
import { makeDay, splitsByTicker, priceFactor, barOn, dayOnOrBefore, closesMap } from "./priceHistory";

const split = (ticker, execution_date, split_from, split_to) => ({ ticker, execution_date, split_from, split_to });

describe("splitsByTicker", () => {
  it("leaves out splits that haven't happened yet and bad records", () => {
    const byTicker = splitsByTicker(
      [split("AAA", "2026-06-01", 1, 10), split("AAA", "2026-12-01", 1, 2), split("BBB", "2026-06-01", 0, 2)],
      "2026-11-10"
    );
    expect(byTicker.get("AAA")).toEqual([{ date: "2026-06-01", ratio: 10 }]);
    expect(byTicker.has("BBB")).toBe(false);
  });
});

describe("priceFactor", () => {
  const splits = [
    { date: "2026-03-01", ratio: 2 }, // 2-for-1
    { date: "2026-09-01", ratio: 0.1 }, // 1-for-10 reverse
  ];
  it("adjusts prices from before each split, and only those", () => {
    expect(priceFactor(splits, "2026-01-15")).toBeCloseTo(5); // /2 then x10
    expect(priceFactor(splits, "2026-03-01")).toBeCloseTo(10); // the execution day already trades split
    expect(priceFactor(splits, "2026-10-01")).toBe(1);
    expect(priceFactor(undefined, "2026-01-15")).toBe(1);
  });
});

describe("barOn", () => {
  it("returns split-adjusted price and volume", () => {
    const day = makeDay("2026-05-01", ["AAA"], [1000], [1100], [50]);
    const splits = new Map([["AAA", [{ date: "2026-06-01", ratio: 10 }]]]);
    expect(barOn(day, "AAA", splits)).toEqual({ close: 100, high: 110, volume: 500 });
    expect(barOn(day, "ZZZ", splits)).toBeNull();
  });
});

describe("dayOnOrBefore", () => {
  const days = ["2026-05-01", "2026-05-04", "2026-05-05"].map((d) => makeDay(d, [], [], [], []));
  it("steps back over weekends and holidays, but not more than a week", () => {
    expect(dayOnOrBefore(days, "2026-05-03").date).toBe("2026-05-01");
    expect(dayOnOrBefore(days, "2026-05-05").date).toBe("2026-05-05");
    expect(dayOnOrBefore(days, "2026-05-20")).toBeNull();
    expect(dayOnOrBefore(days, "2026-04-01")).toBeNull();
  });
});

describe("closesMap", () => {
  it("is empty for a missing day", () => {
    expect(closesMap(null, new Map()).size).toBe(0);
  });
});
