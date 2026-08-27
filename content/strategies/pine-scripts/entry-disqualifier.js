// Pine Script provided by the user for this journal's Trading Strategies
// section — not sourced from a published/copyrighted TradingView script.
export const pineScript = `//@version=5
indicator("Entry Disqualifier — Noise Filter", shorttitle = "Disqualifier", overlay = true, max_labels_count=500)

// =============================================================================
// PHILOSOPHY: this tool does not tell you when to buy. It tells you the
// specific reasons NOT to — a "no red flags" reading means the noise has
// been filtered out, not that a trade is guaranteed to work. You still need
// your own thesis, position sizing, and stop-loss on top of this.
// =============================================================================

// ---- Inputs ----
benchmarkSymbol   = input.symbol("SPY", "Market Regime Benchmark")
maLength          = input.int(150, "Stage MA Length (≈30-week)", minval = 10)
maSlopeLookback   = input.int(10, "MA Slope Lookback (bars)")
rsLength          = input.int(50, "Relative Strength MA Length")
extensionPct      = input.float(20.0, "Max % Above Stage MA Before 'Extended'", minval = 5)
adxLength         = input.int(14, "ADX Length (trend strength / chop filter)")
adxThreshold      = input.float(20.0, "Below this ADX = choppy / no real trend")
volAvgLength      = input.int(50, "Volume Average Length")
dryUpMultiplier   = input.float(0.7, "Volume Below this x Average = Drying Up")
tightLookback     = input.int(10, "Base Tightness Lookback")
tightVsWideRatio  = input.float(0.6, "Recent Range Must Be < this x Prior Range for a 'Tight' Base")

// =============================================================================
// Core building blocks (same math as the stage/trend screener)
// =============================================================================
stageMA  = ta.sma(close, maLength)
maRising = stageMA > stageMA[maSlopeLookback]
stage    = maRising and close > stageMA ? 2 : not maRising and close < stageMA ? 4 : close < stageMA ? 3 : 1

benchClose  = request.security(benchmarkSymbol, timeframe.period, close)
benchMA     = ta.sma(benchClose, maLength)
benchRising = benchMA > benchMA[maSlopeLookback]
marketStage = benchRising and benchClose > benchMA ? 2 : not benchRising and benchClose < benchMA ? 4 : benchClose < benchMA ? 3 : 1

rsLine   = close / benchClose
rsLineMA = ta.sma(rsLine, rsLength)

[diplus, diminus, adx] = ta.dmi(adxLength, adxLength)

volAvg = ta.sma(volume, volAvgLength)

recentRange = ta.highest(high, tightLookback) - ta.lowest(low, tightLookback)
priorRange  = ta.highest(high, tightLookback)[tightLookback] - ta.lowest(low, tightLookback)[tightLookback]

// =============================================================================
// Disqualifying conditions — each one is a reason to SKIP, not a reason to buy
// =============================================================================
flagWrongStage  = stage != 2
flagMarketWeak  = marketStage != 2                                   // fighting the broad market
flagWeakRS      = rsLine < rsLineMA                                  // underperforming the benchmark
flagExtended    = close > stageMA * (1 + extensionPct / 100)         // chasing, too far from trend
flagChoppy      = adx < adxThreshold                                  // no real trend to speak of
flagVolumeDry   = volume < volAvg * dryUpMultiplier                   // low conviction / interest
flagWideBase    = priorRange > 0 and recentRange >= priorRange * tightVsWideRatio  // not tightening up

flagCount = (flagWrongStage ? 1 : 0) + (flagMarketWeak ? 1 : 0) + (flagWeakRS ? 1 : 0) +
            (flagExtended ? 1 : 0) + (flagChoppy ? 1 : 0) + (flagVolumeDry ? 1 : 0) + (flagWideBase ? 1 : 0)

noiseFree = flagCount == 0

// =============================================================================
// Plots — deliberately understated. A clean reading is "nothing disqualifies
// this right now," not "buy." No triangle-up "signal" is plotted on purpose.
// =============================================================================
plot(stageMA, "Stage MA", color = maRising ? color.new(color.green, 0) : color.new(color.red, 0), linewidth = 2)
bgcolor(noiseFree ? color.new(color.green, 94) : na, title = "No disqualifiers present")

// A small, quiet dot rather than a bold buy arrow — a reminder this is a
// filter reading, not a trade recommendation.
plotchar(noiseFree, title = "Noise-free bar", char = "·", location = location.belowbar,
     color = color.new(color.green, 0), size = size.tiny)

// =============================================================================
// Checklist table of disqualifiers
// =============================================================================
var table t = table.new(position.top_right, 2, 9, border_width = 1)

redFlagBg(cond) => cond ? color.new(color.red, 65) : color.new(color.green, 80)

if barstate.islast
    table.cell(t, 0, 0, "Disqualifiers", text_color = color.white, bgcolor = color.gray)
    table.cell(t, 1, 0, str.tostring(flagCount) + " active", text_color = color.white, bgcolor = color.gray)

    table.cell(t, 0, 1, "Wrong stage (not Stage 2)", bgcolor = redFlagBg(flagWrongStage))
    table.cell(t, 1, 1, flagWrongStage ? "SKIP" : "clear")

    table.cell(t, 0, 2, "Market (" + benchmarkSymbol + ") not Stage 2", bgcolor = redFlagBg(flagMarketWeak))
    table.cell(t, 1, 2, flagMarketWeak ? "SKIP" : "clear")

    table.cell(t, 0, 3, "Underperforming benchmark", bgcolor = redFlagBg(flagWeakRS))
    table.cell(t, 1, 3, flagWeakRS ? "SKIP" : "clear")

    table.cell(t, 0, 4, "Extended (chasing)", bgcolor = redFlagBg(flagExtended))
    table.cell(t, 1, 4, flagExtended ? "SKIP" : "clear")

    table.cell(t, 0, 5, "Choppy / no real trend (ADX)", bgcolor = redFlagBg(flagChoppy))
    table.cell(t, 1, 5, flagChoppy ? "SKIP" : "clear")

    table.cell(t, 0, 6, "Volume drying up", bgcolor = redFlagBg(flagVolumeDry))
    table.cell(t, 1, 6, flagVolumeDry ? "SKIP" : "clear")

    table.cell(t, 0, 7, "Base not tightening", bgcolor = redFlagBg(flagWideBase))
    table.cell(t, 1, 7, flagWideBase ? "SKIP" : "clear")

    table.cell(t, 0, 8, "Reading", bgcolor = color.gray, text_color = color.white)
    table.cell(t, 1, 8, noiseFree ? "No disqualifiers" : str.tostring(flagCount) + " reason(s) to skip")

alertcondition(flagCount == 0, title = "No Disqualifiers", message = "No filter reasons to skip right now — still verify thesis, size, and stop manually.")
alertcondition(flagWrongStage or flagMarketWeak, title = "Major Disqualifier", message = "Wrong stage or weak market regime — sit this one out.")`;

export const license = {
  author: 'Provided by the user',
  name: 'Original — written for this journal',
  url: null,
};
