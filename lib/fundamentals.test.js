import { describe, it, expect } from "vitest";
import { epsScore, smrInputs, summarizeFundamentals } from "./fundamentals";

const row = (start, end, val, form = "10-Q") => ({ start, end, val, form, filed: end });
const tag = (unit, rows) => ({ units: { [unit]: rows } });

// Ten quarters ending 2026-06-30: EPS up 50% a year, sales up 20%, 10% margin.
const QUARTERS = [
  ["2024-01-01", "2024-03-31", 1.0, 100], ["2024-04-01", "2024-06-30", 1.0, 100], ["2024-07-01", "2024-09-30", 1.0, 100],
  ["2024-10-01", "2024-12-31", 1.0, 100], ["2025-01-01", "2025-03-31", 1.2, 120], ["2025-04-01", "2025-06-30", 1.5, 120],
  ["2025-07-01", "2025-09-30", 1.5, 120], ["2025-10-01", "2025-12-31", 1.5, 120], ["2026-01-01", "2026-03-31", 1.8, 144],
  ["2026-04-01", "2026-06-30", 2.25, 144],
];
const YEARS = [["2022", 1.0], ["2023", 1.5], ["2024", 2.25], ["2025", 3.375]];

const facts = {
  facts: {
    "us-gaap": {
      EarningsPerShareDiluted: tag("USD/shares", [
        ...QUARTERS.map(([s, e, eps]) => row(s, e, eps)),
        ...YEARS.map(([y, eps]) => row(`${y}-01-01`, `${y}-12-31`, eps, "10-K")),
      ]),
      Revenues: tag("USD", QUARTERS.map(([s, e, , rev]) => row(s, e, rev))),
      NetIncomeLoss: tag("USD", [
        ...QUARTERS.map(([s, e, , rev]) => row(s, e, rev * 0.1)),
        ...YEARS.map(([y]) => row(`${y}-01-01`, `${y}-12-31`, 20, "10-K")),
      ]),
      StockholdersEquity: tag("USD", [2021, 2022, 2023, 2024, 2025].map((y) => ({ end: `${y}-12-31`, val: 100, form: "10-K", filed: `${y + 1}-02-15` }))),
    },
  },
};

describe("summarizeFundamentals", () => {
  it("boils the filings down to growth, margin and ROE", () => {
    const f = summarizeFundamentals(facts, "2026-08-01");
    expect(f.quarterEnd).toBe("2026-06-30");
    expect(f.epsQ.map((q) => Math.round(q.growth))).toEqual([50, 50]);
    expect(f.revenueGrowth).toBeCloseTo(20, 5);
    expect(f.netMargin).toBeCloseTo(10, 5);
    expect(f.epsCagr3y).toBeCloseTo(50, 0);
    expect(f.roe).toBeCloseTo(20, 5);
  });

  it("ignores quarterly figures once the company has stopped reporting them", () => {
    const f = summarizeFundamentals(facts, "2027-06-01");
    expect(f.quarterEnd).toBeUndefined();
    expect(f.epsQ).toBeUndefined();
    expect(f.epsCagr3y).toBeCloseTo(50, 0); // annual history is still there
    expect(f.roe).toBeUndefined(); // but the last year is too old for ROE
  });

  it("returns null with no usable filings", () => {
    expect(summarizeFundamentals({ facts: { "us-gaap": {} } }, "2026-08-01")).toBeNull();
    expect(summarizeFundamentals({}, "2026-08-01")).toBeNull();
  });
});

describe("epsScore", () => {
  const q = (eps, growth, turnaround = false) => ({ eps, growth, turnaround });

  it("blends recent quarters (60%) with the 3-year growth rate (40%)", () => {
    expect(epsScore({ epsQ: [q(1, 50), q(1, 30)], epsCagr3y: 20 })).toBeCloseTo(0.6 * 40 + 0.4 * 20, 5);
  });

  it("uses whichever of the two exists", () => {
    expect(epsScore({ epsQ: [q(1, 40)] })).toBe(40);
    expect(epsScore({ epsCagr3y: 25 })).toBe(25);
    expect(epsScore({})).toBeNull();
    expect(epsScore(null)).toBeNull();
  });

  it("scores a loss as -100 and a swing to profit as +150, and caps huge growth", () => {
    expect(epsScore({ epsQ: [q(-0.5, null)] })).toBe(-100);
    expect(epsScore({ epsQ: [q(0.5, null, true)] })).toBe(150);
    expect(epsScore({ epsQ: [q(1, 4000)] })).toBe(500);
    expect(epsScore({ epsCagr3y: 9000 })).toBe(300);
  });

  it("skips a quarter it can't compare (no prior year, no turnaround)", () => {
    expect(epsScore({ epsQ: [q(1, null), q(1, 30)] })).toBe(30);
  });
});

describe("smrInputs", () => {
  it("picks sales growth, margin and ROE", () => {
    expect(smrInputs({ revenueGrowth: 12, netMargin: 8, roe: 15, epsCagr3y: 3 })).toEqual({ growth: 12, margin: 8, roe: 15 });
    expect(smrInputs(undefined)).toEqual({ growth: null, margin: null, roe: null });
  });
});
