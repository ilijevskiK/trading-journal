// CAN SLIM "A" — annual earnings growth, judged from fiscal years (oldest
// first) of { end, eps, netIncome, operatingCashFlow, equityStart,
// equityEnd }: EPS up in each of the last three years at a 25%+ annual
// rate, and return on equity of 17%+.

export const ANNUAL_EARNINGS_RULES = {
  years: 3,
  minGrowthPct: 25,
  strongGrowthPct: 40,
  minRoePct: 17,
  strongRoePct: 25,
  cashFlowPremium: 1.2, // operating cash flow at least 20% above earnings
};

const usd = (v) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;
const fy = (row) => `FY ending ${new Date(`${row.end}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;

export function annualComparisons(years) {
  return years.map((y, i) => {
    const prev = years[i - 1];
    const avgEquity =
      y.equityEnd != null ? (y.equityStart != null ? (y.equityStart + y.equityEnd) / 2 : y.equityEnd) : null;
    return {
      ...y,
      epsGrowth: prev && prev.eps > 0 ? ((y.eps - prev.eps) / prev.eps) * 100 : null,
      down: Boolean(prev && y.eps < prev.eps),
      roe: avgEquity > 0 && y.netIncome != null ? (y.netIncome / avgEquity) * 100 : null,
      negativeEquity: avgEquity != null && avgEquity <= 0,
      cashFlowRatio: y.netIncome > 0 && y.operatingCashFlow != null ? y.operatingCashFlow / y.netIncome : null,
    };
  });
}

export function analyzeAnnualEarnings(years, rules = ANNUAL_EARNINGS_RULES) {
  const all = annualComparisons(years);
  if (all.length < 2) {
    return { verdict: null, reasons: [{ level: "info", text: "Not enough annual history (needs at least two fiscal years)." }], rows: [], growthRate: null };
  }

  const window = all.slice(-(rules.years + 1)); // base year + the years judged
  const judged = window.slice(1);
  const latest = window[window.length - 1];
  const base = window[0];
  const span = window.length - 1;
  const reasons = [];
  let verdict = "pass";

  const growthRate = base.eps > 0 && latest.eps > 0 ? (Math.pow(latest.eps / base.eps, 1 / span) - 1) * 100 : null;
  const downYears = judged.filter((y) => y.down || y.eps <= 0);
  const priorPeak = Math.max(...window.slice(0, -1).map((y) => y.eps));

  if (latest.eps <= 0) {
    verdict = "fail";
    reasons.push({ level: "fail", text: `Loss in the latest fiscal year (EPS ${usd(latest.eps)}).` });
  } else if (latest.down) {
    verdict = "fail";
    reasons.push({ level: "fail", text: `EPS fell in the latest fiscal year (${pct(latest.epsGrowth)}).` });
  } else if (downYears.length && latest.eps < priorPeak) {
    verdict = "fail";
    reasons.push({
      level: "fail",
      text: `EPS fell in ${downYears.map(fy).join(" and ")} and hasn't recovered to its earlier high.`,
    });
  } else {
    if (downYears.length) {
      verdict = "warning";
      reasons.push({
        level: "warning",
        text: `EPS dipped in ${downYears.map(fy).join(" and ")}, but has since recovered to a new high. O'Neil wants growth every year.`,
      });
    }
    if (growthRate == null) {
      verdict = "warning";
      reasons.push({
        level: "warning",
        text: `A loss ${span} years ago makes the annual growth rate unmeasurable. Check the yearly figures.`,
      });
    } else if (growthRate < rules.minGrowthPct) {
      verdict = "fail";
      reasons.push({
        level: "fail",
        text: `EPS grew ${growthRate.toFixed(0)}% a year over ${span} years (${usd(base.eps)} → ${usd(latest.eps)}), below the ${rules.minGrowthPct}% minimum.`,
      });
    } else {
      reasons.push({
        level: "pass",
        text: `EPS grew ${growthRate.toFixed(0)}% a year over ${span} years (${usd(base.eps)} → ${usd(latest.eps)})${
          downYears.length ? "" : ", up every year"
        }.`,
      });
    }
    if (span < rules.years) {
      if (verdict !== "fail") verdict = "warning";
      reasons.push({
        level: "warning",
        text: `Only ${span} year${span === 1 ? "" : "s"} of annual history; O'Neil wants a ${rules.years}-year record.`,
      });
    }
  }

  if (latest.negativeEquity) {
    reasons.push({
      level: "info",
      text: "Shareholders' equity is negative (often from large buybacks), so return on equity isn't meaningful.",
    });
  } else if (latest.roe != null) {
    if (latest.roe >= rules.minRoePct) {
      reasons.push({ level: "pass", text: `Return on equity ${latest.roe.toFixed(0)}%, above the ${rules.minRoePct}% minimum.` });
    } else {
      if (verdict === "pass") verdict = "warning";
      reasons.push({
        level: "warning",
        text: `Return on equity ${latest.roe.toFixed(0)}%, below O'Neil's ${rules.minRoePct}% minimum.`,
      });
    }
  }

  if (
    verdict === "pass" &&
    growthRate >= rules.strongGrowthPct &&
    latest.roe >= rules.strongRoePct &&
    span >= rules.years &&
    !downYears.length
  ) {
    verdict = "strong";
  }

  if (latest.cashFlowRatio != null) {
    const ratio = latest.cashFlowRatio;
    reasons.push({
      level: "info",
      text:
        ratio >= rules.cashFlowPremium
          ? `Operating cash flow is ${ratio.toFixed(1)}× earnings, comfortably backing them (O'Neil likes 20%+ above).`
          : ratio >= 1
            ? `Operating cash flow is ${ratio.toFixed(1)}× earnings, short of the 20%+ cushion O'Neil likes.`
            : `Operating cash flow is only ${ratio.toFixed(1)}× earnings: profits aren't all turning into cash.`,
    });
  }
  reasons.push({
    level: "info",
    text: "Figures are official (GAAP) EPS, which include one-time items. Check any odd year in the table.",
  });

  return { verdict, reasons, rows: [...window].reverse(), growthRate };
}
