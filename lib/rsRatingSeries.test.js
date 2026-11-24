import { describe, it, expect } from "vitest";
import { ratingPointsForCandles } from "./rsRatingSeries.js";

const history = [
  { asOf: "2026-11-02", rating: 70 },
  { asOf: "2026-11-03", rating: 75 },
  { asOf: "2026-11-05", rating: 82 },
];

describe("ratingPointsForCandles", () => {
  it("gives each candle the latest rating on or before its date, and none before the first", () => {
    const candles = ["2026-10-30", "2026-11-02", "2026-11-04", "2026-11-05", "2026-11-09"].map((time) => ({ time }));
    expect(ratingPointsForCandles(candles, history)).toEqual([
      { time: "2026-11-02", value: 70 },
      { time: "2026-11-04", value: 75 },
      { time: "2026-11-05", value: 82 },
      { time: "2026-11-09", value: 82 },
    ]);
  });

  it("handles intraday candles with numeric timestamps", () => {
    const t = Date.parse("2026-11-03T15:00:00Z") / 1000;
    expect(ratingPointsForCandles([{ time: t }], history)).toEqual([{ time: t, value: 75 }]);
  });

  it("returns nothing without history", () => {
    expect(ratingPointsForCandles([{ time: "2026-11-05" }], [])).toEqual([]);
    expect(ratingPointsForCandles([{ time: "2026-11-05" }], null)).toEqual([]);
  });
});
