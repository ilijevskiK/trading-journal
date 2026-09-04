import { describe, it, expect } from "vitest";
import { computeATR, computeVWAP, computeTrendTemplate } from "./indicatorMath";

function candle({ time, open, high, low, close, volume }) {
  return { time, open, high, low, close, volume };
}

// A steady linear uptrend, long enough (300 bars) for the 200-day MA, its
// 20-bar slope lookback, and the 252-bar 52-week high/low to all be valid
// well before the end of the series.
function risingSeries(length, { start = 100, step = 0.5 } = {}) {
  return Array.from({ length }, (_, i) => {
    const close = start + i * step;
    return candle({ time: `bar-${String(i).padStart(4, "0")}`, open: close, high: close + 1, low: close - 1, close });
  });
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

describe("computeTrendTemplate", () => {
  it("returns [] with no benchmark candles", () => {
    expect(computeTrendTemplate(risingSeries(300), [])).toEqual([]);
    expect(computeTrendTemplate(risingSeries(300), null)).toEqual([]);
  });

  it("passes all 8 checks for a stock in a steady uptrend, outpacing a slower-rising benchmark", () => {
    const candles = risingSeries(300, { start: 100, step: 0.5 });
    const benchmark = risingSeries(300, { start: 50, step: 0.1 });
    const points = computeTrendTemplate(candles, benchmark);
    expect(points.length).toBeGreaterThan(0);
    const last = points[points.length - 1];
    expect(last.checks).toMatchObject({
      priceAboveMa150And200: true,
      ma150AboveMa200: true,
      ma200Rising: true,
      ma50AboveMa150And200: true,
      priceAboveMa50: true,
      above30PctFromLow: true,
      within25PctOfHigh: true,
      relativeStrengthRising: true,
    });
    expect(last.passCount).toBe(8);
    expect(last.qualifies).toBe(true);
  });

  it("fails MA-stacking checks after a sharp decline erases a prior uptrend", () => {
    const uptrend = risingSeries(300, { start: 100, step: 0.5 });
    const decline = Array.from({ length: 60 }, (_, i) => {
      const close = 250 - i * 3;
      return candle({
        time: `bar-${String(300 + i).padStart(4, "0")}`,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
      });
    });
    const candles = [...uptrend, ...decline];
    const benchmark = risingSeries(candles.length, { start: 50, step: 0.1 });
    const points = computeTrendTemplate(candles, benchmark);
    const last = points[points.length - 1];
    expect(last.checks.ma50AboveMa150And200).toBe(false);
    expect(last.checks.priceAboveMa50).toBe(false);
    expect(last.passCount).toBeLessThan(8);
    expect(last.qualifies).toBe(false);
  });
});
