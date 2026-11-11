import { describe, it, expect } from "vitest";
import { analyzeNewHighs } from "./canslimN";

// Candles from a list of closes; each bar's range is ±1% and volume 1000
// unless overridden at a specific index.
function candles(closes, volumes = {}) {
  return closes.map((close, i) => ({
    time: `d-${String(i).padStart(4, "0")}`,
    open: close,
    high: close * 1.01,
    low: close * 0.99,
    close,
    volume: volumes[i] ?? 1000,
  }));
}

const ramp = (from, to, steps) => Array.from({ length: steps }, (_, i) => from + ((to - from) * (i + 1)) / steps);

// Up to 150, a 20% cup over ~8 weeks, a small handle, then a breakout day.
function cupWithBreakout({ breakoutClose = 153, breakoutVolume = 2000, depthTo = 120 } = {}) {
  const closes = [...ramp(100, 150, 120), ...ramp(150, depthTo, 20), ...ramp(depthTo, 148, 20), ...ramp(148, 142, 5)];
  closes.push(breakoutClose);
  return candles(closes, { [closes.length - 1]: breakoutVolume });
}

const PIVOT = 150;

describe("analyzeNewHighs", () => {
  it("needs some price history", () => {
    expect(analyzeNewHighs(candles(ramp(100, 110, 30))).verdict).toBeNull();
  });

  it("fails a stock far below its 52-week high", () => {
    const result = analyzeNewHighs(candles([...ramp(100, 200, 100), ...ramp(200, 130, 20)]), { newConfirmed: true });
    expect(result.verdict).toBe("fail");
    expect(result.stats.pctBelowHigh).toBeGreaterThan(25);
  });

  it("warns until something new is confirmed, and asks for a pivot", () => {
    const result = analyzeNewHighs(candles(ramp(100, 150, 120)));
    expect(result.verdict).toBe("warning");
    expect(result.reasons.some((r) => r.text.includes("Enter the pivot"))).toBe(true);
  });

  it("calls a confirmed, high-volume breakout in the buy range strong, and measures the base", () => {
    const result = analyzeNewHighs(cupWithBreakout(), { pivot: PIVOT, newConfirmed: true });
    expect(result.verdict).toBe("strong");
    expect(result.stats.zone).toBe("buy");
    expect(result.stats.base.depthPct).toBeGreaterThan(19);
    expect(result.stats.base.depthPct).toBeLessThan(22);
    expect(result.stats.base.weeks).toBeGreaterThanOrEqual(5);
    expect(result.stats.breakoutVolumePct).toBeGreaterThan(40);
  });

  it("warns when price is extended past the buy range", () => {
    const result = analyzeNewHighs(cupWithBreakout({ breakoutClose: 165 }), { pivot: PIVOT, newConfirmed: true });
    expect(result.stats.zone).toBe("extended");
    expect(result.verdict).toBe("warning");
  });

  it("warns on a breakout without volume", () => {
    const result = analyzeNewHighs(cupWithBreakout({ breakoutVolume: 1100 }), { pivot: PIVOT, newConfirmed: true });
    expect(result.verdict).toBe("warning");
    expect(result.reasons.some((r) => r.text.includes("weak volume"))).toBe(true);
  });

  it("warns when price hasn't broken out yet", () => {
    const result = analyzeNewHighs(cupWithBreakout({ breakoutClose: 145 }), { pivot: PIVOT, newConfirmed: true });
    expect(result.stats.zone).toBe("below");
    expect(result.verdict).toBe("warning");
  });

  it("fails a base that's far too deep", () => {
    const deep = candles([...ramp(100, 150, 120), ...ramp(150, 60, 20), ...ramp(60, 148, 30), 153], { 170: 2000 });
    const result = analyzeNewHighs(deep, { pivot: PIVOT, newConfirmed: true });
    expect(result.stats.base.depthPct).toBeGreaterThan(50);
    expect(result.verdict).toBe("fail");
  });
});
