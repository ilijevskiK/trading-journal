import { describe, it, expect } from "vitest";
import {
  analyzeIndex,
  overallMarketState,
  describeIndex,
  completedSessions,
  STATES,
} from "./marketStatus";

describe("completedSessions", () => {
  const candles = [{ time: "2026-11-09" }, { time: "2026-11-10" }];

  it("drops today's bar while the New York session is still open", () => {
    // 15:00 in New York (EST, UTC-5) on 2026-11-10.
    expect(completedSessions(candles, new Date("2026-11-10T20:00:00Z"))).toHaveLength(1);
  });

  it("keeps today's bar after the 4pm close", () => {
    expect(completedSessions(candles, new Date("2026-11-10T21:30:00Z"))).toHaveLength(2);
  });

  it("keeps everything when the last bar is from an earlier day", () => {
    expect(completedSessions(candles, new Date("2026-11-11T15:00:00Z"))).toHaveLength(2);
  });
});

// Builds candles from a list of [close, volume] steps appended to a long,
// quiet uptrend, so the 50- and 200-day averages exist and sit below price.
function series(steps = [], { bars = 250, start = 100, step = 0.2, volume = 1000 } = {}) {
  const rows = [];
  for (let i = 0; i < bars; i++) rows.push([start + i * step, volume]);
  rows.push(...steps);
  return rows.map(([close, vol, range], i) => ({
    time: `d-${String(i).padStart(4, "0")}`,
    open: close,
    high: range?.high ?? close + 0.5,
    low: range?.low ?? close - 0.5,
    close,
    volume: vol,
  }));
}

function lastClose(rows) {
  return rows.length ? rows[rows.length - 1][0] : 100 + 249 * 0.2;
}

// Alternating "down 0.3% on higher volume" / "up 0.35% on lower volume"
// days — each down day is a distribution day, but price barely moves.
function distributionSteps(count, from) {
  const steps = [];
  let close = from;
  for (let i = 0; i < count; i++) {
    close *= 0.997;
    steps.push([close, 1500]);
    close *= 1.0035;
    steps.push([close, 900]);
  }
  return steps;
}

describe("analyzeIndex", () => {
  it("returns null without enough history for the 200-day average", () => {
    expect(analyzeIndex(series([], { bars: 100 }))).toBeNull();
  });

  it("reads a quiet, rising market as a confirmed uptrend with no distribution", () => {
    const a = analyzeIndex(series());
    expect(a.state).toBe(STATES.uptrend);
    expect(a.distributionDays).toHaveLength(0);
    expect(a.pctVsMa50).toBeGreaterThan(0);
    expect(a.ma50Rising).toBe(true);
  });

  it("counts distribution days and flags pressure at five", () => {
    const four = analyzeIndex(series(distributionSteps(4, lastClose([]))));
    expect(four.distributionDays).toHaveLength(4);
    expect(four.state).toBe(STATES.uptrend);

    const five = analyzeIndex(series(distributionSteps(5, lastClose([]))));
    expect(five.distributionDays).toHaveLength(5);
    expect(five.state).toBe(STATES.pressure);
  });

  it("counts a stalling day: tiny gain on higher volume, closing weak near the high", () => {
    const close = lastClose([]) * 1.001;
    const a = analyzeIndex(series([[close, 1500, { high: close + 2, low: close - 0.3 }]]));
    expect(a.distributionDays).toHaveLength(1);
    expect(a.distributionDays[0].type).toBe("stalling");
  });

  it("doesn't call a strong close a stall", () => {
    const close = lastClose([]) * 1.001;
    const a = analyzeIndex(series([[close, 1500, { high: close + 0.1, low: close - 2 }]]));
    expect(a.distributionDays).toHaveLength(0);
  });

  it("records the state after every session", () => {
    const rows = series();
    const a = analyzeIndex(rows);
    expect(a.history).toHaveLength(rows.length - 200);
    expect(a.history[a.history.length - 1]).toEqual({ time: rows[rows.length - 1].time, state: STATES.uptrend });
  });

  it("drops a distribution day once the index closes 5% above it", () => {
    let close = lastClose([]) * 0.997;
    const steps = [[close, 1500]];
    for (let i = 0; i < 6; i++) {
      close *= 1.01;
      steps.push([close, 900]);
    }
    const a = analyzeIndex(series(steps));
    expect(a.distributionDays).toHaveLength(0);
  });

  it("drops distribution days older than 25 sessions", () => {
    const steps = distributionSteps(3, lastClose([]));
    let close = steps[steps.length - 1][0];
    for (let i = 0; i < 26; i++) {
      close *= 1.001;
      steps.push([close, 900]);
    }
    expect(analyzeIndex(series(steps)).distributionDays).toHaveLength(0);
  });

  describe("corrections and follow-through days", () => {
    // A 12% slide from the uptrend's high puts the index in correction.
    function slide() {
      let close = lastClose([]);
      const steps = [];
      for (let i = 0; i < 6; i++) {
        close *= 0.978;
        steps.push([close, 1000]);
      }
      return steps;
    }

    it("enters a correction after an 8%+ drop from the high", () => {
      const a = analyzeIndex(series(slide()));
      expect(a.state).toBe(STATES.correction);
      expect(a.distributionDays).toHaveLength(0);
    });

    it("confirms a new uptrend on a day-4 follow-through", () => {
      const steps = slide();
      let close = steps[steps.length - 1][0];
      close *= 1.004; // day 1
      steps.push([close, 900]);
      close *= 1.003; // day 2
      steps.push([close, 900]);
      close *= 1.002; // day 3
      steps.push([close, 900]);
      close *= 1.015; // day 4: +1.5% on higher volume
      steps.push([close, 1400]);
      const rows = series(steps);
      const a = analyzeIndex(rows);
      expect(a.state).not.toBe(STATES.correction);
      expect(a.lastFollowThrough).toBe(rows[rows.length - 1].time);
    });

    it("fails the follow-through when the rally's low is undercut", () => {
      const steps = slide();
      const slideLow = steps[steps.length - 1][0] - 0.5;
      let close = steps[steps.length - 1][0];
      for (const [mult, vol] of [[1.004, 900], [1.003, 900], [1.002, 900], [1.015, 1400]]) {
        close *= mult;
        steps.push([close, vol]);
      }
      steps.push([slideLow * 0.98, 900]);
      const a = analyzeIndex(series(steps));
      expect(a.state).toBe(STATES.correction);
      expect(a.lastFollowThroughFailed).toBe(true);
      expect(a.failedFollowThroughDates).toEqual([a.lastFollowThrough]);
    });

    it("doesn't count a big gain before day 4, and reports the rally day", () => {
      const steps = slide();
      let close = steps[steps.length - 1][0];
      close *= 1.004; // day 1
      steps.push([close, 900]);
      close *= 1.02; // day 2: big, but too early
      steps.push([close, 1400]);
      const a = analyzeIndex(series(steps));
      expect(a.state).toBe(STATES.correction);
      expect(a.rallyAttempt.day).toBe(2);
    });

    it("restarts the rally attempt when the low is undercut", () => {
      const steps = slide();
      let close = steps[steps.length - 1][0];
      close *= 1.004; // day 1
      steps.push([close, 900]);
      close *= 0.97; // undercuts the low: back to no rally attempt
      steps.push([close, 900]);
      const a = analyzeIndex(series(steps));
      expect(a.state).toBe(STATES.correction);
      expect(a.rallyAttempt).toBeNull();
    });
  });
});

describe("overallMarketState", () => {
  const up = { state: STATES.uptrend };
  const pressure = { state: STATES.pressure };
  const correction = { state: STATES.correction };

  it("is a correction only when both deciding indexes are", () => {
    expect(overallMarketState(correction, correction)).toBe(STATES.correction);
  });

  it("is confirmed when one has followed through and the other is still correcting", () => {
    expect(overallMarketState(up, correction)).toBe(STATES.uptrend);
    expect(overallMarketState(up, up)).toBe(STATES.uptrend);
  });

  it("is under pressure when either one is", () => {
    expect(overallMarketState(pressure, up)).toBe(STATES.pressure);
    expect(overallMarketState(correction, pressure)).toBe(STATES.pressure);
  });

  it("returns null while data is missing", () => {
    expect(overallMarketState(null, up)).toBeNull();
  });
});

describe("describeIndex", () => {
  it("explains the distribution count and the 50-day position", () => {
    const text = describeIndex("Nasdaq", analyzeIndex(series(distributionSteps(4, lastClose([])))));
    expect(text).toContain("Nasdaq: 4 distribution days (1 more puts it under pressure)");
    expect(text).toContain("above its 50-day");
  });
});
