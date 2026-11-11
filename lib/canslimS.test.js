import { describe, it, expect } from "vitest";
import { analyzeSupplyDemand, upDownVolume } from "./canslimS";

// Alternating up and down days; up days carry `upVol`, down days `downVol`.
function candles(upVol, downVol, count = 60) {
  let close = 100;
  return Array.from({ length: count }, (_, i) => {
    const up = i % 2 === 0;
    close *= up ? 1.01 : 0.995;
    return { time: `d-${i}`, close, volume: up ? upVol : downVol };
  });
}

const supply = (overrides = {}) => ({
  shares: { now: 1000, yearAgo: 1000 },
  debt: { value: 20 },
  debtYearAgo: 20,
  equity: { value: 100 },
  ...overrides,
});

describe("upDownVolume", () => {
  it("compares volume on up days with volume on down days", () => {
    const v = upDownVolume(candles(200, 100), 50);
    expect(v.ratio).toBeCloseTo(2, 1);
    expect(v.sessions).toBe(50);
  });
});

describe("analyzeSupplyDemand", () => {
  it("calls heavy up-day volume with modest debt and no dilution strong", () => {
    expect(analyzeSupplyDemand(candles(200, 100), supply()).verdict).toBe("strong");
  });

  it("passes when buyers are only somewhat ahead", () => {
    expect(analyzeSupplyDemand(candles(120, 100), supply()).verdict).toBe("pass");
  });

  it("warns when sellers are slightly ahead, and fails under clear distribution", () => {
    expect(analyzeSupplyDemand(candles(90, 100), supply()).verdict).toBe("warning");
    expect(analyzeSupplyDemand(candles(60, 100), supply()).verdict).toBe("fail");
  });

  it("warns on dilution and notes buybacks", () => {
    const diluted = analyzeSupplyDemand(candles(200, 100), supply({ shares: { now: 1100, yearAgo: 1000 } }));
    expect(diluted.verdict).toBe("warning");
    const buyback = analyzeSupplyDemand(candles(200, 100), supply({ shares: { now: 950, yearAgo: 1000 } }));
    expect(buyback.reasons.some((r) => r.text.includes("buying back"))).toBe(true);
  });

  it("warns on high debt", () => {
    const result = analyzeSupplyDemand(candles(200, 100), supply({ debt: { value: 150 } }));
    expect(result.verdict).toBe("warning");
    expect(result.stats.debtToEquity).toBeCloseTo(1.5);
  });

  it("doesn't judge debt-to-equity when equity is negative", () => {
    const result = analyzeSupplyDemand(candles(200, 100), supply({ equity: { value: -10 } }));
    expect(result.stats.debtToEquity).toBeNull();
    expect(result.reasons.some((r) => r.text.includes("isn't meaningful"))).toBe(true);
  });
});
