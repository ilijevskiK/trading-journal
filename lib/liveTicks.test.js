import { describe, it, expect } from "vitest";
import { applyLiveTick } from "./liveTicks";

function dailyCandle(date, close) {
  return { time: date, open: close, high: close, low: close, close, volume: 100 };
}

describe("applyLiveTick", () => {
  it("returns the candles untouched when there's no tick yet", () => {
    const candles = [dailyCandle("2026-08-17", 100)];
    expect(applyLiveTick(candles, null)).toBe(candles);
  });

  it("returns an empty/missing candle series untouched", () => {
    expect(applyLiveTick([], { price: 10, timestamp: Date.now() })).toEqual([]);
    expect(applyLiveTick(null, { price: 10, timestamp: Date.now() })).toBeNull();
  });

  it("nudges the last candle in place when the tick is from the same trading day", () => {
    const candles = [dailyCandle("2026-08-16", 90), dailyCandle("2026-08-17", 100)];
    const tick = { price: 105, timestamp: new Date("2026-08-17T15:00:00Z").getTime() };
    const result = applyLiveTick(candles, tick);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(candles[0]); // untouched
    expect(result[1].close).toBe(105);
    expect(result[1].high).toBe(105);
    expect(result[1].time).toBe("2026-08-17");
  });

  it("does not mutate the original candles array", () => {
    const candles = [dailyCandle("2026-08-17", 100)];
    const tick = { price: 110, timestamp: new Date("2026-08-17T15:00:00Z").getTime() };
    applyLiveTick(candles, tick);
    expect(candles[0].close).toBe(100);
  });

  it("starts a new candle for a later trading day instead of overwriting yesterday's", () => {
    // The classic bug this guards against: market's open today, the daily
    // feed hasn't posted today's bar yet, so the last known candle is
    // yesterday's already-finalized one.
    const candles = [dailyCandle("2026-08-17", 100)];
    const tick = { price: 103, timestamp: new Date("2026-08-18T09:30:00Z").getTime() };
    const result = applyLiveTick(candles, tick);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(candles[0]); // yesterday's candle is untouched
    expect(result[1]).toEqual({
      time: "2026-08-18",
      open: 103,
      high: 103,
      low: 103,
      close: 103,
      volume: 0,
    });
  });

  it("ignores a stale tick timestamped before the last known bar", () => {
    const candles = [dailyCandle("2026-08-17", 100)];
    const tick = { price: 999, timestamp: new Date("2026-08-16T15:00:00Z").getTime() };
    const result = applyLiveTick(candles, tick);
    expect(result).toBe(candles);
  });

  it("handles intraday (numeric-timestamp) candles the same way", () => {
    const sameDayTime = Math.floor(new Date("2026-08-17T14:00:00Z").getTime() / 1000);
    const candles = [{ time: sameDayTime, open: 100, high: 101, low: 99, close: 100, volume: 50 }];

    const sameDayTick = { price: 102, timestamp: new Date("2026-08-17T15:00:00Z").getTime() };
    const nudged = applyLiveTick(candles, sameDayTick);
    expect(nudged).toHaveLength(1);
    expect(nudged[0].close).toBe(102);

    const nextDayTick = { price: 105, timestamp: new Date("2026-08-18T09:30:00Z").getTime() };
    const appended = applyLiveTick(candles, nextDayTick);
    expect(appended).toHaveLength(2);
    expect(appended[0]).toEqual(candles[0]);
    expect(appended[1].close).toBe(105);
  });
});
