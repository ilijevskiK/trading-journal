import { describe, it, expect } from "vitest";
import { analyzeLeadership } from "./canslimL";

// Daily closes compounding at a fixed rate per session.
function series(dailyPct, count = 300, { dipAt = null, dipPct = 0 } = {}) {
  let close = 100;
  return Array.from({ length: count }, (_, i) => {
    close *= 1 + dailyPct / 100;
    if (dipAt !== null && i === dipAt) close *= 1 - dipPct / 100;
    return { time: `d-${String(i).padStart(4, "0")}`, close };
  });
}

const spy = series(0.05);

describe("analyzeLeadership", () => {
  it("needs a year of history alongside SPY", () => {
    expect(analyzeLeadership(series(0.2, 200), spy).verdict).toBeNull();
  });

  it("fails a stock that trails the market", () => {
    expect(analyzeLeadership(series(0.01), spy).verdict).toBe("fail");
  });

  it("calls a strong outperformer with its RS line at a new high strong", () => {
    const result = analyzeLeadership(series(0.25), spy);
    expect(result.verdict).toBe("strong");
    expect(result.stats.edge).toBeGreaterThan(20);
    expect(result.stats.rsBelowHighPct).toBeLessThan(1);
  });

  it("warns when it still outperforms over the year but its RS line has fallen back", () => {
    const result = analyzeLeadership(series(0.25, 300, { dipAt: 290, dipPct: 15 }), spy);
    expect(result.stats.edge).toBeGreaterThan(0);
    expect(result.stats.rsBelowHighPct).toBeGreaterThan(10);
    expect(result.verdict).toBe("warning");
  });

  it("only compares dates both traded on", () => {
    const stock = series(0.25).filter((_, i) => i !== 150);
    const result = analyzeLeadership(stock, spy);
    expect(result.stats.rsLine.every((p) => Number.isFinite(p.value))).toBe(true);
  });

  describe("with an RS Rating", () => {
    it("lets the rating decide: 80+ passes, 70-79 warns, below 70 fails", () => {
      const stock = series(0.25);
      expect(analyzeLeadership(stock, spy, { rsRating: 85 }).verdict).toBe("pass");
      expect(analyzeLeadership(stock, spy, { rsRating: 75 }).verdict).toBe("warning");
      expect(analyzeLeadership(stock, spy, { rsRating: 50 }).verdict).toBe("fail");
    });

    it("calls 90+ with the RS line at a new high strong", () => {
      expect(analyzeLeadership(series(0.25), spy, { rsRating: 95 }).verdict).toBe("strong");
    });

    it("keeps the S&P 500 comparison as supporting detail", () => {
      const { reasons } = analyzeLeadership(series(0.25), spy, { rsRating: 85 });
      expect(reasons[0].text).toContain("RS Rating 85");
      expect(reasons.some((r) => r.level === "info" && r.text.includes("S&P 500"))).toBe(true);
    });
  });
});
