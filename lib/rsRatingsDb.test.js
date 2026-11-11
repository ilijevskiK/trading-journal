import { describe, it, expect, vi } from "vitest";
import { saveRun, withRankingLock, getRating } from "./rsRatingsDb";

function makeClient(responses = {}) {
  return {
    query: vi.fn(async (sql) => {
      for (const [match, rows] of Object.entries(responses)) if (sql.includes(match)) return { rows };
      return { rows: [] };
    }),
    release: vi.fn(),
  };
}

describe("saveRun", () => {
  it("writes the run and all ratings in one transaction, then prunes old runs", async () => {
    const client = makeClient();
    await saveRun(client, "2026-11-10", [
      { ticker: "AAA", score: 12.5, rating: 90 },
      { ticker: "BBB", score: -3, rating: 10 },
    ]);
    const sqls = client.query.mock.calls.map((c) => c[0]);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    const insert = client.query.mock.calls.find((c) => c[0].includes("unnest"));
    expect(insert[1]).toEqual(["2026-11-10", ["AAA", "BBB"], [12.5, -3], [90, 10]]);
    expect(sqls.some((s) => s.startsWith("DELETE FROM rs_runs"))).toBe(true);
  });

  it("rolls back if a write fails", async () => {
    const client = makeClient();
    client.query.mockImplementation(async (sql) => {
      if (sql.includes("unnest")) throw new Error("boom");
      return { rows: [] };
    });
    await expect(saveRun(client, "2026-11-10", [])).rejects.toThrow("boom");
    expect(client.query.mock.calls.map((c) => c[0])).toContain("ROLLBACK");
  });
});

describe("withRankingLock", () => {
  it("runs the job when the lock is free, and releases it afterwards", async () => {
    const client = makeClient({ pg_try_advisory_lock: [{ locked: true }] });
    const job = vi.fn();
    expect(await withRankingLock({ connect: async () => client }, job)).toBe(true);
    expect(job).toHaveBeenCalledWith(client);
    expect(client.query.mock.calls.some((c) => c[0].includes("pg_advisory_unlock"))).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });

  it("skips the job when another run holds the lock", async () => {
    const client = makeClient({ pg_try_advisory_lock: [{ locked: false }] });
    const job = vi.fn();
    expect(await withRankingLock({ connect: async () => client }, job)).toBe(false);
    expect(job).not.toHaveBeenCalled();
  });
});

describe("getRating", () => {
  it("returns the latest rating with the size of the ranking", async () => {
    const pool = makeClient({ "FROM rs_ratings r": [{ as_of: "2026-11-10", score: "12.5", rating: 90, universe: 5400 }] });
    expect(await getRating(pool, "AAA")).toEqual({ asOf: "2026-11-10", score: 12.5, rating: 90, universe: 5400 });
  });
});
