// Original Pine Script v5 strategy, written for this journal — not a
// reproduction of any published/copyrighted script. It operationalizes
// Stan Weinstein's Stage Analysis (see the book write-up in this app's
// Books section) into mechanical, backtestable rules: a rising 30-week
// moving average, a resistance breakout on expanding volume for entry,
// and a close back below the 30-week average for the exit.
export const pineScript = `//@version=5
strategy("Stage Analysis Breakout Strategy", shorttitle = "StageBreakout", overlay = true,
     initial_capital = 10000,
     commission_type = strategy.commission.percent, commission_value = 0.05)

// =============================================================================
// Inputs
// =============================================================================
maLength         = input.int(150, "Stage MA Length (≈30-week)", minval = 10)
maSlopeLookback  = input.int(10, "MA Slope Lookback (bars)", minval = 1)
breakoutLookback = input.int(20, "Breakout Lookback (resistance)", minval = 5)
volAvgLength     = input.int(50, "Volume Average Length", minval = 5)
volMultiplier    = input.float(1.5, "Volume Expansion Multiplier", minval = 1.0, step = 0.1)
stopLookback     = input.int(20, "Stop: Base Low Lookback", minval = 5)
riskPercent      = input.float(1.0, "Risk Per Trade (% of equity)", minval = 0.1, step = 0.1)

// =============================================================================
// Stage filter — the 30-week (≈150-day) moving average and its slope
// =============================================================================
stageMA    = ta.sma(close, maLength)
maRising   = stageMA > stageMA[maSlopeLookback]

resistance      = ta.highest(high, breakoutLookback)[1]
volAvg          = ta.sma(volume, volAvgLength)
volumeConfirmed = volume > volAvg * volMultiplier

// Stage 2 breakout: closes above resistance AND above a rising 30-week MA,
// confirmed by a volume expansion — Weinstein's "don't buy the base, buy
// the breakout" rule, made mechanical.
stage2Breakout = close > resistance and close > stageMA and maRising and volumeConfirmed

// Stage 3/4 signal: the trend filter itself breaks — this is the "take the
// oath" rule, i.e. don't stay in a stock once it's lost the 30-week trend.
stageBreakdown = close < stageMA

// =============================================================================
// Risk-based position sizing — size is derived from the stop distance, not
// picked by feel, matching this journal's own risk ÷ stop-distance rule.
// =============================================================================
baseLow = ta.lowest(low, stopLookback)

var float entryStop = na

if stage2Breakout and strategy.position_size == 0
    riskPerShare = close - baseLow
    if riskPerShare > 0
        qty = math.floor((strategy.equity * (riskPercent / 100)) / riskPerShare)
        if qty > 0
            strategy.entry("Stage 2 Long", strategy.long, qty = qty)
            entryStop := baseLow

if strategy.position_size > 0
    strategy.exit("Stop", "Stage 2 Long", stop = entryStop)

if stageBreakdown and strategy.position_size > 0
    strategy.close("Stage 2 Long", comment = "Stage 3/4 breakdown")

// =============================================================================
// Plots
// =============================================================================
plot(stageMA, "30-week MA", color = maRising ? color.new(color.green, 0) : color.new(color.red, 0), linewidth = 2)
plot(resistance, "Resistance", color = color.new(color.gray, 50), style = plot.style_stepline)

plotshape(stage2Breakout, title = "Stage 2 Breakout", location = location.belowbar,
     style = shape.triangleup, color = color.new(color.green, 0), size = size.small)
plotshape(stageBreakdown and strategy.position_size[1] > 0, title = "Stage 3/4 Exit",
     location = location.abovebar, style = shape.triangledown, color = color.new(color.red, 0), size = size.small)

alertcondition(stage2Breakout, title = "Stage 2 Breakout", message = "Stage 2 breakout detected")
alertcondition(stageBreakdown, title = "Stage 3/4 Breakdown", message = "Closed back below the 30-week MA")
`;

export const license = {
  author: "Written for this journal",
  name: "Original — adapted from Stan Weinstein's publicly described Stage Analysis method",
  url: null,
};
