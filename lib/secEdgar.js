// Quarterly EPS, revenue and net income from SEC EDGAR's XBRL "company
// facts" (official 10-Q/10-K filings). Server-only: sec.gov blocks browser
// requests and requires a User-Agent naming a contact, from SEC_USER_AGENT.

const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const FACTS_URL = (cik) => `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, "0")}.json`;

const EPS_TAGS = ["EarningsPerShareDiluted", "EarningsPerShareBasic"];
// Companies switched revenue tags over the years (ASC 606 in 2018), and
// some report both; "Revenues" is total revenue when a company uses it.
const REVENUE_TAGS = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "SalesRevenueNet",
  "SalesRevenueGoodsNet",
];
const NET_INCOME_TAGS = ["NetIncomeLoss", "ProfitLoss"];
const OPERATING_CASH_FLOW_TAGS = [
  "NetCashProvidedByUsedInOperatingActivities",
  "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
];
const DILUTED_SHARES_TAGS = ["WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfSharesOutstandingBasic"];
const DEBT_TAGS = ["LongTermDebt", "LongTermDebtAndCapitalLeaseObligations"];
const DEBT_PART_TAGS = [["LongTermDebtNoncurrent"], ["LongTermDebtCurrent", "DebtCurrent"]];
const EQUITY_TAGS = [
  "StockholdersEquity",
  "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
];

const DAY_MS = 24 * 60 * 60 * 1000;
// A quarter is filed within ~45 days of its end (10-K: ~90), so anything
// older than this means the company has stopped reporting standard EPS.
const STALE_AFTER_DAYS = 200;

function daysBetween(start, end) {
  return Math.round((new Date(end) - new Date(start)) / DAY_MS);
}

function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

const SPLIT_RATIOS = [1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50, 100];

function splitRatio(oldVal, newVal) {
  if (!oldVal || !newVal || Math.sign(oldVal) !== Math.sign(newVal)) return null;
  if (Math.max(Math.abs(oldVal), Math.abs(newVal)) < 0.1) return null; // rounding noise
  const r = oldVal / newVal;
  const k = r >= 1 ? r : 1 / r;
  const match = SPLIT_RATIOS.find((s) => Math.abs(k - s) / s < 0.025);
  return match ? (r >= 1 ? match : 1 / match) : null;
}

// Per-share figures filed before a stock split are never restated in older
// filings, so a pre-split quarter would be compared with a post-split one.
// A split shows up as the same period refiled at a clean ratio (10x, 4x,
// or 1/10 for a reverse split) in at least two periods; everything filed
// before it is divided by that ratio.
function detectSplits(versionsByPeriod) {
  const pairs = [];
  for (const versions of versionsByPeriod.values()) {
    const sorted = [...versions].sort((a, b) => (a.filed < b.filed ? -1 : 1));
    for (let i = 1; i < sorted.length; i++) {
      const ratio = splitRatio(sorted[i - 1].val, sorted[i].val);
      if (ratio) pairs.push({ ratio, oldFiled: sorted[i - 1].filed, newFiled: sorted[i].filed });
    }
  }
  pairs.sort((a, b) => (a.oldFiled < b.oldFiled ? -1 : 1));
  const clusters = [];
  for (const p of pairs) {
    const c = clusters.find((c) => c.ratio === p.ratio && p.oldFiled < c.minNew && p.newFiled > c.maxOld);
    if (c) {
      c.maxOld = p.oldFiled > c.maxOld ? p.oldFiled : c.maxOld;
      c.minNew = p.newFiled < c.minNew ? p.newFiled : c.minNew;
      c.count++;
    } else {
      clusters.push({ ratio: p.ratio, maxOld: p.oldFiled, minNew: p.newFiled, count: 1 });
    }
  }
  return clusters.filter((c) => c.count >= 2);
}

// One value per (start, end) period from 10-Q/10-K filings, keeping the most
// recently filed version — later filings restate earlier quarters. Per-share
// units are also adjusted for stock splits.
function periodsFor(facts, tag, unit) {
  const rows = facts?.facts?.["us-gaap"]?.[tag]?.units?.[unit];
  if (!rows) return new Map();
  const versionsByPeriod = new Map();
  for (const r of rows) {
    if (!r.start || !/^10-[QK]/.test(r.form || "")) continue;
    const key = `${r.start}|${r.end}`;
    if (!versionsByPeriod.has(key)) versionsByPeriod.set(key, []);
    versionsByPeriod.get(key).push(r);
  }
  const splits = unit === "USD/shares" ? detectSplits(versionsByPeriod) : [];
  const byPeriod = new Map();
  for (const [key, versions] of versionsByPeriod) {
    const latest = versions.reduce((a, b) => (b.filed > a.filed ? b : a));
    const factor = splits.filter((s) => latest.filed <= s.maxOld).reduce((f, s) => f * s.ratio, 1);
    byPeriod.set(key, factor === 1 ? latest : { ...latest, val: latest.val / factor });
  }
  return byPeriod;
}

// 3-month quarters as reported, plus Q4 worked out as the full year minus
// the first nine months (no filing reports Q4 on its own). For EPS that's
// an approximation, since the share count moves during the year.
export function quarterlySeries(facts, tag, unit) {
  const periods = [...periodsFor(facts, tag, unit).values()];
  const quarters = new Map();
  for (const r of periods) {
    const d = daysBetween(r.start, r.end);
    if (d >= 75 && d <= 105) quarters.set(r.end, { start: r.start, end: r.end, value: r.val, derived: false });
  }
  for (const year of periods) {
    const d = daysBetween(year.start, year.end);
    if (d < 350 || d > 380 || quarters.has(year.end)) continue;
    const nineMonths = periods.find(
      (p) => p.start === year.start && daysBetween(p.start, p.end) >= 260 && daysBetween(p.start, p.end) <= 290
    );
    if (!nineMonths) continue;
    quarters.set(year.end, {
      start: addDays(nineMonths.end, 1),
      end: year.end,
      value: year.val - nineMonths.val,
      derived: true,
    });
  }
  return [...quarters.values()].sort((a, b) => (a.end < b.end ? -1 : 1));
}

// Full fiscal years as filed in 10-Ks.
export function annualSeries(facts, tag, unit) {
  return [...periodsFor(facts, tag, unit).values()]
    .filter((r) => {
      const d = daysBetween(r.start, r.end);
      return d >= 350 && d <= 380;
    })
    .map((r) => ({ start: r.start, end: r.end, value: r.val }))
    .sort((a, b) => (a.end < b.end ? -1 : 1));
}

// Balance-sheet figures (a value on a date, no start), latest filing wins.
function instantValues(facts, tags) {
  for (const tag of tags) {
    const rows = facts?.facts?.["us-gaap"]?.[tag]?.units?.USD;
    if (!rows) continue;
    const byEnd = new Map();
    for (const r of rows) {
      if (r.start || !/^10-[QK]/.test(r.form || "")) continue;
      const prev = byEnd.get(r.end);
      if (!prev || r.filed > prev.filed) byEnd.set(r.end, r);
    }
    if (byEnd.size) return new Map([...byEnd].map(([end, r]) => [end, r.val]));
  }
  return new Map();
}

function valueNear(byEnd, date, toleranceDays = 15) {
  for (const [end, val] of byEnd) if (Math.abs(daysBetween(end, date)) <= toleranceDays) return val;
  return null;
}

// The tag whose data is most recent wins; older periods it lacks are
// filled from the next tags in priority order.
function mergedSeries(facts, tags, unit, seriesFn = quarterlySeries) {
  const series = tags.map((tag) => ({ tag, rows: seriesFn(facts, tag, unit) })).filter((s) => s.rows.length);
  if (!series.length) return [];
  const latest = (s) => s.rows[s.rows.length - 1].end;
  series.sort((a, b) => (latest(a) === latest(b) ? tags.indexOf(a.tag) - tags.indexOf(b.tag) : latest(a) < latest(b) ? 1 : -1));
  const byEnd = new Map();
  for (const s of series) for (const r of s.rows) if (!byEnd.has(r.end)) byEnd.set(r.end, r);
  return [...byEnd.values()].sort((a, b) => (a.end < b.end ? -1 : 1));
}

// Quarters (oldest first) keyed on EPS: every quarter has EPS, and revenue
// / net income where the company reported them for the same period.
export function extractQuarterlyFinancials(facts) {
  const eps = mergedSeries(facts, EPS_TAGS, "USD/shares");
  const revenue = new Map(mergedSeries(facts, REVENUE_TAGS, "USD").map((r) => [r.end, r.value]));
  const netIncome = new Map(mergedSeries(facts, NET_INCOME_TAGS, "USD").map((r) => [r.end, r.value]));
  return eps.map((q) => ({
    start: q.start,
    end: q.end,
    eps: q.value,
    revenue: revenue.get(q.end) ?? null,
    netIncome: netIncome.get(q.end) ?? null,
    derived: q.derived,
  }));
}

// Fiscal years (oldest first) keyed on EPS, with the figures A needs:
// net income and operating cash flow for the year, and shareholders'
// equity at the start and end of it (for return on equity).
export function extractAnnualFinancials(facts) {
  const eps = mergedSeries(facts, EPS_TAGS, "USD/shares", annualSeries);
  const byEnd = (tags) => new Map(mergedSeries(facts, tags, "USD", annualSeries).map((r) => [r.end, r.value]));
  const netIncome = byEnd(NET_INCOME_TAGS);
  const revenue = byEnd(REVENUE_TAGS);
  const operatingCashFlow = byEnd(OPERATING_CASH_FLOW_TAGS);
  const equity = instantValues(facts, EQUITY_TAGS);
  return eps.map((y) => ({
    start: y.start,
    end: y.end,
    eps: y.value,
    revenue: revenue.get(y.end) ?? null,
    netIncome: netIncome.get(y.end) ?? null,
    operatingCashFlow: operatingCashFlow.get(y.end) ?? null,
    equityEnd: valueNear(equity, y.end),
    equityStart: valueNear(equity, addDays(y.start, -1)),
  }));
}

// Share count now vs the same period a year earlier, both taken from the
// latest filing that reports them, so a stock split in between can't skew
// the comparison (filings restate their own year-ago column).
function shareCountChange(facts) {
  for (const tag of DILUTED_SHARES_TAGS) {
    const rows = (facts?.facts?.["us-gaap"]?.[tag]?.units?.shares || []).filter(
      (r) => r.start && /^10-[QK]/.test(r.form || "")
    );
    if (!rows.length) continue;
    const latestFiled = rows.reduce((m, r) => (r.filed > m ? r.filed : m), "");
    const inFiling = rows.filter((r) => r.filed === latestFiled);
    const now = inFiling.reduce((a, b) => (b.end > a.end || (b.end === a.end && daysBetween(b.start, b.end) < daysBetween(a.start, a.end)) ? b : a));
    const length = daysBetween(now.start, now.end);
    const yearAgo = inFiling.find(
      (r) => Math.abs(daysBetween(r.start, r.end) - length) <= 10 && Math.abs(daysBetween(r.end, now.end) - 365) <= 15
    );
    if (yearAgo) return { now: now.val, yearAgo: yearAgo.val, end: now.end, yearAgoEnd: yearAgo.end };
  }
  return null;
}

// Total debt on each balance-sheet date: the reported total, or the long-
// and short-term parts added up when that's how the company files it.
function debtByDate(facts) {
  const total = instantValues(facts, DEBT_TAGS);
  if (total.size) return total;
  const [longTerm, shortTerm] = DEBT_PART_TAGS.map((tags) => instantValues(facts, tags));
  const out = new Map();
  for (const [end, val] of longTerm) out.set(end, val + (shortTerm.get(end) ?? 0));
  return out;
}

function latestOf(byEnd) {
  let end = null;
  for (const e of byEnd.keys()) if (!end || e > end) end = e;
  return end ? { end, value: byEnd.get(end) } : null;
}

// What S needs from the filings: share count trend and debt vs equity,
// latest and a year earlier.
export function extractSupplyFinancials(facts) {
  const debt = debtByDate(facts);
  const equity = instantValues(facts, EQUITY_TAGS);
  const latestDebt = latestOf(debt);
  const latestEquity = latestOf(equity);
  return {
    shares: shareCountChange(facts),
    debt: latestDebt,
    debtYearAgo: latestDebt ? valueNear(debt, addDays(latestDebt.end, -365)) : null,
    equity: latestEquity,
    equityYearAgo: latestEquity ? valueNear(equity, addDays(latestEquity.end, -365)) : null,
  };
}

// Small in-memory cache: the ticker list barely changes, and a company's
// facts only change when it files.
const cache = new Map();
async function cachedJson(url, ttlMs, userAgent) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.json;
  const res = await fetch(url, { headers: { "User-Agent": userAgent }, cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`SEC EDGAR returned ${res.status}.`);
  const json = await res.json();
  cache.set(url, { at: Date.now(), json });
  return json;
}

// Every ticker in the SEC's list of US-listed companies, in the dotted
// form price feeds use for share classes (BRK.B, not BRK-B).
export async function fetchSecTickerSet(userAgent) {
  const tickers = await cachedJson(TICKERS_URL, 24 * 60 * 60 * 1000, userAgent);
  return new Set(Object.values(tickers || {}).map((c) => c.ticker.replace("-", ".")));
}

export async function fetchCompanyFinancials(ticker, userAgent) {
  const symbol = ticker.trim().toUpperCase().replace(".", "-");
  const tickers = await cachedJson(TICKERS_URL, 24 * 60 * 60 * 1000, userAgent);
  const company = Object.values(tickers || {}).find((c) => c.ticker === symbol);
  if (!company) return { error: `${symbol} isn't in the SEC's list of US-listed companies.` };

  const facts = await cachedJson(FACTS_URL(company.cik_str), 6 * 60 * 60 * 1000, userAgent);
  const quarters = facts ? extractQuarterlyFinancials(facts) : [];
  if (!quarters.length) {
    return {
      error: `No quarterly US GAAP earnings found for ${symbol}. Foreign companies filing 20-F reports aren't covered.`,
    };
  }
  // Some companies report EPS under their own custom labels, so the
  // standard figure simply stops at some point (Berkshire's ends in 2013).
  const latestEnd = quarters[quarters.length - 1].end;
  if (daysBetween(latestEnd, new Date().toISOString().slice(0, 10)) > STALE_AFTER_DAYS) {
    return {
      error: `${symbol}'s latest standard EPS figure in its filings is for the quarter ended ${latestEnd}. It reports earnings in a non-standard way, so it can't be checked automatically.`,
    };
  }
  return {
    ticker: symbol,
    name: company.title,
    cik: company.cik_str,
    quarters,
    years: extractAnnualFinancials(facts),
    supply: extractSupplyFinancials(facts),
  };
}
