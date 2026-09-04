// Shared math helpers + per-indicator calculations, ported from the real
// published Pine Script for each indicator (see
// content/indicators/pine-scripts/*.js for the source). These are
// simplified, client-side re-implementations for the fullscreen chart
// toggles — not a Pine Script interpreter.

export function trueRangeSeries(candles) {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
}

// Simple moving average. Returns null until `period` values are available.
export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// Wilder's RMA (used by Pine's ta.atr / ta.rsi), seeded with an SMA of the
// first `period` values.
export function rma(values, period) {
  const out = new Array(values.length).fill(null);
  let prev = null;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      sum += values[i];
      if (i === period - 1) {
        prev = sum / period;
        out[i] = prev;
      }
    } else {
      prev = (prev * (period - 1) + values[i]) / period;
      out[i] = prev;
    }
  }
  return out;
}

// Pine's ta.ema seeds with the *first* value directly (not an SMA), unlike
// the chart's own EMA-overlay toggles which seed with an SMA — kept
// separate here so each indicator matches its actual published behavior.
export function emaSeededFirst(values, period) {
  const k = 2 / (period + 1);
  const out = new Array(values.length).fill(null);
  let prev = null;
  for (let i = 0; i < values.length; i++) {
    prev = prev === null ? values[i] : values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(values, period) {
  const out = new Array(values.length).fill(null);
  let avgGain = null;
  let avgLoss = null;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      gainSum += gain;
      lossSum += loss;
      if (i === period) {
        avgGain = gainSum / period;
        avgLoss = lossSum / period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }
  return out;
}

function rollingExtreme(values, period, pick) {
  const out = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    let best = values[i - period + 1];
    for (let k = i - period + 2; k <= i; k++) best = pick(best, values[k]);
    out[i] = best;
  }
  return out;
}

export const rollingHighest = (values, period) => rollingExtreme(values, period, Math.max);
export const rollingLowest = (values, period) => rollingExtreme(values, period, Math.min);

// Endpoint of a linear-regression best-fit line over the trailing `period`
// values (Pine's ta.linreg(source, period, 0)).
export function linregEndpoint(values, period) {
  const n = values.length;
  const out = new Array(n).fill(null);
  const sumX = (period * (period - 1)) / 2;
  const sumX2 = ((period - 1) * period * (2 * period - 1)) / 6;
  const denom = period * sumX2 - sumX * sumX;
  for (let i = period - 1; i < n; i++) {
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < period; x++) {
      const y = values[i - period + 1 + x];
      sumY += y;
      sumXY += x * y;
    }
    const slope = denom === 0 ? 0 : (period * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / period;
    out[i] = intercept + slope * (period - 1);
  }
  return out;
}

// --- AlphaTrend [KivancOzbilgic] ---------------------------------------
// Real script default filters by MFI when volume is available, RSI
// otherwise. This app doesn't fetch volume data, so this always uses the
// RSI branch (the script's own "no volume data" mode).
export function computeAlphaTrend(candles, { period = 14, coeff = 1 } = {}) {
  if (candles.length < period + 2) return [];
  const tr = trueRangeSeries(candles);
  const atr = sma(tr, period);
  const closes = candles.map((c) => c.close);
  const rsiValues = rsi(closes, period);

  const points = [];
  let prev = null;
  for (let i = 0; i < candles.length; i++) {
    if (atr[i] == null || rsiValues[i] == null) continue;
    const upT = candles[i].low - atr[i] * coeff;
    const downT = candles[i].high + atr[i] * coeff;
    let value;
    if (rsiValues[i] >= 50) {
      value = prev !== null && upT < prev ? prev : upT;
    } else {
      value = prev !== null && downT > prev ? prev : downT;
    }
    prev = value;
    points.push({ time: candles[i].time, value });
  }
  return points;
}

// --- WaveTrend Oscillator [LazyBear] ------------------------------------
export function computeWaveTrend(candles, { channelLength = 10, averageLength = 21 } = {}) {
  const ap = candles.map((c) => (c.high + c.low + c.close) / 3);
  const esa = emaSeededFirst(ap, channelLength);
  const absDiff = ap.map((v, i) => Math.abs(v - esa[i]));
  const d = emaSeededFirst(absDiff, channelLength);
  const ci = ap.map((v, i) => (d[i] === 0 ? 0 : (v - esa[i]) / (0.015 * d[i])));
  const tci = emaSeededFirst(ci, averageLength);
  const wt1 = tci;
  const wt2 = sma(wt1, 4);
  return candles.map((c, i) => ({ time: c.time, wt1: wt1[i], wt2: wt2[i] }));
}

// --- Squeeze Momentum Indicator [LazyBear] ------------------------------
export function computeSqueezeMomentum(
  candles,
  { bbLength = 20, bbMult = 2.0, kcLength = 20, kcMult = 1.5 } = {}
) {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const tr = trueRangeSeries(candles);

  const basis = sma(closes, bbLength);
  // Matches the original published script exactly: it reuses kcMult for
  // the BB deviation instead of the separate bbMult input — a known quirk
  // of the original, preserved here rather than "corrected".
  const stdevArr = rollingStdev(closes, bbLength);
  const upperBB = basis.map((b, i) => (b == null || stdevArr[i] == null ? null : b + kcMult * stdevArr[i]));
  const lowerBB = basis.map((b, i) => (b == null || stdevArr[i] == null ? null : b - kcMult * stdevArr[i]));

  const ma = sma(closes, kcLength);
  const rangeMa = sma(tr, kcLength);
  const upperKC = ma.map((m, i) => (m == null || rangeMa[i] == null ? null : m + rangeMa[i] * kcMult));
  const lowerKC = ma.map((m, i) => (m == null || rangeMa[i] == null ? null : m - rangeMa[i] * kcMult));

  const highestHigh = rollingHighest(highs, kcLength);
  const lowestLow = rollingLowest(lows, kcLength);
  const smaClose = sma(closes, kcLength);

  const derived = candles.map((c, i) => {
    if (highestHigh[i] == null || lowestLow[i] == null || smaClose[i] == null) return null;
    const mid = (highestHigh[i] + lowestLow[i]) / 2;
    return c.close - (mid + smaClose[i]) / 2;
  });

  const filledDerived = derived.map((v) => v ?? 0);
  const val = linregEndpoint(filledDerived, kcLength);

  const points = [];
  let prevVal = null;
  for (let i = 0; i < candles.length; i++) {
    if (
      derived[i] == null ||
      val[i] == null ||
      upperBB[i] == null ||
      lowerBB[i] == null ||
      upperKC[i] == null ||
      lowerKC[i] == null
    ) {
      continue;
    }
    const sqzOn = lowerBB[i] > lowerKC[i] && upperBB[i] < upperKC[i];
    const sqzOff = lowerBB[i] < lowerKC[i] && upperBB[i] > upperKC[i];
    const noSqz = !sqzOn && !sqzOff;
    const v = val[i];
    const rising = prevVal !== null && v > prevVal;
    const falling = prevVal !== null && v < prevVal;
    let barColor;
    if (v > 0) barColor = rising ? "#6FCBA6" /* lime: accelerating up */ : "#4FAF8B" /* green: fading up */;
    else barColor = falling ? "#DB6E54" /* red-bright: accelerating down */ : "#C1573F" /* maroon: fading down */;
    const state = noSqz ? "none" : sqzOn ? "on" : "off";
    prevVal = v;
    points.push({ time: candles[i].time, value: v, barColor, state });
  }
  return points;
}

// --- Stage Analysis Breakout Strategy (this journal) -------------------
// Mirrors content/strategies/pine-scripts/stage-analysis.js exactly: a
// 30-week (≈150-day) MA and its slope, a rolling resistance level, and a
// volume-confirmed breakout above both. `inPosition` is tracked the same
// way the Pine strategy tracks strategy.position_size, so only the first
// breakdown after an active breakout gets flagged as an exit — not every
// day price happens to sit below the average.
export function computeStageAnalysis(
  candles,
  {
    maLength = 150,
    maSlopeLookback = 10,
    breakoutLookback = 20,
    volAvgLength = 50,
    volMultiplier = 1.5,
  } = {}
) {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const volumes = candles.map((c) => c.volume ?? 0);

  const maSeries = sma(closes, maLength);
  const highestHigh = rollingHighest(highs, breakoutLookback);
  const volAvgSeries = sma(volumes, volAvgLength);

  const points = [];
  let inPosition = false;

  for (let i = 0; i < candles.length; i++) {
    if (maSeries[i] == null) continue;

    const priorMa = i >= maSlopeLookback ? maSeries[i - maSlopeLookback] : null;
    const maRising = priorMa != null ? maSeries[i] > priorMa : null;
    const resistance = i >= 1 ? highestHigh[i - 1] : null;
    const volumeConfirmed = volAvgSeries[i] != null && volumes[i] > volAvgSeries[i] * volMultiplier;

    const stage2Breakout =
      !inPosition &&
      resistance != null &&
      maRising === true &&
      closes[i] > resistance &&
      closes[i] > maSeries[i] &&
      volumeConfirmed;

    const stageBreakdown = inPosition && closes[i] < maSeries[i];

    if (stage2Breakout) inPosition = true;
    if (stageBreakdown) inPosition = false;

    points.push({
      time: candles[i].time,
      ma: maSeries[i],
      maRising,
      resistance,
      stage2Breakout,
      stageBreakdown,
    });
  }

  return points;
}

// RMA smoothing that only starts once real data begins at `startIndex`
// (everything before stays null) — used for ADX, whose DX input isn't
// defined until a bar or two into the series.
function rmaFromIndex(values, period, startIndex) {
  const out = new Array(values.length).fill(null);
  if (startIndex == null || startIndex < 0) return out;
  let sum = 0;
  let count = 0;
  let prev = null;
  for (let i = startIndex; i < values.length; i++) {
    if (count < period) {
      sum += values[i];
      count++;
      if (count === period) {
        prev = sum / period;
        out[i] = prev;
      }
    } else {
      prev = (prev * (period - 1) + values[i]) / period;
      out[i] = prev;
    }
  }
  return out;
}

// Wilder's DMI/ADX — matches Pine's ta.dmi(len, len). Returns { plusDI,
// minusDI, adx }, each a per-bar array (null until enough data exists).
export function computeADX(candles, length) {
  const n = candles.length;
  const tr = trueRangeSeries(candles);
  const plusDM = new Array(n).fill(0);
  const minusDM = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  const smoothedPlusDM = rma(plusDM, length);
  const smoothedMinusDM = rma(minusDM, length);
  const smoothedTR = rma(tr, length);

  const plusDI = new Array(n).fill(null);
  const minusDI = new Array(n).fill(null);
  const dx = new Array(n).fill(null);
  let firstValidDx = null;

  for (let i = 0; i < n; i++) {
    if (smoothedTR[i] == null || smoothedTR[i] === 0 || smoothedPlusDM[i] == null || smoothedMinusDM[i] == null) {
      continue;
    }
    plusDI[i] = 100 * (smoothedPlusDM[i] / smoothedTR[i]);
    minusDI[i] = 100 * (smoothedMinusDM[i] / smoothedTR[i]);
    const sum = plusDI[i] + minusDI[i];
    dx[i] = sum === 0 ? 0 : (100 * Math.abs(plusDI[i] - minusDI[i])) / sum;
    if (firstValidDx == null) firstValidDx = i;
  }

  const adx = rmaFromIndex(dx.map((v) => v ?? 0), length, firstValidDx);
  for (let i = 0; i < n; i++) {
    if (dx[i] == null) adx[i] = null;
  }

  return { plusDI, minusDI, adx };
}

// --- Entry Disqualifier — Noise Filter (this journal) -------------------
// A checklist, not a signal: mirrors
// content/strategies/pine-scripts/entry-disqualifier.js exactly — the same
// stage/slope test applied to both the stock and a benchmark, relative
// strength against that benchmark, extension above the stage MA, ADX chop
// filter, volume dry-up, and a base-tightening ratio. `benchmarkCandles`
// must be the same daily series (any symbol, e.g. SPY) covering the same
// date range as `candles`; bars with no aligned benchmark date are skipped.
export function computeEntryDisqualifier(candles, benchmarkCandles, options = {}) {
  const {
    maLength = 150,
    maSlopeLookback = 10,
    rsLength = 50,
    extensionPct = 20.0,
    adxLength = 14,
    adxThreshold = 20.0,
    volAvgLength = 50,
    dryUpMultiplier = 0.7,
    tightLookback = 10,
    tightVsWideRatio = 0.6,
  } = options;

  const n = candles.length;
  if (!benchmarkCandles || benchmarkCandles.length === 0) return [];

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const volumes = candles.map((c) => c.volume ?? 0);

  const stageMA = sma(closes, maLength);
  const volAvgSeries = sma(volumes, volAvgLength);
  const highestHigh = rollingHighest(highs, tightLookback);
  const lowestLow = rollingLowest(candles.map((c) => c.low), tightLookback);
  const { adx } = computeADX(candles, adxLength);

  const benchCloses = benchmarkCandles.map((c) => c.close);
  const benchMA = sma(benchCloses, maLength);
  const benchTimeToIndex = new Map();
  benchmarkCandles.forEach((c, i) => benchTimeToIndex.set(c.time, i));

  const rsLine = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const bi = benchTimeToIndex.get(candles[i].time);
    if (bi == null) continue;
    rsLine[i] = closes[i] / benchCloses[bi];
  }
  const rsLineMA = sma(
    rsLine.map((v) => v ?? 0),
    rsLength
  );

  const points = [];

  for (let i = 0; i < n; i++) {
    if (stageMA[i] == null) continue;
    const priorMa = i >= maSlopeLookback ? stageMA[i - maSlopeLookback] : null;
    if (priorMa == null) continue;
    const maRising = stageMA[i] > priorMa;
    const stage =
      maRising && closes[i] > stageMA[i]
        ? 2
        : !maRising && closes[i] < stageMA[i]
        ? 4
        : closes[i] < stageMA[i]
        ? 3
        : 1;

    const bi = benchTimeToIndex.get(candles[i].time);
    if (bi == null || benchMA[bi] == null) continue;
    const benchPriorMa = bi >= maSlopeLookback ? benchMA[bi - maSlopeLookback] : null;
    if (benchPriorMa == null) continue;
    const benchRising = benchMA[bi] > benchPriorMa;
    const benchClose = benchCloses[bi];
    const marketStage =
      benchRising && benchClose > benchMA[bi]
        ? 2
        : !benchRising && benchClose < benchMA[bi]
        ? 4
        : benchClose < benchMA[bi]
        ? 3
        : 1;

    if (rsLine[i] == null || rsLineMA[i] == null || adx[i] == null || volAvgSeries[i] == null) continue;

    const priorHigh = i >= tightLookback ? highestHigh[i - tightLookback] : null;
    const priorLow = i >= tightLookback ? lowestLow[i - tightLookback] : null;
    if (priorHigh == null || priorLow == null || highestHigh[i] == null || lowestLow[i] == null) continue;

    const recentRange = highestHigh[i] - lowestLow[i];
    const priorRange = priorHigh - priorLow;

    const flagWrongStage = stage !== 2;
    const flagMarketWeak = marketStage !== 2;
    const flagWeakRS = rsLine[i] < rsLineMA[i];
    const flagExtended = closes[i] > stageMA[i] * (1 + extensionPct / 100);
    const flagChoppy = adx[i] < adxThreshold;
    const flagVolumeDry = volumes[i] < volAvgSeries[i] * dryUpMultiplier;
    const flagWideBase = priorRange > 0 && recentRange >= priorRange * tightVsWideRatio;

    const flags = {
      flagWrongStage,
      flagMarketWeak,
      flagWeakRS,
      flagExtended,
      flagChoppy,
      flagVolumeDry,
      flagWideBase,
    };
    const flagCount = Object.values(flags).filter(Boolean).length;

    points.push({
      time: candles[i].time,
      ma: stageMA[i],
      maRising,
      noiseFree: flagCount === 0,
      flagCount,
      flags,
    });
  }

  return points;
}

// --- Minervini Trend Template --------------------------------------------
// An 8-condition checklist (from Trade Like a Stock Market Wizard, also in
// this journal's Books section) qualifying whether a stock is in a genuine
// Stage 2 uptrend. The 8th condition — "RS Rank >= 70" — is a percentile
// rank against the whole market, which this app has no access to;
// approximated the same way computeEntryDisqualifier's relative-strength
// flag is, via a benchmark-relative line's own trend rather than a true
// rank (see the strategy write-up for this caveat). `benchmarkCandles` must
// be the same daily series (any symbol, e.g. SPY) covering the same date
// range as `candles`; bars with no aligned benchmark date are skipped.
export function computeTrendTemplate(candles, benchmarkCandles, options = {}) {
  const {
    ma50Length = 50,
    ma150Length = 150,
    ma200Length = 200,
    ma200SlopeLookback = 20,
    yearLookback = 252,
    lowPct = 30,
    highPct = 25,
    rsLength = 50,
    rsSlopeLookback = 20,
  } = options;

  const n = candles.length;
  if (!benchmarkCandles || benchmarkCandles.length === 0) return [];

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const ma50 = sma(closes, ma50Length);
  const ma150 = sma(closes, ma150Length);
  const ma200 = sma(closes, ma200Length);
  const high52w = rollingHighest(highs, yearLookback);
  const low52w = rollingLowest(lows, yearLookback);

  const benchCloses = benchmarkCandles.map((c) => c.close);
  const benchTimeToIndex = new Map();
  benchmarkCandles.forEach((c, i) => benchTimeToIndex.set(c.time, i));

  const rsLine = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const bi = benchTimeToIndex.get(candles[i].time);
    if (bi == null) continue;
    rsLine[i] = closes[i] / benchCloses[bi];
  }
  const rsLineMA = sma(
    rsLine.map((v) => v ?? 0),
    rsLength
  );

  const points = [];

  for (let i = 0; i < n; i++) {
    if (ma50[i] == null || ma150[i] == null || ma200[i] == null) continue;
    if (high52w[i] == null || low52w[i] == null) continue;

    const priorMa200 = i >= ma200SlopeLookback ? ma200[i - ma200SlopeLookback] : null;
    if (priorMa200 == null) continue;
    const ma200Rising = ma200[i] > priorMa200;

    const priorRsMa = i >= rsSlopeLookback ? rsLineMA[i - rsSlopeLookback] : null;
    if (rsLine[i] == null || rsLineMA[i] == null || priorRsMa == null) continue;
    const relativeStrengthRising = rsLineMA[i] > priorRsMa;

    const close = closes[i];
    const checks = {
      priceAboveMa150And200: close > ma150[i] && close > ma200[i],
      ma150AboveMa200: ma150[i] > ma200[i],
      ma200Rising,
      ma50AboveMa150And200: ma50[i] > ma150[i] && ma50[i] > ma200[i],
      priceAboveMa50: close > ma50[i],
      above30PctFromLow: close >= low52w[i] * (1 + lowPct / 100),
      within25PctOfHigh: close >= high52w[i] * (1 - highPct / 100),
      relativeStrengthRising,
    };
    const passCount = Object.values(checks).filter(Boolean).length;

    points.push({
      time: candles[i].time,
      ma50: ma50[i],
      ma150: ma150[i],
      ma200: ma200[i],
      high52w: high52w[i],
      low52w: low52w[i],
      checks,
      passCount,
      qualifies: passCount === 8,
    });
  }

  return points;
}

// --- Bollinger Bands -----------------------------------------------------
export function computeBollingerBands(candles, { period = 20, mult = 2 } = {}) {
  const closes = candles.map((c) => c.close);
  const basis = sma(closes, period);
  const stdev = rollingStdev(closes, period);
  return candles.map((c, i) => ({
    time: c.time,
    basis: basis[i],
    upper: basis[i] == null || stdev[i] == null ? null : basis[i] + mult * stdev[i],
    lower: basis[i] == null || stdev[i] == null ? null : basis[i] - mult * stdev[i],
  }));
}

// --- Relative Strength Index ---------------------------------------------
export function computeRSI(candles, { period = 14 } = {}) {
  const closes = candles.map((c) => c.close);
  const values = rsi(closes, period);
  return candles.map((c, i) => ({ time: c.time, value: values[i] }));
}

function rollingStdev(values, period) {
  const out = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += values[k];
    const mean = sum / period;
    let variance = 0;
    for (let k = i - period + 1; k <= i; k++) variance += (values[k] - mean) ** 2;
    out[i] = Math.sqrt(variance / period);
  }
  return out;
}

// --- Average True Range ---------------------------------------------------
// A built-in TradingView calculation (ta.atr), not a community script —
// Wilder's smoothed true range, the same intermediate computeADX already
// derives internally for its own DI/DX math.
export function computeATR(candles, { period = 14 } = {}) {
  const atr = rma(trueRangeSeries(candles), period);
  return candles.map((c, i) => ({ time: c.time, value: atr[i] }));
}

// Same numeric-timestamp-vs-"YYYY-MM-DD"-string handling as
// CandlestickChart.js's timeToDateStr — duplicated locally rather than
// importing from a component, since this module has no other UI dependency.
function dayKey(time) {
  return typeof time === "number" ? new Date(time * 1000).toISOString().slice(0, 10) : time;
}

// --- VWAP (Volume-Weighted Average Price) ---------------------------------
// A built-in TradingView calculation (ta.vwap), not a community script.
// Resets its cumulative sums at every new calendar day, matching standard
// "session VWAP" behavior on intraday bars. On daily/weekly bars each bar
// *is* its own day, so the running sums reset every bar and this reduces to
// that bar's own typical price — mathematically correct, just not a useful
// line at that resolution (see the indicator's write-up for this caveat).
export function computeVWAP(candles) {
  let cumPV = 0;
  let cumVol = 0;
  let currentDay = null;
  return candles.map((c) => {
    const day = dayKey(c.time);
    if (day !== currentDay) {
      currentDay = day;
      cumPV = 0;
      cumVol = 0;
    }
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const volume = c.volume ?? 0;
    cumPV += typicalPrice * volume;
    cumVol += volume;
    return { time: c.time, value: cumVol > 0 ? cumPV / cumVol : null };
  });
}
