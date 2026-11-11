import { describe, it, expect } from "vitest";
import { analyzeAnnualEarnings, annualComparisons } from "./canslimA";

// Fiscal years ending each December; equity flat at 100 so ROE = net income.
function years(eps, { netIncome, equity = 100, cashFlow } = {}) {
  return eps.map((e, i) => ({
    end: `${2020 + i}-12-31`,
    start: `${2020 + i}-01-01`,
    eps: e,
    netIncome: netIncome ?? e * 10,
    operatingCashFlow: cashFlow ?? e * 12,
    equityStart: equity,
    equityEnd: equity,
  }));
}

const verdictOf = (eps, opts) => analyzeAnnualEarnings(years(eps, opts)).verdict;

describe("annualComparisons", () => {
  it("computes year-over-year growth, ROE from average equity, and the cash-flow ratio", () => {
    const rows = annualComparisons(years([1, 1.5], { netIncome: 20, cashFlow: 30 }));
    expect(rows[1].epsGrowth).toBeCloseTo(50);
    expect(rows[1].roe).toBeCloseTo(20);
    expect(rows[1].cashFlowRatio).toBeCloseTo(1.5);
  });
});

describe("analyzeAnnualEarnings", () => {
  it("needs at least two fiscal years", () => {
    expect(verdictOf([1])).toBeNull();
  });

  it("fails a loss in the latest year", () => {
    expect(verdictOf([1, 1.3, 1.6, -0.2])).toBe("fail");
  });

  it("fails a decline in the latest year", () => {
    expect(verdictOf([1, 1.3, 1.8, 1.6])).toBe("fail");
  });

  it("fails growth under 25% a year", () => {
    expect(verdictOf([1, 1.1, 1.2, 1.3])).toBe("fail");
  });

  it("passes 25%+ a year, up every year, with solid ROE", () => {
    // ~30% a year; ROE 20% (net income 20 on equity 100).
    expect(verdictOf([1, 1.3, 1.69, 2.2], { netIncome: 20 })).toBe("pass");
  });

  it("calls 40%+ a year with 25%+ ROE strong", () => {
    expect(verdictOf([1, 1.5, 2.25, 3.4], { netIncome: 30 })).toBe("strong");
  });

  it("warns when an earlier dip was followed by a new high", () => {
    expect(verdictOf([1, 0.9, 1.8, 2.6], { netIncome: 20 })).toBe("warning");
  });

  it("fails when an earlier dip hasn't been recovered", () => {
    expect(verdictOf([1, 3, 2, 2.5], { netIncome: 20 })).toBe("fail");
  });

  it("warns on weak ROE", () => {
    expect(verdictOf([1, 1.3, 1.69, 2.2], { netIncome: 10 })).toBe("warning");
  });

  it("warns when there are fewer than three years of history", () => {
    expect(verdictOf([1, 1.5, 2.25], { netIncome: 30 })).toBe("warning");
  });

  it("says ROE isn't meaningful with negative equity, without failing for it", () => {
    const result = analyzeAnnualEarnings(years([1, 1.3, 1.69, 2.2], { equity: -50 }));
    expect(result.verdict).toBe("pass");
    expect(result.reasons.some((r) => r.text.includes("isn't meaningful"))).toBe(true);
  });

  it("shows the base year plus the three judged years, newest first", () => {
    const { rows } = analyzeAnnualEarnings(years([1, 1.2, 1.4, 1.7, 2.1]));
    expect(rows.map((r) => r.eps)).toEqual([2.1, 1.7, 1.4, 1.2]);
  });
});
