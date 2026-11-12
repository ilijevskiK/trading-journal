import { describe, it, expect, vi } from "vitest";
import { saveScreenerRun, savePriceDay, getLatestScreen } from "./screenerDb";

function makeClient(responses = {}) {
  return {
    query: vi.fn(async (sql) => {
      for (const [match, rows] of Object.entries(responses)) if (sql.includes(match)) return { rows };
      return { rows: [] };
    }),
  };
}

describe("savePriceDay", () => {
  it("stores the bars as arrays lined up by ticker", async () => {
    const pool = makeClient();
    await savePriceDay(pool, "2026-11-10", [{ T: "AAA", c: 10, h: 11, v: 500 }, { T: "BBB", c: 20 }]);
    expect(pool.query.mock.calls[0][1]).toEqual(["2026-11-10", ["AAA", "BBB"], [10, 20], [11, 20], [500, 0]]);
  });
});

describe("saveScreenerRun", () => {
  it("writes the run and its stocks in one transaction", async () => {
    const client = makeClient();
    await saveScreenerRun(client, "2026-11-10", {
      funnel: { universe: 10 },
      candidates: [{ ticker: "AAA", rsRating: 95, price: 40, name: "A Inc" }],
    });
    const sqls = client.query.mock.calls.map((c) => c[0]);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    const insert = client.query.mock.calls.find((c) => c[0].includes("unnest"));
    expect(insert[1]).toEqual(["2026-11-10", ["AAA"], [95], ['{"price":40,"name":"A Inc"}']]);
  });

  it("rolls back if a write fails", async () => {
    const client = makeClient();
    client.query.mockImplementation(async (sql) => {
      if (sql.includes("unnest")) throw new Error("boom");
      return { rows: [] };
    });
    await expect(saveScreenerRun(client, "2026-11-10", { funnel: {}, candidates: [] })).rejects.toThrow("boom");
    expect(client.query.mock.calls.map((c) => c[0])).toContain("ROLLBACK");
  });
});

describe("getLatestScreen", () => {
  it("is null before the first run", async () => {
    expect(await getLatestScreen(makeClient())).toBeNull();
  });

  it("returns the latest run with its stocks", async () => {
    const pool = makeClient({
      "FROM screener_runs": [{ as_of: "2026-11-10", funnel: { universe: 10 }, created_at: new Date("2026-11-11T07:00:00Z") }],
      "FROM screener_results": [{ ticker: "AAA", rs_rating: 95, metrics: { price: 40 } }],
    });
    expect(await getLatestScreen(pool)).toEqual({
      asOf: "2026-11-10",
      funnel: { universe: 10 },
      createdAt: "2026-11-11T07:00:00.000Z",
      stocks: [{ ticker: "AAA", rsRating: 95, price: 40 }],
    });
  });
});
