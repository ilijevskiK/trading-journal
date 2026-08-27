import { describe, it, expect } from "vitest";
import { computeATR, computeVWAP } from "./indicatorMath";

function candle({ time, open, high, low, close, volume }) {
  return { time, open, high, low, close, volume };
}

describe("computeATR", () => {
  it("seeds with a plain average of the first `period` true ranges, then smooths", () => {
    // Constant true range of 2 on every bar (high-low=2, no gaps) — ATR
    // should settle at exactly 2 once the seed window fills, regardless of
    // period, since there's no variation for smoothing to react to.
    const candles = Array.from({ length: 10 }, (_, i) =>
      candle({ time: `2026-01-${String(i + 1).padStart(2, "0")}`, open: 10, high: 11, low: 9, close: 10 })
    );
    const result = computeATR(candles, { period: 3 });
    expect(result[0].value).toBeNull();
    expect(result[1].value).toBeNull();
    expect(result[2].value).toBe(2);
    expect(result[9].value).toBe(2);
  });

  it("reacts to a volatility spike after the seed window", () => {
    const flat = Array.from({ length: 5 }, (_, i) =>
      candle({ time: `2026-01-0${i + 1}`, open: 10, high: 11, low: 9, close: 10 })
    );
    const spike = candle({ time: "2026-01-06", open: 10, high: 20, low: 5, close: 15 });
    const result = computeATR([...flat, spike], { period: 3 });
    // True range on the spike bar is 15 (high-low), well above the prior
    // flat ATR of 2, so smoothed ATR should rise but not jump all the way
    // to 15 (Wilder's smoothing dampens a single outlier bar).
    const last = result[result.length - 1].value;
    expect(last).toBeGreaterThan(2);
    expect(last).toBeLessThan(15);
  });
});

describe("computeVWAP", () => {
  it("accumulates volume-weighted typical price within a single day", () => {
    const candles = [
      candle({ time: 1700000000, open: 10, high: 11, low: 9, close: 10, volume: 100 }), // typical 10
      candle({ time: 1700003600, open: 10, high: 13, low: 11, close: 12, volume: 300 }), // typical 12
    ];
    const result = computeVWAP(candles);
    expect(result[0].value).toBe(10);
    // (10*100 + 12*300) / 400 = 11.5
    expect(result[1].value).toBeCloseTo(11.5, 5);
  });

  it("resets cumulative sums at a new calendar day", () => {
    const day1 = candle({ time: "2026-01-05", open: 10, high: 12, low: 8, close: 10, volume: 100 });
    const day2 = candle({ time: "2026-01-06", open: 20, high: 22, low: 18, close: 20, volume: 50 });
    const result = computeVWAP([day1, day2]);
    // Each daily bar is its own session — VWAP degenerates to that bar's
    // own typical price, not an average across days.
    expect(result[0].value).toBeCloseTo((12 + 8 + 10) / 3, 5);
    expect(result[1].value).toBeCloseTo((22 + 18 + 20) / 3, 5);
  });

  it("returns null while no volume has accumulated yet", () => {
    const candles = [
      candle({ time: 1700000000, open: 10, high: 11, low: 9, close: 10, volume: 0 }),
      candle({ time: 1700003600, open: 10, high: 11, low: 9, close: 10 }), // volume undefined
    ];
    const result = computeVWAP(candles);
    expect(result[0].value).toBeNull();
    expect(result[1].value).toBeNull();
  });
});
