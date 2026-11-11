import { describe, it, expect } from "vitest";
import { extractQuarterlyFinancials, extractSupplyFinancials } from "./secEdgar";

const fact = (start, end, val, form = "10-Q", filed = end) => ({ start, end, val, form, filed });

function facts(tags) {
  return {
    facts: {
      "us-gaap": Object.fromEntries(
        Object.entries(tags).map(([tag, rows]) => [
          tag,
          {
            units: {
              [tag.startsWith("EarningsPerShare") ? "USD/shares" : tag.startsWith("WeightedAverage") ? "shares" : "USD"]: rows,
            },
          },
        ])
      ),
    },
  };
}

describe("extractQuarterlyFinancials", () => {
  const fiscalYear = [
    fact("2025-01-01", "2025-03-31", 1.0),
    fact("2025-04-01", "2025-06-30", 1.1),
    fact("2025-07-01", "2025-09-30", 1.2),
    fact("2025-01-01", "2025-09-30", 3.3), // nine months year to date
    fact("2025-01-01", "2025-12-31", 4.6, "10-K", "2026-02-20"),
  ];

  it("keeps reported quarters and works out Q4 as the year minus nine months", () => {
    const q = extractQuarterlyFinancials(facts({ EarningsPerShareDiluted: fiscalYear }));
    expect(q.map((r) => r.end)).toEqual(["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"]);
    expect(q[3].eps).toBeCloseTo(1.3);
    expect(q[3].derived).toBe(true);
    expect(q[3].start).toBe("2025-10-01");
  });

  it("keeps the most recently filed version of a restated quarter", () => {
    const q = extractQuarterlyFinancials(
      facts({
        EarningsPerShareDiluted: [
          fact("2025-01-01", "2025-03-31", 1.0, "10-Q", "2025-05-01"),
          fact("2025-01-01", "2025-03-31", 0.9, "10-Q", "2026-05-01"),
        ],
      })
    );
    expect(q[0].eps).toBe(0.9);
  });

  it("adjusts per-share figures filed before a stock split", () => {
    // 10-for-1 split: two periods refiled at a tenth of their old value.
    const q = extractQuarterlyFinancials(
      facts({
        EarningsPerShareDiluted: [
          fact("2023-01-01", "2023-03-31", 0.8, "10-Q", "2023-05-01"), // only ever filed pre-split
          fact("2024-01-01", "2024-03-31", 6.0, "10-Q", "2024-05-01"),
          fact("2024-01-01", "2024-03-31", 0.6, "10-Q", "2025-05-01"),
          fact("2024-04-01", "2024-06-30", 7.0, "10-Q", "2024-05-01"),
          fact("2024-04-01", "2024-06-30", 0.7, "10-Q", "2025-05-01"),
        ],
      })
    );
    expect(q.map((r) => r.eps)).toEqual([0.08, 0.6, 0.7]);
  });

  it("doesn't mistake an ordinary restatement for a split", () => {
    const q = extractQuarterlyFinancials(
      facts({
        EarningsPerShareDiluted: [
          fact("2023-01-01", "2023-03-31", 0.8, "10-Q", "2023-05-01"),
          fact("2024-01-01", "2024-03-31", 1.0, "10-Q", "2024-05-01"),
          fact("2024-01-01", "2024-03-31", 0.9, "10-Q", "2025-05-01"),
        ],
      })
    );
    expect(q.map((r) => r.eps)).toEqual([0.8, 0.9]);
  });

  it("ignores figures from non-financial filings like proxy statements", () => {
    const q = extractQuarterlyFinancials(
      facts({ EarningsPerShareDiluted: [fact("2025-01-01", "2025-03-31", 5, "DEF 14A")] })
    );
    expect(q).toHaveLength(0);
  });

  it("falls back to basic EPS when diluted isn't reported", () => {
    const q = extractQuarterlyFinancials(facts({ EarningsPerShareBasic: [fact("2025-01-01", "2025-03-31", 0.5)] }));
    expect(q[0].eps).toBe(0.5);
  });

  it("uses the revenue tag with the latest data, filling older quarters from others", () => {
    const q = extractQuarterlyFinancials(
      facts({
        EarningsPerShareDiluted: [fact("2024-01-01", "2024-03-31", 1), fact("2025-01-01", "2025-03-31", 1)],
        SalesRevenueNet: [fact("2024-01-01", "2024-03-31", 80)],
        Revenues: [fact("2025-01-01", "2025-03-31", 120)],
        RevenueFromContractWithCustomerExcludingAssessedTax: [fact("2025-01-01", "2025-03-31", 110)],
      })
    );
    expect(q.map((r) => r.revenue)).toEqual([80, 120]);
  });
});

describe("extractSupplyFinancials", () => {
  const instant = (end, val, filed = end) => ({ end, val, form: "10-Q", filed });

  it("compares the share count with a year earlier from the same filing", () => {
    const supply = extractSupplyFinancials(
      facts({
        WeightedAverageNumberOfDilutedSharesOutstanding: [
          fact("2024-04-01", "2024-06-30", 5000, "10-Q", "2024-08-01"), // pre-split, older filing
          fact("2025-04-01", "2025-06-30", 980, "10-Q", "2025-08-01"),
          fact("2024-04-01", "2024-06-30", 1000, "10-Q", "2025-08-01"), // restated in the same filing
        ],
      })
    );
    expect(supply.shares).toMatchObject({ now: 980, yearAgo: 1000 });
  });

  it("adds long- and short-term debt when no total is reported, and pairs it with equity", () => {
    const supply = extractSupplyFinancials(
      facts({
        LongTermDebtNoncurrent: [instant("2025-06-30", 80)],
        LongTermDebtCurrent: [instant("2025-06-30", 20)],
        StockholdersEquity: [instant("2025-06-30", 200), instant("2024-06-30", 150)],
      })
    );
    expect(supply.debt).toEqual({ end: "2025-06-30", value: 100 });
    expect(supply.equity.value).toBe(200);
    expect(supply.equityYearAgo).toBe(150);
  });
});
