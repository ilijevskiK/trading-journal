import { describe, it, expect, vi } from "vitest";
import { listChapters, insertChapter } from "./memoirDb";

function makePool(rows) {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

describe("listChapters", () => {
  it("queries scoped by user id, chapter 1 first", async () => {
    const pool = makePool([
      { id: 2, chapter_number: 2, title: "B", content: "...", trade_ids: [3, 4], patterns_detected: [], model: "claude-sonnet-5", input_tokens: 100, output_tokens: 200, created_at: "2026-02-01" },
    ]);
    const chapters = await listChapters(pool, 7);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("WHERE user_id = $1");
    expect(sql).toContain("ORDER BY chapter_number ASC");
    expect(params).toEqual([7]);
    expect(chapters[0]).toMatchObject({ id: 2, chapterNumber: 2, tradeIds: [3, 4] });
  });

  it("defaults tradeIds/patternsDetected to an empty array when the row has none", async () => {
    const pool = makePool([
      { id: 1, chapter_number: 1, title: "A", content: "...", trade_ids: null, patterns_detected: null, model: "claude-sonnet-5" },
    ]);
    const chapters = await listChapters(pool, 7);
    expect(chapters[0].tradeIds).toEqual([]);
    expect(chapters[0].patternsDetected).toEqual([]);
  });
});

describe("insertChapter", () => {
  it("serializes tradeIds/patternsDetected as JSON and returns the mapped row", async () => {
    const pool = makePool([
      { id: 1, chapter_number: 1, title: "First", content: "Body", trade_ids: [1, 2], patterns_detected: [{ tradeId: 1, pattern: "gave_back" }], model: "claude-sonnet-5", input_tokens: 500, output_tokens: 900, created_at: "2026-01-01" },
    ]);
    const result = await insertChapter(pool, 7, {
      chapterNumber: 1,
      title: "First",
      content: "Body",
      tradeIds: [1, 2],
      patternsDetected: [{ tradeId: 1, pattern: "gave_back" }],
      model: "claude-sonnet-5",
      inputTokens: 500,
      outputTokens: 900,
    });
    const [, params] = pool.query.mock.calls[0];
    expect(params).toEqual([
      7, 1, "First", "Body", JSON.stringify([1, 2]), JSON.stringify([{ tradeId: 1, pattern: "gave_back" }]),
      "claude-sonnet-5", 500, 900,
    ]);
    expect(result.title).toBe("First");
    expect(result.tradeIds).toEqual([1, 2]);
  });

  it("defaults missing token counts to null", async () => {
    const pool = makePool([{ id: 1, chapter_number: 1, title: "", content: "Body", trade_ids: [], patterns_detected: [], model: "claude-sonnet-5" }]);
    await insertChapter(pool, 7, { chapterNumber: 1, title: "", content: "Body", model: "claude-sonnet-5" });
    const [, params] = pool.query.mock.calls[0];
    expect(params[7]).toBeNull();
    expect(params[8]).toBeNull();
  });
});
