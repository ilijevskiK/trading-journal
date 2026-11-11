// CAN SLIM "N" — something new, and the price breaking out of a proper base
// to a new high. Computed from completed daily candles (oldest first, with
// volume) plus what you've confirmed by hand: the pivot price and whether
// there's a real "new" behind the move.

export const NEW_HIGH_RULES = {
  yearSessions: 252,
  nearHighPct: 5, // within this of the 52-week high counts as "at a new high"
  maxBelowHighPct: 15, // further than this is a warning...
  farBelowHighPct: 25, // ...and this is a fail
  buyRangePct: 5, // buy only up to this % above the pivot
  minBaseWeeks: 5, // flat bases; cups usually run 7+
  maxBaseDepthPct: 33, // deeper is a warning...
  failBaseDepthPct: 50, // ...and this deep is a fail
  breakoutVolumePct: 40, // breakout volume vs the 50-day average
  breakoutLookback: 30, // sessions back to look for the breakout day
};

function average(values) {
  const v = values.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// The base runs from the year's peak before the breakout (its left side)
// to the breakout, or to today if price hasn't broken out yet.
function measureBase(candles, pivot, rules) {
  const n = candles.length;
  let breakoutIdx = null;
  for (let i = n - 1; i >= Math.max(1, n - rules.breakoutLookback); i--) {
    if (candles[i].close > pivot && candles[i - 1].close <= pivot) {
      breakoutIdx = i;
      break;
    }
  }
  const end = breakoutIdx ?? n;
  const from = Math.max(0, end - rules.yearSessions);
  if (end - from < 10) return { breakoutIdx, base: null };

  let leftIdx = from;
  for (let i = from; i < end; i++) if (candles[i].high >= candles[leftIdx].high) leftIdx = i;
  let lowIdx = leftIdx;
  for (let i = leftIdx; i < end; i++) if (candles[i].low < candles[lowIdx].low) lowIdx = i;

  const leftHigh = candles[leftIdx].high;
  const sessions = end - leftIdx;
  const avgVolume50 = average(candles.slice(Math.max(0, end - 60), Math.max(0, end - 10)).map((c) => c.volume));
  const lateVolume = average(candles.slice(Math.max(leftIdx, end - 10), end).map((c) => c.volume));

  return {
    breakoutIdx,
    base: {
      leftDate: candles[leftIdx].time,
      leftHigh,
      lowDate: candles[lowIdx].time,
      low: candles[lowIdx].low,
      depthPct: ((leftHigh - candles[lowIdx].low) / leftHigh) * 100,
      weeks: sessions / 5,
      volumeDryUpRatio: avgVolume50 && lateVolume != null ? lateVolume / avgVolume50 : null,
    },
  };
}

export function analyzeNewHighs(candles, { pivot = null, newConfirmed = false } = {}, rules = NEW_HIGH_RULES) {
  if (candles.length < 60) {
    return { verdict: null, reasons: [{ level: "info", text: "Not enough price history yet." }], stats: null };
  }
  const n = candles.length;
  const last = candles[n - 1];
  const year = candles.slice(-rules.yearSessions);
  const high52 = Math.max(...year.map((c) => c.high));
  const pctBelowHigh = ((high52 - last.close) / high52) * 100;
  const highDate = [...year].reverse().find((c) => c.high === high52).time;

  const reasons = [];
  let verdict = "pass";
  const worse = (v) => {
    const order = ["strong", "pass", "warning", "fail"];
    if (order.indexOf(v) > order.indexOf(verdict)) verdict = v;
  };

  if (pctBelowHigh > rules.farBelowHighPct) {
    worse("fail");
    reasons.push({
      level: "fail",
      text: `${pctBelowHigh.toFixed(0)}% below its 52-week high of $${high52.toFixed(2)}: not a new-high candidate. O'Neil buys stocks near highs, not bargains.`,
    });
  } else if (pctBelowHigh > rules.maxBelowHighPct) {
    worse("warning");
    reasons.push({
      level: "warning",
      text: `${pctBelowHigh.toFixed(0)}% below its 52-week high of $${high52.toFixed(2)}: still repairing, not yet near new highs.`,
    });
  } else {
    reasons.push({
      level: "pass",
      text:
        pctBelowHigh <= rules.nearHighPct
          ? `At or near a new 52-week high ($${high52.toFixed(2)}, ${pctBelowHigh.toFixed(1)}% away).`
          : `${pctBelowHigh.toFixed(0)}% below its 52-week high of $${high52.toFixed(2)}, close enough to be basing.`,
    });
  }

  if (newConfirmed) {
    reasons.push({ level: "pass", text: "You've confirmed something new behind the move." });
  } else {
    worse("warning");
    reasons.push({
      level: "warning",
      text: "Not confirmed yet: is there a new product, management, or industry change behind the move?",
    });
  }

  let measured = null;
  let zone = null;
  let breakoutVolumePct = null;
  if (pivot) {
    measured = measureBase(candles, pivot, rules);
    const pctFromPivot = ((last.close - pivot) / pivot) * 100;
    zone = pctFromPivot < 0 ? "below" : pctFromPivot <= rules.buyRangePct ? "buy" : "extended";
    if (zone === "below") {
      worse("warning");
      reasons.push({
        level: "warning",
        text: `${Math.abs(pctFromPivot).toFixed(1)}% below your $${pivot.toFixed(2)} pivot: no breakout yet.`,
      });
    } else if (zone === "buy") {
      reasons.push({
        level: "pass",
        text: `In the buy range: ${pctFromPivot.toFixed(1)}% above the $${pivot.toFixed(2)} pivot (up to +${rules.buyRangePct}%).`,
      });
    } else {
      worse("warning");
      reasons.push({
        level: "warning",
        text: `Extended: ${pctFromPivot.toFixed(1)}% above the $${pivot.toFixed(2)} pivot, past the +${rules.buyRangePct}% buy range. Don't chase.`,
      });
    }

    const { base, breakoutIdx } = measured;
    if (base) {
      if (base.depthPct > rules.failBaseDepthPct) {
        worse("fail");
        reasons.push({ level: "fail", text: `Base is ${base.depthPct.toFixed(0)}% deep: too deep to be a proper base.` });
      } else if (base.depthPct > rules.maxBaseDepthPct) {
        worse("warning");
        reasons.push({
          level: "warning",
          text: `Base is ${base.depthPct.toFixed(0)}% deep, deeper than O'Neil's usual ${rules.maxBaseDepthPct}% limit (acceptable only after a bear market).`,
        });
      }
      if (base.weeks < rules.minBaseWeeks) {
        worse("warning");
        reasons.push({
          level: "warning",
          text: `Base is only ${base.weeks.toFixed(0)} week${base.weeks < 1.5 ? "" : "s"} long; proper bases take ${rules.minBaseWeeks}+ weeks.`,
        });
      }
      if (base.volumeDryUpRatio != null) {
        reasons.push({
          level: "info",
          text:
            base.volumeDryUpRatio < 1
              ? `Volume dried up late in the base (${(base.volumeDryUpRatio * 100).toFixed(0)}% of normal), a sign sellers are exhausted.`
              : `Volume didn't dry up late in the base (${(base.volumeDryUpRatio * 100).toFixed(0)}% of normal).`,
        });
      }
    }

    if (breakoutIdx != null) {
      const prior = candles.slice(Math.max(0, breakoutIdx - 50), breakoutIdx).map((c) => c.volume);
      const avg = average(prior);
      const vol = candles[breakoutIdx].volume;
      if (avg && vol != null) {
        breakoutVolumePct = ((vol - avg) / avg) * 100;
        if (breakoutVolumePct >= rules.breakoutVolumePct) {
          reasons.push({
            level: "pass",
            text: `Broke out on ${candles[breakoutIdx].time} on volume ${breakoutVolumePct.toFixed(0)}% above average.`,
          });
        } else {
          worse("warning");
          reasons.push({
            level: "warning",
            text: `Broke out on ${candles[breakoutIdx].time} on weak volume (${breakoutVolumePct >= 0 ? "+" : ""}${breakoutVolumePct.toFixed(0)}% vs average; O'Neil wants +${rules.breakoutVolumePct}%).`,
          });
        }
      }
    }

    if (
      verdict === "pass" &&
      pctBelowHigh <= rules.nearHighPct &&
      zone === "buy" &&
      breakoutVolumePct != null &&
      breakoutVolumePct >= rules.breakoutVolumePct
    ) {
      verdict = "strong";
    }
  } else {
    reasons.push({
      level: "info",
      text: "Enter the pivot (the buy point of the base) to check the breakout, the base, and the buy range.",
    });
  }

  return {
    verdict,
    reasons,
    stats: {
      close: last.close,
      asOf: last.time,
      high52,
      pctBelowHigh,
      highDate,
      pivot,
      zone,
      buyLimit: pivot ? pivot * (1 + rules.buyRangePct / 100) : null,
      base: measured?.base ?? null,
      breakoutDate: measured?.breakoutIdx != null ? candles[measured.breakoutIdx].time : null,
      breakoutVolumePct,
    },
  };
}
