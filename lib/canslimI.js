// CAN SLIM "I" — institutional sponsorship. Free data doesn't include fund
// ownership, so this judges what you've checked by hand: is the number of
// funds owning it growing, are some of them top performers, and is it not
// already over-owned (crowded, with too many potential sellers).

export const OWNER_TRENDS = ["increasing", "flat", "decreasing"];

export function analyzeInstitutional(input = {}) {
  const { ownersTrend = null, qualityBuyers = false, overOwned = false } = input;
  if (!ownersTrend) {
    return {
      verdict: null,
      reasons: [{ level: "info", text: "Not checked yet. Look up the fund ownership below and fill in the checklist." }],
    };
  }

  const reasons = [];
  let verdict;
  if (ownersTrend === "decreasing") {
    verdict = "fail";
    reasons.push({ level: "fail", text: "Fewer funds own it than last quarter: institutions are selling." });
  } else if (ownersTrend === "flat") {
    verdict = "warning";
    reasons.push({ level: "warning", text: "The number of funds owning it is flat: no new sponsorship coming in." });
  } else {
    verdict = "pass";
    reasons.push({ level: "pass", text: "More funds own it than in recent quarters: sponsorship is growing." });
  }

  if (qualityBuyers) {
    reasons.push({ level: "pass", text: "At least one top-performing fund has bought it recently." });
  } else {
    reasons.push({ level: "info", text: "No top-performing fund confirmed as a recent buyer." });
  }

  if (overOwned) {
    if (verdict !== "fail") verdict = "warning";
    reasons.push({
      level: "warning",
      text: "Over-owned: when that many funds already hold it, there are more potential sellers than new buyers.",
    });
  }

  if (verdict === "pass" && qualityBuyers) verdict = "strong";
  return { verdict, reasons };
}
