import { describe, it, expect, vi } from "vitest";
import { getStockNote, saveStockNote } from "./stockNotesDb";

function makePool(rows) {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

describe("getStockNote", () => {
  it("reads the note for this user and ticker", async () => {
    const pool = makePool([{ data: { pivot: 100 } }]);
    expect(await getStockNote(pool, 7, "NVDA")).toEqual({ pivot: 100 });
    expect(pool.query.mock.calls[0][1]).toEqual([7, "NVDA"]);
  });

  it("returns an empty note when nothing is saved yet", async () => {
    expect(await getStockNote(makePool([]), 7, "NVDA")).toEqual({});
  });
});

describe("saveStockNote", () => {
  it("upserts and merges the patch into what's already stored", async () => {
    const pool = makePool([{ data: { pivot: 100, newThing: { confirmed: true } } }]);
    const saved = await saveStockNote(pool, 7, "NVDA", { pivot: 100 });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("ON CONFLICT (user_id, ticker)");
    expect(sql).toContain("stock_notes.data || EXCLUDED.data");
    expect(params).toEqual([7, "NVDA", JSON.stringify({ pivot: 100 })]);
    expect(saved.newThing.confirmed).toBe(true);
  });
});
