// CAN SLIM "L" — leader or laggard. O'Neil's RS Rating ranks a stock's
// 12-month performance (the latest quarter weighted double) against every
// other stock; without data on the whole market, this scores the stock the
// same way against the S&P 500 (SPY), and watches its RS line (price ÷ SPY)
// for new highs. Candles are completed daily bars, oldest first.

export const LEADERSHIP_RULES = {
  periods: [63, 126, 189, 252], // ~3, 6, 9 and 12 months of sessions
  weights: [0.4, 0.2, 0.2, 0.2], // latest quarter counts double
  strongEdgePts: 20, // weighted score this many points above SPY's
  rsNearHighPct: 2,
  rsWeakPct: 10, // RS line further than this below its high is a warning
  minRating: 80, // O'Neil buys RS Rating 80+...
  warnRating: 70, // ...and avoids anything below 70
  strongRating: 90,
};

const growth = (from, to) => ((to - from) / from) * 100;

// Stock and benchmark closes on the dates both traded.
export function alignWithBenchmark(candles, benchmark) {
  const bench = new Map(benchmark.map((c) => [c.time, c.close]));
  return candles.filter((c) => bench.has(c.time)).map((c) => ({ time: c.time, stock: c.close, bench: bench.get(c.time) }));
}

// With `rsRating` (1-99, ranked against every US company), that rating
// decides the verdict and the S&P 500 comparison becomes supporting detail.
// Without it, the S&P 500 comparison stands in for it.
export function analyzeLeadership(candles, benchmark, { rsRating = null } = {}, rules = LEADERSHIP_RULES) {
  const rows = alignWithBenchmark(candles, benchmark);
  const longest = rules.periods[rules.periods.length - 1];
  if (rows.length <= longest) {
    return { verdict: null, reasons: [{ level: "info", text: "Needs a year of price history next to SPY." }], stats: null };
  }

  const last = rows[rows.length - 1];
  const returns = rules.periods.map((p) => {
    const then = rows[rows.length - 1 - p];
    return { sessions: p, stock: growth(then.stock, last.stock), bench: growth(then.bench, last.bench) };
  });
  const score = (key) => returns.reduce((sum, r, i) => sum + r[key] * rules.weights[i], 0);
  const stockScore = score("stock");
  const benchScore = score("bench");
  const edge = stockScore - benchScore;

  const rsLine = rows.slice(-252).map((r) => ({ time: r.time, value: r.stock / r.bench }));
  const rsHigh = Math.max(...rsLine.map((p) => p.value));
  const rsBelowHighPct = ((rsHigh - rsLine[rsLine.length - 1].value) / rsHigh) * 100;

  const reasons = [];
  let verdict;
  const vsSpy =
    edge <= 0
      ? `trails the S&P 500 by ${Math.abs(edge).toFixed(0)} points on O'Neil's weighting`
      : `beats the S&P 500 by ${edge.toFixed(0)} points on O'Neil's weighting (latest quarter counted double)`;

  if (rsRating != null) {
    const ranked = `RS Rating ${rsRating}: it outperformed ${rsRating}% of US stocks over the last year`;
    if (rsRating >= rules.minRating) {
      verdict = "pass";
      reasons.push({ level: "pass", text: `${ranked}.` });
    } else if (rsRating >= rules.warnRating) {
      verdict = "warning";
      reasons.push({ level: "warning", text: `${ranked}, below O'Neil's ${rules.minRating}+ for leaders.` });
    } else {
      verdict = "fail";
      reasons.push({
        level: "fail",
        text: `${ranked}: a laggard. O'Neil avoids anything below ${rules.warnRating}, however cheap it looks.`,
      });
    }
    reasons.push({ level: "info", text: `It ${vsSpy}.` });
  } else if (edge <= 0) {
    verdict = "fail";
    reasons.push({
      level: "fail",
      text: `Laggard: its weighted 12-month performance ${vsSpy}. O'Neil buys leaders, not stocks that look cheap.`,
    });
  } else {
    verdict = "pass";
    reasons.push({ level: "pass", text: `Outperforming: it ${vsSpy}.` });
  }

  if (rsBelowHighPct <= rules.rsNearHighPct) {
    reasons.push({ level: "pass", text: "Its RS line is at a new 52-week high: it's leading the market right now." });
  } else if (rsBelowHighPct > rules.rsWeakPct) {
    if (verdict === "pass") verdict = "warning";
    reasons.push({
      level: "warning",
      text: `Its RS line is ${rsBelowHighPct.toFixed(0)}% below its 52-week high: the stock has been losing ground to the market.`,
    });
  } else {
    reasons.push({ level: "info", text: `Its RS line is ${rsBelowHighPct.toFixed(0)}% below its 52-week high.` });
  }

  const leading = rsRating != null ? rsRating >= rules.strongRating : edge >= rules.strongEdgePts;
  if (verdict === "pass" && leading && rsBelowHighPct <= rules.rsNearHighPct) verdict = "strong";

  reasons.push({
    level: "info",
    text:
      rsRating != null
        ? "The RS Rating is rebuilt the way IBD describes it (same weighting, ranked against every SEC-listed company), so it can differ from IBD's own number by a few points. Industry group leadership isn't checked yet."
        : "No RS Rating yet, so this compares the stock with the S&P 500 only (O'Neil wants an RS Rating of 80+). Industry group leadership isn't checked yet.",
  });

  return { verdict, reasons, stats: { returns, stockScore, benchScore, edge, rsLine, rsHigh, rsBelowHighPct } };
}
