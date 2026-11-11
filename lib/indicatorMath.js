// Shared math helpers + per-indicator calculations, ported from the real
// published Pine Script for each indicator (see
// content/indicators/pine-scripts/*.js for the source). These are
// simplified, client-side re-implementations for the fullscreen chart
// toggles — not a Pine Script interpreter.

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
