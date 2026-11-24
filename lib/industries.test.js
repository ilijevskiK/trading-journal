import { describe, it, expect } from "vitest";
import { SPECIFIC, allGroups, groupByKey, groupForName, groupForSic, makeResolver, median, rankGroups } from "./industries";
import { allTaxonomyGroups } from "./industryTaxonomy";
import { parseSic } from "./secEdgar";

describe("group tables", () => {
  it("lists each SIC code in only one group", () => {
    const seen = new Map();
    const dupes = [];
    for (const [name, , codes] of SPECIFIC) {
      for (const code of codes) {
        if (seen.has(code)) dupes.push(`${code}: ${seen.get(code)} / ${name}`);
        seen.set(code, name);
      }
    }
    expect(dupes).toEqual([]);
  });

  it("gives every group name one sector and one key", () => {
    const groups = allGroups();
    expect(new Set(groups.map((g) => g.key)).size).toBe(groups.length);
  });
});

describe("groupForSic", () => {
  it("maps exact codes", () => {
    expect(groupForSic(7372)).toMatchObject({ name: "Software", sector: "Software & Internet", key: "software" });
    expect(groupForSic("3674").name).toBe("Semiconductors");
    expect(groupForSic(1040).name).toBe("Gold & Silver Mining");
  });

  it("falls back to the broad range for a code with no exact entry", () => {
    expect(groupForSic(3555)?.sector).toBe("Industrial"); // exact
    expect(groupForSic(2999).name).toBe("Oil Refining & Marketing"); // range only
  });

  it("returns null for shells, funds and missing codes", () => {
    expect(groupForSic(6770)).toBeNull(); // blank check
    expect(groupForSic(null)).toBeNull();
    expect(groupForSic(0)).toBeNull();
    expect(groupForSic("abc")).toBeNull();
  });
});

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("rankGroups", () => {
  const sic = new Map([
    ["A1", 7372], ["A2", 7372], ["A3", 7372],
    ["B1", 3674], ["B2", 3674], ["B3", 3674], ["B4", 3674],
    ["C1", 1040], ["C2", 1040], // too few
    ["S1", 6770], ["S2", 6770], ["S3", 6770], // shells
  ]);
  const bySic = (t) => groupForSic(sic.get(t));
  const r = (ticker, score, rating) => ({ ticker, score, rating });
  const ratings = [
    r("A1", 10, 50), r("A2", 12, 55), r("A3", 11, 52),
    r("B1", 30, 90), r("B2", 28, 88), r("B3", 29, 89), r("B4", 500, 99), // outlier
    r("C1", 99, 99), r("C2", 99, 99),
    r("S1", 90, 99), r("S2", 90, 99), r("S3", 90, 99),
    r("NOSIC", 90, 99),
  ];

  it("ranks by median score, dropping small groups, shells and unclassified stocks", () => {
    const ranked = rankGroups(ratings, bySic);
    expect(ranked.map((g) => [g.rank, g.name])).toEqual([[1, "Semiconductors"], [2, "Software"]]);
    expect(ranked[0]).toMatchObject({ members: 4, medianScore: 29.5, medianRating: 90 });
  });

  it("lets minMembers change what counts as a group", () => {
    expect(rankGroups(ratings, bySic, { minMembers: 2 }).map((g) => g.name)).toContain("Gold & Silver Mining");
  });
});

describe("parseSic", () => {
  it("reads the SIC code and description", () => {
    expect(parseSic({ sic: "7372", sicDescription: "Services-Prepackaged Software" })).toEqual({
      sic: 7372,
      description: "Services-Prepackaged Software",
    });
  });
  it("returns a null sic when the SEC lists none", () => {
    expect(parseSic({ sic: "", sicDescription: "" })).toEqual({ sic: null, description: null });
    expect(parseSic(null)).toEqual({ sic: null, description: null });
  });
});

describe("taxonomy groups", () => {
  it("has unique names and keys", () => {
    const groups = allTaxonomyGroups();
    expect(new Set(groups.map((g) => g.name)).size).toBe(groups.length);
    expect(new Set(groups.map((g) => groupForName(g.name).key)).size).toBe(groups.length);
  });

  it("looks a group up by name and by key", () => {
    const g = groupForName("Semiconductors - Memory");
    expect(g).toMatchObject({ name: "Semiconductors - Memory", sector: "Semiconductors" });
    expect(groupByKey(g.key)).toEqual(g);
    expect(groupForName("Unclassified")).toBeNull();
    expect(groupForName("Nonsense")).toBeNull();
  });
});

describe("makeResolver", () => {
  const sicByTicker = new Map([["A", 7372]]);
  it("uses SIC groups until assignments exist", () => {
    const { scheme, resolve } = makeResolver({ assignments: new Map(), sicByTicker });
    expect(scheme).toBe("sic");
    expect(resolve("A").name).toBe("Software");
  });
  it("uses the assignments once there are any, leaving unassigned tickers out", () => {
    const { scheme, resolve } = makeResolver({ assignments: new Map([["B", "Semiconductors - Memory"], ["C", "Unclassified"]]), sicByTicker });
    expect(scheme).toBe("ai");
    expect(resolve("B").name).toBe("Semiconductors - Memory");
    expect(resolve("A")).toBeNull();
    expect(resolve("C")).toBeNull();
  });
});
