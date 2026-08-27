// Simplified re-implementation of LuxAlgo's Smart Money Concepts swing
// structure (BOS/CHoCH) and order blocks, ported from the real published
// script (content/indicators/pine-scripts/smart-money-concepts.js).
//
// Scope, by design (see the chart's Indicators toggle): swing-level
// structure only (the script's "length 50" mode) — no internal/finer
// structure, fair value gaps, equal highs/lows, or premium/discount zones.

const SWING_LENGTH = 50;
const ATR_PERIOD = 200;
const MAX_BOXES_PER_SIDE = 2;

function computeAtr(candles, period) {
  const n = candles.length;
  const atr = new Array(n).fill(null);
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
  let sum = 0;
  for (let i = 0; i < n; i++) {
    if (i < period) {
      sum += trs[i];
      if (i === period - 1) atr[i] = sum / period;
    } else {
      atr[i] = (atr[i - 1] * (period - 1) + trs[i]) / period;
    }
  }
  return atr;
}

// Mirrors the script's `ob_coord`: scans strictly between the swing pivot
// bar and the breakout bar for the single candle that becomes the order
// block (the last down-candle before a bullish break, or the last
// up-candle before a bearish break), filtered to candles whose range is
// under 2x ATR.
function findOrderBlock(candles, atr, loc, breakoutIndex, useMax) {
  let min = Infinity;
  let max = -Infinity;
  let idx = -1;
  for (let k = breakoutIndex - 1; k > loc; k--) {
    const threshold = atr[k];
    if (threshold == null) continue;
    if (candles[k].high - candles[k].low >= threshold * 2) continue;
    if (useMax) {
      if (candles[k].high > max) {
        max = candles[k].high;
        min = candles[k].low;
        idx = k;
      }
    } else if (candles[k].low < min) {
      min = candles[k].low;
      max = candles[k].high;
      idx = k;
    }
  }
  if (idx === -1) return null;
  return { top: max, bottom: min, left: candles[idx].time };
}

// Returns { breaks: [{ time, price, type: 'bull'|'bear', kind: 'BOS'|'CHoCH' }],
//           orderBlocks: [{ type, top, bottom, left, right }] } — up to
// MAX_BOXES_PER_SIDE most recent order blocks per side.
export function computeSmcStructure(candles) {
  const n = candles.length;
  const breaks = [];
  const finishedBoxes = [];
  if (n < SWING_LENGTH * 2 + 2) return { breaks: [], orderBlocks: [] };

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const atr = computeAtr(candles, ATR_PERIOD);
  const lastTime = candles[n - 1].time;

  let os = 0;
  let trend = 0;
  let topY = null;
  let topX = null;
  let topCross = false;
  let btmY = null;
  let btmX = null;
  let btmCross = false;

  const activeBull = [];
  const activeBear = [];

  function pruneMitigated(list, isBull, closePrice, time) {
    for (let k = list.length - 1; k >= 0; k--) {
      const ob = list[k];
      const broken = isBull ? closePrice < ob.bottom : closePrice > ob.top;
      if (broken) {
        finishedBoxes.push({ ...ob, right: time });
        list.splice(k, 1);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (i >= SWING_LENGTH) {
      let upper = -Infinity;
      let lower = Infinity;
      for (let k = i - SWING_LENGTH + 1; k <= i; k++) {
        if (highs[k] > upper) upper = highs[k];
        if (lows[k] < lower) lower = lows[k];
      }
      const highLen = highs[i - SWING_LENGTH];
      const lowLen = lows[i - SWING_LENGTH];
      const prevOs = os;
      os = highLen > upper ? 0 : lowLen < lower ? 1 : prevOs;

      if (os === 0 && prevOs !== 0) {
        topY = highLen;
        topX = i - SWING_LENGTH;
        topCross = true;
      }
      if (os === 1 && prevOs !== 1) {
        btmY = lowLen;
        btmX = i - SWING_LENGTH;
        btmCross = true;
      }
    }

    if (i > 0) {
      const prevClose = candles[i - 1].close;
      const close = candles[i].close;

      if (topCross && topY != null && prevClose <= topY && close > topY) {
        breaks.push({ time: candles[i].time, price: topY, type: "bull", kind: trend < 0 ? "CHoCH" : "BOS" });
        trend = 1;
        topCross = false;
        const found = findOrderBlock(candles, atr, topX, i, false);
        if (found) activeBull.unshift({ type: "bull", ...found, right: lastTime });
      }

      if (btmCross && btmY != null && prevClose >= btmY && close < btmY) {
        breaks.push({ time: candles[i].time, price: btmY, type: "bear", kind: trend > 0 ? "CHoCH" : "BOS" });
        trend = -1;
        btmCross = false;
        const found = findOrderBlock(candles, atr, btmX, i, true);
        if (found) activeBear.unshift({ type: "bear", ...found, right: lastTime });
      }
    }

    pruneMitigated(activeBull, true, candles[i].close, candles[i].time);
    pruneMitigated(activeBear, false, candles[i].close, candles[i].time);
  }

  const allBoxes = [...finishedBoxes, ...activeBull, ...activeBear].sort((a, b) =>
    a.left < b.left ? -1 : a.left > b.left ? 1 : 0
  );
  const bullBoxes = allBoxes.filter((b) => b.type === "bull").slice(-MAX_BOXES_PER_SIDE);
  const bearBoxes = allBoxes.filter((b) => b.type === "bear").slice(-MAX_BOXES_PER_SIDE);

  return { breaks, orderBlocks: [...bullBoxes, ...bearBoxes] };
}
