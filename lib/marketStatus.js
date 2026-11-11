// CAN SLIM "M" (market direction), computed from an index's daily candles
// using O'Neil/IBD's rules: distribution days, follow-through days, and
// where price sits against its 50- and 200-day moving averages. Pure
// functions, no I/O — candles come in as [{ time, close, low, volume }]
// sorted oldest first.

import { sma } from "./indicatorMath";

export const MARKET_RULES = {
  distributionDropPct: 0.2, // close down at least this % on higher volume
  distributionWindow: 25, // sessions a distribution day stays on the count
  distributionExpiryRallyPct: 5, // ...unless the index closes this % above it
  pressureDistributionDays: 5,
  correctionDistributionDays: 6, // while also below the 50-day
  correctionDrawdownPct: 8, // close this % below the uptrend's highest close
  followThroughMinDay: 4, // earliest rally-attempt day that can follow through
  followThroughGainPct: 1.25, // ...on a gain of at least this % on higher volume
  stallingMaxGainPct: 0.4, // stalling: up less than this % on higher volume,
  stallingNearHighPct: 2, // ...closing in the lower half of its range, within
  stallingLookback: 25, // ...this % of the highest close of these sessions
  ma50Rising: 10, // sessions back to compare the 50-day against
};

export const STATES = {
  uptrend: "uptrend",
  pressure: "pressure",
  correction: "correction",
};

function pctChange(from, to) {
  return ((to - from) / from) * 100;
}

// While the US market is open, the daily feed's last bar is today's
// unfinished session — its volume is partial, so judging it would invent
// distribution days. Drops that bar until 4pm New York time.
export function completedSessions(candles, now = new Date()) {
  if (!candles.length) return candles;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const nyDate = `${parts.year}-${parts.month}-${parts.day}`;
  const nyHour = Number(parts.hour) % 24;
  const last = candles[candles.length - 1];
  return last.time === nyDate && nyHour < 16 ? candles.slice(0, -1) : candles;
}

function isDistributionDay(candles, i, rules) {
  if (i === 0) return false;
  const prev = candles[i - 1];
  const curr = candles[i];
  if (curr.volume == null || prev.volume == null) return false;
  return pctChange(prev.close, curr.close) <= -rules.distributionDropPct && curr.volume > prev.volume;
}

// A stall: after a run-up, the index barely gains on heavier volume and
// closes in the bottom half of its range — selling hidden under a green day.
function isStallingDay(candles, i, rules) {
  if (i < rules.stallingLookback) return false;
  const prev = candles[i - 1];
  const curr = candles[i];
  if (curr.volume == null || prev.volume == null || curr.high == null || curr.low == null) return false;
  const gain = pctChange(prev.close, curr.close);
  if (gain < 0 || gain >= rules.stallingMaxGainPct || curr.volume <= prev.volume) return false;
  if (curr.close >= curr.low + (curr.high - curr.low) / 2) return false;
  let recentHigh = 0;
  for (let k = i - rules.stallingLookback; k < i; k++) recentHigh = Math.max(recentHigh, candles[k].close);
  return curr.close >= recentHigh * (1 - rules.stallingNearHighPct / 100);
}

function isFollowThroughDay(candles, i, rules) {
  const prev = candles[i - 1];
  const curr = candles[i];
  if (curr.volume == null || prev.volume == null) return false;
  return pctChange(prev.close, curr.close) >= rules.followThroughGainPct && curr.volume > prev.volume;
}

// Walks the whole history once so today's state comes from what actually
// happened (a real follow-through, a real build-up of distribution), not
// from a snapshot of today's numbers alone. `history` is the state after
// each session, for drawing the status over time.
export function analyzeIndex(candles, rules = MARKET_RULES) {
  const n = candles.length;
  if (n < 210) return null;

  const closes = candles.map((c) => c.close);
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const dayType = candles.map((_, i) =>
    isDistributionDay(candles, i, rules) ? "distribution" : isStallingDay(candles, i, rules) ? "stalling" : null
  );

  let state = null;
  let uptrendStart = 0; // distribution before this doesn't count
  let uptrendHigh = 0;
  let rally = null; // { lowIdx, day1Idx } while in a correction
  let lowSinceCorrection = null;
  let followThroughLow = null; // undercutting this after a follow-through fails it
  const followThroughs = [];
  const failedFollowThroughs = [];
  const history = [];

  const activeDistribution = (t) => {
    const out = [];
    for (let i = Math.max(uptrendStart, t - rules.distributionWindow + 1); i <= t; i++) {
      if (!dayType[i]) continue;
      let expired = false;
      for (let k = i + 1; k <= t; k++) {
        if (closes[k] >= closes[i] * (1 + rules.distributionExpiryRallyPct / 100)) {
          expired = true;
          break;
        }
      }
      if (!expired) out.push(i);
    }
    return out;
  };

  const enterCorrection = (t) => {
    state = STATES.correction;
    lowSinceCorrection = t;
    rally = null;
    followThroughLow = null;
  };

  const step = (t) => {
    const close = closes[t];

    if (state === null) {
      if (close > ma50[t] && ma50[t] > ma200[t]) {
        state = STATES.uptrend;
        uptrendStart = t;
        uptrendHigh = close;
      } else {
        enterCorrection(t);
      }
      return;
    }

    if (state === STATES.correction) {
      if (candles[t].low < candles[lowSinceCorrection].low) {
        lowSinceCorrection = t;
        rally = null;
        return;
      }
      if (!rally) {
        if (close > closes[t - 1]) rally = { lowIdx: lowSinceCorrection, day1Idx: t };
        return;
      }
      const rallyDay = t - rally.day1Idx + 1;
      if (rallyDay >= rules.followThroughMinDay && isFollowThroughDay(candles, t, rules)) {
        followThroughs.push(t);
        followThroughLow = candles[rally.lowIdx].low;
        state = STATES.uptrend;
        uptrendStart = t + 1;
        uptrendHigh = close;
        rally = null;
      }
      return;
    }

    // In an uptrend (confirmed or under pressure).
    if (followThroughLow != null && candles[t].low < followThroughLow) {
      failedFollowThroughs.push(followThroughs[followThroughs.length - 1]);
      enterCorrection(t);
      return;
    }
    uptrendHigh = Math.max(uptrendHigh, close);
    const count = activeDistribution(t).length;
    const belowMa50 = close < ma50[t];
    const drawdown = pctChange(uptrendHigh, close);

    if (
      drawdown <= -rules.correctionDrawdownPct ||
      (count >= rules.correctionDistributionDays && belowMa50)
    ) {
      enterCorrection(t);
    } else if (count >= rules.pressureDistributionDays || belowMa50) {
      state = STATES.pressure;
    } else {
      state = STATES.uptrend;
    }
  };

  for (let t = 200; t < n; t++) {
    step(t);
    history.push({ time: candles[t].time, state });
  }

  const last = n - 1;
  const lastClose = closes[last];
  const inUptrend = state !== STATES.correction;
  const dDays = inUptrend ? activeDistribution(last) : [];
  const rallyDay = rally ? last - rally.day1Idx + 1 : null;
  const lastFtd = followThroughs[followThroughs.length - 1];

  return {
    state,
    asOf: candles[last].time,
    close: lastClose,
    ma50: ma50[last],
    ma200: ma200[last],
    pctVsMa50: pctChange(ma50[last], lastClose),
    pctVsMa200: pctChange(ma200[last], lastClose),
    ma50Rising: ma50[last] > ma50[last - rules.ma50Rising],
    distributionDays: dDays.map((i) => ({
      time: candles[i].time,
      type: dayType[i],
      changePct: pctChange(closes[i - 1], closes[i]),
    })),
    lastFollowThrough: lastFtd != null ? candles[lastFtd].time : null,
    lastFollowThroughFailed: lastFtd != null && failedFollowThroughs.includes(lastFtd),
    followThroughDates: followThroughs.map((i) => candles[i].time),
    failedFollowThroughDates: failedFollowThroughs.map((i) => candles[i].time),
    rallyAttempt:
      state === STATES.correction && rally
        ? { day: rallyDay, lowDate: candles[rally.lowIdx].time }
        : null,
    drawdownFromHighPct: inUptrend ? pctChange(uptrendHigh, lastClose) : null,
    history,
  };
}

// The S&P 500 and Nasdaq decide; a follow-through on either one confirms a
// new uptrend (IBD's rule), so only both being in correction is a
// correction.
export function overallMarketState(sp500, nasdaq) {
  if (!sp500 || !nasdaq) return null;
  if (sp500.state === STATES.correction && nasdaq.state === STATES.correction) return STATES.correction;
  if (sp500.state === STATES.pressure || nasdaq.state === STATES.pressure) return STATES.pressure;
  return STATES.uptrend;
}

export const STATE_LABELS = {
  uptrend: "Confirmed uptrend",
  pressure: "Uptrend under pressure",
  correction: "Market in correction",
};

export const STATE_ACTIONS = {
  uptrend: "Buying is allowed: stocks breaking out of proper bases, at or near the pivot.",
  pressure: "Be selective: fewer and smaller new positions, tighter stops, no chasing.",
  correction: "No new buys. Protect capital and wait for a follow-through day.",
};

// Plain-language reasons for one index's state, for the conclusions text.
export function describeIndex(name, a, rules = MARKET_RULES) {
  if (!a) return null;
  const parts = [];
  if (a.state === STATES.correction) {
    parts.push(
      a.rallyAttempt
        ? `in correction, on day ${a.rallyAttempt.day} of a rally attempt (a follow-through needs day ${rules.followThroughMinDay}+, up ${rules.followThroughGainPct}%+ on higher volume)`
        : "in correction, with no rally attempt under way yet"
    );
    if (a.lastFollowThroughFailed) parts.push("its last follow-through failed (the rally's low was undercut)");
  } else {
    const count = a.distributionDays.length;
    const stalls = a.distributionDays.filter((d) => d.type === "stalling").length;
    const toPressure = rules.pressureDistributionDays - count;
    parts.push(
      `${count} distribution day${count === 1 ? "" : "s"}` +
        (stalls ? ` incl. ${stalls} stalling` : "") +
        (a.state === STATES.uptrend && toPressure > 0
          ? ` (${toPressure} more put${toPressure === 1 ? "s" : ""} it under pressure)`
          : "")
    );
  }
  parts.push(
    `${a.pctVsMa50 >= 0 ? "above" : "below"} its 50-day (${a.pctVsMa50 >= 0 ? "+" : ""}${a.pctVsMa50.toFixed(1)}%)` +
      (a.ma50Rising ? ", which is rising" : ", which is falling")
  );
  return `${name}: ${parts.join("; ")}.`;
}
