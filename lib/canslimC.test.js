import { describe, it, expect } from "vitest";
import { analyzeCurrentEarnings, quarterComparisons } from "./canslimC";

// Quarter ends 91 days apart, so every 4th quarter back is "a year ago".
function quarters(eps, revenue = eps.map(() => null)) {
  return eps.map((e, i) => ({
    end: new Date(Date.UTC(2024, 0, 1) + i * 91 * 86400000).toISOString().slice(0, 10),
    eps: e,
    revenue: revenue[i],
    netIncome: revenue[i] != null ? revenue[i] * 0.1 : null,
    derived: false,
  }));
}

const verdictOf = (eps, revenue) => analyzeCurrentEarnings(quarters(eps, revenue)).verdict;

describe("quarterComparisons", () => {
  it("compares each quarter with the same quarter a year earlier", () => {
    const rows = quarterComparisons(quarters([1, 1, 1, 1, 1.5]));
    expect(rows[4].priorEps).toBe(1);
    expect(rows[4].epsGrowth).toBeCloseTo(50);
    expect(rows[3].hasPrior).toBe(false);
  });
});

describe("analyzeCurrentEarnings", () => {
  const sales = (growthPct) => [100, 100, 100, 100, 100, 100, 100, 100 * (1 + growthPct / 100)];

  it("needs at least one year-ago comparison", () => {
    expect(verdictOf([1, 1, 1])).toBeNull();
  });

  it("fails a loss in the latest quarter", () => {
    expect(verdictOf([1, 1, 1, 1, -0.2])).toBe("fail");
  });

  it("fails growth under 25%", () => {
    expect(verdictOf([1, 1, 1, 1, 1.2])).toBe("fail");
  });

  it("warns on a turnaround from a loss instead of failing it", () => {
    const result = analyzeCurrentEarnings(quarters([-0.5, 1, 1, 1, 0.8]));
    expect(result.verdict).toBe("warning");
    expect(result.reasons[0].text).toContain("Turnaround");
  });

  it("warns on a jump from a tiny base", () => {
    expect(verdictOf([0.02, 1, 1, 1, 0.08])).toBe("warning");
  });

  it("calls 40%+ growth that's speeding up, backed by sales, strong", () => {
    // Year-ago EPS all 1.00; growth goes +30% then +60%.
    const eps = [1, 1, 1, 1, 1, 1, 1.3, 1.6];
    expect(verdictOf(eps, sales(30))).toBe("strong");
  });

  it("passes 25%+ growth that isn't speeding up", () => {
    const eps = [1, 1, 1, 1, 1, 1, 1.5, 1.3];
    expect(verdictOf(eps, sales(30))).toBe("pass");
  });

  it("warns when growth has slowed two quarters in a row", () => {
    const eps = [1, 1, 1, 1, 1, 1.9, 1.6, 1.3];
    const result = analyzeCurrentEarnings(quarters(eps, sales(30)));
    expect(result.verdict).toBe("warning");
    expect(result.reasons.some((r) => r.text.includes("slowed two quarters"))).toBe(true);
  });

  it("warns when sales don't back the earnings growth", () => {
    const eps = [1, 1, 1, 1, 1, 1, 1.3, 1.6];
    expect(verdictOf(eps, sales(5))).toBe("warning");
  });

  it("shows the latest four comparable quarters, newest first", () => {
    const { rows } = analyzeCurrentEarnings(quarters([1, 1, 1, 1, 1.1, 1.2, 1.3, 1.4, 1.5]));
    expect(rows).toHaveLength(4);
    expect(rows[0].eps).toBe(1.5);
  });
});
