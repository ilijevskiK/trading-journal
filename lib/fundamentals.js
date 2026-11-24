// What the Composite Rating needs from a company's SEC filings: recent EPS
// growth, 3-year EPS growth, sales growth, margin and return on equity,
// boiled down from the "company facts" so a few hundred bytes per stock can
// be stored. Reuses the extractors the CAN SLIM C and A pages use.
// Pure functions.

import { extractAnnualFinancials, extractQuarterlyFinancials } from "./secEdgar.js";
import { quarterComparisons } from "./canslimC.js";
import { annualComparisons } from "./canslimA.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// A quarter is filed within ~45 days of its end (10-K: ~90), so older than
// this means the company has stopped reporting standard figures.
const STALE_AFTER_DAYS = 200;

const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY_MS);
const average = (values) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Four quarters in a row (about three months between each).
function consecutive(quarters) {
  if (quarters.length < 4) return false;
  const span = daysBetween(quarters[0].end, quarters[quarters.length - 1].end);
  return span >= 250 && span <= 295;
}

// Summary of one company's filings as of `asOf` ('YYYY-MM-DD'), or null when
// there's nothing usable (foreign filers on 20-F, no standard EPS).
export function summarizeFundamentals(facts, asOf) {
  const quarters = quarterComparisons(extractQuarterlyFinancials(facts));
  const years = annualComparisons(extractAnnualFinancials(facts));
  const out = {};

  const latest = quarters[quarters.length - 1];
  if (latest && daysBetween(latest.end, asOf) <= STALE_AFTER_DAYS) {
    out.quarterEnd = latest.end;
    out.epsQ = quarters.slice(-2).map((q) => ({ end: q.end, eps: q.eps, growth: q.epsGrowth, turnaround: q.turnaround }));
    out.revenueGrowth = average(quarters.slice(-3).map((q) => q.revenueGrowth).filter((v) => v != null));
    const last4 = quarters.slice(-4);
    if (consecutive(last4) && last4.every((q) => q.revenue != null && q.netIncome != null)) {
      const revenue = last4.reduce((s, q) => s + q.revenue, 0);
      const income = last4.reduce((s, q) => s + q.netIncome, 0);
      out.netMargin = revenue > 0 ? (income / revenue) * 100 : null;
    }
  }

  const recentYears = years.slice(-4);
  if (recentYears.length === 4) {
    const [first, , , last] = recentYears;
    const span = daysBetween(first.end, last.end);
    if (span >= 1030 && span <= 1160 && first.eps > 0 && last.eps > 0) {
      out.epsCagr3y = (Math.pow(last.eps / first.eps, 365 / span) - 1) * 100;
    }
  }
  const lastYear = years[years.length - 1];
  if (lastYear && daysBetween(lastYear.end, asOf) <= 365 + 120 && lastYear.roe != null) out.roe = lastYear.roe;

  return Object.keys(out).length ? out : null;
}

// One number for "how strong are earnings": the last two quarters' growth
// year over year (60%) and the 3-year EPS growth rate (40%), each capped so
// a tiny base can't dominate. A loss counts as -100; a swing from loss to
// profit as +150. Null when there's nothing to go on. Ranked by the caller.
export function epsScore(f) {
  if (!f) return null;
  const quarterGrowth = (f.epsQ ?? [])
    .map((q) => {
      if (q.eps <= 0) return -100;
      if (q.growth != null) return clamp(q.growth, -100, 500);
      return q.turnaround ? 150 : null;
    })
    .filter((v) => v != null);
  const recent = average(quarterGrowth);
  const annual = f.epsCagr3y != null ? clamp(f.epsCagr3y, -100, 300) : null;
  if (recent == null && annual == null) return null;
  if (recent == null) return annual;
  if (annual == null) return recent;
  return recent * 0.6 + annual * 0.4;
}

// The three things SMR looks at: sales growth, profit margin, return on
// equity. Each is ranked against other stocks by the caller.
export function smrInputs(f) {
  return {
    growth: f?.revenueGrowth ?? null,
    margin: f?.netMargin ?? null,
    roe: f?.roe ?? null,
  };
}
