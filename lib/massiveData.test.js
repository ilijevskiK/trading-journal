import { describe, it, expect, vi, afterEach } from "vitest";
import { closesOnOrBefore, latestRequestableDate } from "./massiveData";

afterEach(() => vi.unstubAllGlobals());

function stubDays(byDate) {
  const fetch = vi.fn(async (url) => {
    const date = url.match(/stocks\/(\d{4}-\d{2}-\d{2})/)[1];
    const results = byDate[date];
    return { ok: true, status: 200, json: async () => ({ results: results ?? [] }) };
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("closesOnOrBefore", () => {
  it("skips weekends without a request and steps back over holidays", async () => {
    // 2026-11-29 is a Sunday; Friday the 27th is treated as a holiday here.
    const fetch = stubDays({ "2026-11-26": [{ T: "AAA", c: 10 }, { T: "BBB", c: 0 }] });
    const found = await closesOnOrBefore("2026-11-29", "key");
    expect(found.date).toBe("2026-11-26");
    expect(found.closes.get("AAA")).toBe(10);
    expect(found.closes.has("BBB")).toBe(false); // no valid close
    expect(fetch).toHaveBeenCalledTimes(2); // Fri 27th (empty), Thu 26th
  });
});

describe("latestRequestableDate", () => {
  it("is yesterday in New York", () => {
    // 03:00 UTC on Nov 11 is still Nov 10 in New York, so yesterday is Nov 9.
    expect(latestRequestableDate(new Date("2026-11-11T03:00:00Z"))).toBe("2026-11-09");
    expect(latestRequestableDate(new Date("2026-11-11T15:00:00Z"))).toBe("2026-11-10");
  });
});
