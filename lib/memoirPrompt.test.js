import { describe, it, expect } from "vitest";
import { buildMemoirPrompt } from "./memoirPrompt";

function makeFact(overrides = {}) {
  return {
    tradeId: 1,
    ticker: "IREN",
    thesis: "AI infrastructure play",
    entryDate: "2026-01-01",
    entryPrice: 10,
    exitDate: "2026-01-15",
    realizedPnl: 500,
    rMultiple: 2.5,
    holdDays: 14,
    peak: null,
    soldEarly: null,
    ...overrides,
  };
}

describe("buildMemoirPrompt", () => {
  it("includes the never-invent-numbers rule in the system prompt", () => {
    const { system } = buildMemoirPrompt({ facts: [makeFact()], chapterNumber: 1 });
    expect(system).toMatch(/never invent/i);
    expect(system).toMatch(/first person/i);
  });

  it("renders each trade's ticker and core numbers into the user prompt", () => {
    const { userPrompt } = buildMemoirPrompt({ facts: [makeFact()], chapterNumber: 1 });
    expect(userPrompt).toContain("IREN");
    expect(userPrompt).toContain("$10");
    expect(userPrompt).toContain("2026-01-01");
    expect(userPrompt).toContain("2.5R");
    expect(userPrompt).toContain("held 14 days");
    expect(userPrompt).toContain("AI infrastructure play");
  });

  it("includes give-back numbers when peak data is present", () => {
    const fact = makeFact({ peak: { peakPrice: 15, peakGainPercent: 50, realizedGainPercent: 20, giveBackPoints: 30 } });
    const { userPrompt } = buildMemoirPrompt({ facts: [fact], chapterNumber: 1 });
    expect(userPrompt).toContain("peaked at $15");
    expect(userPrompt).toContain("gave back 30 percentage points");
  });

  it("includes sold-too-early numbers when soldEarly data is present", () => {
    const fact = makeFact({ soldEarly: { currentPrice: 20, avgExitPrice: 12, runSincePercent: 66.7, unrealizedIfHeldDollar: 800 } });
    const { userPrompt } = buildMemoirPrompt({ facts: [fact], chapterNumber: 1 });
    expect(userPrompt).toContain("Current price is $20");
    expect(userPrompt).toContain("up 66.7% since exit");
  });

  it("omits a dimension entirely when its data is null, rather than printing a placeholder", () => {
    const { userPrompt } = buildMemoirPrompt({ facts: [makeFact()], chapterNumber: 1 });
    expect(userPrompt).not.toContain("peaked at");
    expect(userPrompt).not.toContain("Current price is");
  });

  it("says this is the first chapter when there are no previous titles", () => {
    const { userPrompt } = buildMemoirPrompt({ facts: [makeFact()], chapterNumber: 1 });
    expect(userPrompt).toContain("This is the first chapter.");
  });

  it("lists previous chapter titles for continuity when present", () => {
    const { userPrompt } = buildMemoirPrompt({
      facts: [makeFact()],
      chapterNumber: 2,
      previousTitles: ["The Early Years"],
    });
    expect(userPrompt).toContain("The Early Years");
    expect(userPrompt).toContain("Chapter 2");
  });
});
