// CAN SLIM "C" — current quarterly earnings, judged from a quarterly series
// (oldest first) of { end, eps, revenue, netIncome, derived }. Every
// comparison is year over year (same quarter a year earlier), as O'Neil
// insists, so seasonal businesses aren't misread.

export const CURRENT_EARNINGS_RULES = {
  minGrowthPct: 25,
  strongGrowthPct: 40,
  minSalesGrowthPct: 25,
  smallBaseEps: 0.1, // a year-ago EPS below this makes % growth unreliable
  quartersShown: 4,
};

export const VERDICTS = ["strong", "pass", "warning", "fail"];

const DAY_MS = 24 * 60 * 60 * 1000;

function growth(now, before) {
  if (now == null || before == null || before <= 0) return null;
  return ((now - before) / before) * 100;
}

// The same fiscal quarter a year earlier: ~365 days back, with slack for
// 52/53-week fiscal years that shift quarter ends by a few days.
function yearAgo(quarters, i) {
  const target = new Date(quarters[i].end).getTime() - 365 * DAY_MS;
  for (let k = i - 1; k >= 0; k--) {
    const diff = Math.abs(new Date(quarters[k].end).getTime() - target) / DAY_MS;
    if (diff <= 15) return quarters[k];
  }
  return null;
}

export function quarterComparisons(quarters) {
  return quarters.map((q, i) => {
    const prior = yearAgo(quarters, i);
    return {
      ...q,
      priorEps: prior?.eps ?? null,
      epsGrowth: prior ? growth(q.eps, prior.eps) : null,
      turnaround: Boolean(prior && prior.eps <= 0 && q.eps > 0),
      revenueGrowth: prior ? growth(q.revenue, prior.revenue) : null,
      netMargin: q.revenue > 0 && q.netIncome != null ? (q.netIncome / q.revenue) * 100 : null,
      priorNetMargin:
        prior && prior.revenue > 0 && prior.netIncome != null ? (prior.netIncome / prior.revenue) * 100 : null,
      hasPrior: Boolean(prior),
    };
  });
}

const usd = (v) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;
const pct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;

export function analyzeCurrentEarnings(quarters, rules = CURRENT_EARNINGS_RULES) {
  const rows = quarterComparisons(quarters).filter((r) => r.hasPrior);
  if (!rows.length) {
    return { verdict: null, reasons: [{ level: "info", text: "Not enough quarterly history to compare with a year ago." }], rows: [] };
  }

  const recent = rows.slice(-rules.quartersShown).reverse(); // newest first
  const [latest, prev1, prev2] = recent;
  const reasons = [];
  let verdict;

  if (latest.eps <= 0) {
    verdict = "fail";
    reasons.push({ level: "fail", text: `Loss in the latest quarter (EPS ${usd(latest.eps)}).` });
  } else if (latest.priorEps <= 0) {
    verdict = "warning";
    reasons.push({
      level: "warning",
      text: `Turnaround: the same quarter last year was a loss (${usd(latest.priorEps)}), so growth can't be measured. Check sales and the raw numbers.`,
    });
  } else if (latest.epsGrowth < rules.minGrowthPct) {
    verdict = "fail";
    reasons.push({
      level: "fail",
      text: `EPS up ${pct(latest.epsGrowth)} from a year ago, below the ${rules.minGrowthPct}% minimum.`,
    });
  } else {
    const accelerating = prev1?.epsGrowth != null && latest.epsGrowth > prev1.epsGrowth;
    verdict = latest.epsGrowth >= rules.strongGrowthPct && accelerating ? "strong" : "pass";
    reasons.push({
      level: "pass",
      text: `EPS up ${pct(latest.epsGrowth)} from a year ago (${usd(latest.priorEps)} → ${usd(latest.eps)})${
        accelerating ? `, speeding up from ${pct(prev1.epsGrowth)}` : ""
      }.`,
    });

    if (Math.abs(latest.priorEps) < rules.smallBaseEps) {
      verdict = "warning";
      reasons.push({
        level: "warning",
        text: `Small base: a year ago EPS was only ${usd(latest.priorEps)}, so the percentage overstates the change.`,
      });
    }

    const slowing =
      prev1?.epsGrowth != null &&
      prev2?.epsGrowth != null &&
      latest.epsGrowth < prev1.epsGrowth &&
      prev1.epsGrowth < prev2.epsGrowth;
    if (slowing) {
      verdict = "warning";
      reasons.push({
        level: "warning",
        text: `Growth has slowed two quarters in a row (${pct(prev2.epsGrowth)} → ${pct(prev1.epsGrowth)} → ${pct(latest.epsGrowth)}).`,
      });
    }

    if (latest.revenueGrowth == null) {
      reasons.push({ level: "info", text: "No comparable sales figure reported for this quarter." });
    } else {
      const salesAccelerating =
        prev1?.revenueGrowth != null &&
        prev2?.revenueGrowth != null &&
        latest.revenueGrowth > prev1.revenueGrowth &&
        prev1.revenueGrowth > prev2.revenueGrowth;
      if (latest.revenueGrowth >= rules.minSalesGrowthPct || salesAccelerating) {
        reasons.push({
          level: "pass",
          text: `Sales up ${pct(latest.revenueGrowth)}${salesAccelerating ? ", speeding up" : ""}, backing the earnings.`,
        });
      } else {
        verdict = "warning";
        reasons.push({
          level: "warning",
          text: `Sales up only ${pct(latest.revenueGrowth)}: O'Neil wants ${rules.minSalesGrowthPct}%+ or speeding up, so the earnings growth may not last.`,
        });
      }
    }
  }

  if (latest.netMargin != null && latest.priorNetMargin != null) {
    const diff = latest.netMargin - latest.priorNetMargin;
    reasons.push({
      level: "info",
      text:
        Math.abs(diff) < 0.5
          ? `Net margin ${latest.netMargin.toFixed(1)}%, about the same as a year ago.`
          : `Net margin ${latest.netMargin.toFixed(1)}%, ${diff > 0 ? "up" : "down"} from ${latest.priorNetMargin.toFixed(1)}% a year ago.`,
    });
  }
  if (latest.derived) {
    reasons.push({
      level: "info",
      text: "This is a fiscal Q4, worked out as the full year minus the first nine months, so its EPS is approximate.",
    });
  }
  reasons.push({
    level: "info",
    text: "Figures are official (GAAP) EPS, which include one-time items. Check any odd quarter in the table.",
  });

  return { verdict, reasons, rows: recent };
}
