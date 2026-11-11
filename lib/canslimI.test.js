import { describe, it, expect } from "vitest";
import { analyzeInstitutional } from "./canslimI";

const verdictOf = (input) => analyzeInstitutional(input).verdict;

describe("analyzeInstitutional", () => {
  it("has no verdict until the checklist is filled in", () => {
    expect(verdictOf({})).toBeNull();
  });

  it("fails when funds are selling", () => {
    expect(verdictOf({ ownersTrend: "decreasing", qualityBuyers: true })).toBe("fail");
  });

  it("warns when sponsorship is flat or the stock is over-owned", () => {
    expect(verdictOf({ ownersTrend: "flat" })).toBe("warning");
    expect(verdictOf({ ownersTrend: "increasing", qualityBuyers: true, overOwned: true })).toBe("warning");
  });

  it("passes growing sponsorship, and calls it strong with quality buyers", () => {
    expect(verdictOf({ ownersTrend: "increasing" })).toBe("pass");
    expect(verdictOf({ ownersTrend: "increasing", qualityBuyers: true })).toBe("strong");
  });
});
