"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers,
  ColorType,
  LineStyle,
} from "lightweight-charts";
import {
  sma,
  computeWaveTrend,
  computeBollingerBands,
  computeRSI,
} from "@/lib/indicatorMath";
import { computeSmcStructure } from "@/lib/smc";
import { OrderBlockPrimitive } from "@/lib/orderBlockPrimitive";

const COLORS = {
  bg: "#1B1F27", // surface
  grid: "#2C313F", // line
  text: "#9AA0AC", // parchment-dim
  gain: "#4FAF8B",
  gainBright: "#6FCBA6",
  loss: "#C1573F",
  lossBright: "#DB6E54",
  gold: "#C9A24B",
  parchmentFaint: "#6B7180",
};

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Same green/red as the candles' own up/down coloring, just at 50% opacity
// so a WaveTrend-cross bar reads as "highlighted" rather than a different
// color scheme fighting the base candle palette.
const WT_CROSS_CANDLE_GAIN_COLOR = hexToRgba(COLORS.gain, 0.5);
const WT_CROSS_CANDLE_LOSS_COLOR = hexToRgba(COLORS.loss, 0.5);

const ZOOM_IN_FACTOR = 0.7;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

const WAVETREND_PANE = 1;
const RSI_PANE = 2;

// Toggleable EMA overlays, offered only where enableIndicators is set
// (the fullscreen view). Colors are chosen to stay distinguishable from
// each other and from the candles/entry-exit markers on a dark background.
export const EMA_DEFINITIONS = [
  { key: "ema5", period: 5, label: "EMA 5", color: "#5AC8FA" },
  { key: "ema10", period: 10, label: "EMA 10", color: "#FF9F43" },
  { key: "ema30", period: 30, label: "EMA 30", color: "#C9A24B" },
  { key: "ema50", period: 50, label: "EMA 50", color: "#A78BFA" },
  { key: "ema200", period: 200, label: "EMA 200", color: "#F472B6" },
];

// Indicators built from the real Pine Script published for each one (see
// content/indicators/pine-scripts/*.js) — simplified client-side
// re-implementations, not a Pine interpreter. Dot colors here are just for
// the toggle pill; actual on-chart colors are set where each is drawn.
export const INDICATOR_DEFINITIONS = [
  { key: "waveTrend", label: "WaveTrend", color: "#38BDF8" },
  { key: "smc", label: "SMC", fullLabel: "Smart Money Concepts", color: "#A78BFA" },
  { key: "bollingerBands", label: "Bollinger Bands", color: "#60A5FA" },
  { key: "rsi", label: "RSI", color: "#FACC15" },
];

const SMC_BULL_OB_COLOR = "#3179f5"; // matches the original LuxAlgo bullish OB color
const SMC_BEAR_OB_COLOR = "#f77c80"; // matches the original LuxAlgo bearish OB color
const SMC_BULL_OB_FILL = "rgba(49, 121, 245, 0.35)";
const SMC_BEAR_OB_FILL = "rgba(247, 124, 128, 0.35)";
const SMC_BULL_BREAK_COLOR = "#089981";
const SMC_BEAR_BREAK_COLOR = "#f23645";

const NO_SMA_LINES = [];
const NO_EXTRA_MARKERS = [];
const NO_STATUS_BAND = [];
const NO_PRICE_LINES = [];

function computeSMA(candles, period) {
  const values = sma(candles.map((c) => c.close), period);
  return candles
    .map((c, i) => ({ time: c.time, value: values[i] }))
    .filter((p) => p.value != null);
}

// Standard EMA, seeded with a plain SMA of the first `period` closes so the
// line doesn't start skewed by treating the very first bar as the seed.
function computeEMA(candles, period) {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  let prev = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
  const result = [{ time: candles[period - 1].time, value: prev }];
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    result.push({ time: candles[i].time, value: prev });
  }
  return result;
}

function flatLine(candles, value) {
  return candles.map((c) => ({ time: c.time, value }));
}

// Trade entry/exit dates are plain "YYYY-MM-DD" strings, but intraday
// candles (1H/4H) use numeric UTC-timestamp bars — there's rarely a bar at
// exactly midnight for a given date, so a marker set to the raw date string
// wouldn't line up with any bar and lightweight-charts would just drop it.
// This snaps to the first candle on-or-after that date instead.
function timeToDateStr(t) {
  return typeof t === "number" ? new Date(t * 1000).toISOString().slice(0, 10) : t;
}

function findMarkerTime(candles, dateStr) {
  const match = candles.find((c) => timeToDateStr(c.time) >= dateStr);
  return match ? match.time : candles[candles.length - 1]?.time;
}

function findBarIndexOnOrAfter(candles, dateStr) {
  const idx = candles.findIndex((c) => timeToDateStr(c.time) >= dateStr);
  return idx === -1 ? candles.length - 1 : idx;
}

// Bounds on the chart's initial view — independent of how many bars a
// given timeframe/lookback actually fetched (1H/4H can pull in years of
// history), so switching timeframes always lands on a default view with
// bars large enough to actually read, instead of `fitContent()` cramming
// every fetched bar (sometimes thousands, for intraday) into view.
const DEFAULT_VIEW_MAX_BARS = 180;
const DEFAULT_VIEW_EDGE_PAD_BARS = 15;

// Renders a candlestick chart for a trade. Presentational only — data
// fetching lives in useTradeCandles/TradeChart. Mounting two instances of
// this (e.g. one inline, one in a fullscreen modal) is fine; each owns its
// own lightweight-charts instance and zoom state.
export default function CandlestickChart({
  trade,
  candles,
  height = 280,
  aspectRatio,
  fillHeight = false,
  onExpand,
  alwaysShowControls = false,
  enableIndicators = false,
  activeEmas: activeEmasProp,
  onToggleEma,
  activeIndicators: activeIndicatorsProp,
  onToggleIndicator,
  hideToggleOverlay = false,
  // Always-on simple moving averages ([{ period, color }]) and extra
  // markers merged with the trade's own. smaLines is read once at mount.
  smaLines = NO_SMA_LINES,
  extraMarkers = NO_EXTRA_MARKERS,
  // [{ time, color }] drawn as a thin strip along the bottom of the price
  // pane, aligned with the candles (e.g. market status over time).
  statusBand = NO_STATUS_BAND,
  // Extra horizontal levels: [{ price, color, title, dashed }].
  extraPriceLines = NO_PRICE_LINES,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markersRef = useRef(null);
  const candlesRef = useRef(candles);
  const emaSeriesRef = useRef({});
  const smaSeriesRef = useRef([]);
  const statusBandSeriesRef = useRef(null);
  const waveTrendSeriesRef = useRef({});
  const waveTrendMarkersRef = useRef(null);
  const waveTrendCrossesRef = useRef([]);
  const waveTrendCrossColorByTimeRef = useRef(new Map());
  const bollingerSeriesRef = useRef({});
  const rsiSeriesRef = useRef({});
  const orderBlockPrimitiveRef = useRef(null);
  const smcStructureRef = useRef({ breaks: [], orderBlocks: [] });
  const hasFitInitialContentRef = useRef(false);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [uncontrolledActiveEmas, setUncontrolledActiveEmas] = useState({});
  const [uncontrolledActiveIndicators, setUncontrolledActiveIndicators] = useState({});
  const activeEmas = activeEmasProp || uncontrolledActiveEmas;
  const activeIndicators = activeIndicatorsProp || uncontrolledActiveIndicators;

  useEffect(() => {
    if (!containerRef.current) return;

    // Deliberately not using autoSize here: its built-in ResizeObserver
    // fights with manual pane.setStretchFactor() calls (used below for the
    // WaveTrend/RSI oscillator panes), silently resetting them back to
    // their auto-computed proportions. Sizing is instead handled by the
    // ResizeObserver set up further down, which only reacts to actual
    // container size changes.
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      // clientHeight already reflects an aspect-ratio-driven container by
      // the time this effect runs; fall back to the height prop for a
      // fixed-height container (clientHeight would be identical there anyway).
      height: containerRef.current.clientHeight || height,
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        fontFamily: "var(--font-mono), monospace",
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      rightPriceScale: { borderColor: COLORS.grid },
      timeScale: { borderColor: COLORS.grid },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.gain,
      downColor: COLORS.loss,
      borderVisible: false,
      wickUpColor: COLORS.gain,
      wickDownColor: COLORS.loss,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series, []);

    smaSeriesRef.current = smaLines.map((def) =>
      chart.addSeries(LineSeries, {
        color: def.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
    );

    statusBandSeriesRef.current = chart.addSeries(HistogramSeries, {
      priceScaleId: "status-band",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale("status-band").applyOptions({ scaleMargins: { top: 0.96, bottom: 0 } });

    emaSeriesRef.current = {};
    EMA_DEFINITIONS.forEach((def) => {
      emaSeriesRef.current[def.key] = chart.addSeries(LineSeries, {
        color: def.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: false,
      });
    });

    if (enableIndicators) {
      // WaveTrend — its own oscillator pane below price.
      const wtOpts = (color, dashed = false) => ({
        color,
        lineWidth: 1,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: false,
      });
      waveTrendSeriesRef.current = {
        zero: chart.addSeries(LineSeries, wtOpts(COLORS.parchmentFaint), WAVETREND_PANE),
        overbought: chart.addSeries(LineSeries, wtOpts(COLORS.lossBright, true), WAVETREND_PANE),
        oversold: chart.addSeries(LineSeries, wtOpts(COLORS.gainBright, true), WAVETREND_PANE),
        wt1: chart.addSeries(LineSeries, wtOpts(COLORS.gain), WAVETREND_PANE),
        wt2: chart.addSeries(LineSeries, wtOpts(COLORS.lossBright, true), WAVETREND_PANE),
      };
      // Marks every WT1/WT2 crossover directly on the WaveTrend pane (green
      // for a bullish cross, red for a bearish one) — the same "circles at
      // the cross" idea community WaveTrend forks add, without adopting a
      // whole separate indicator or its unfiltered (non-OB/OS-gated) signal.
      waveTrendMarkersRef.current = createSeriesMarkers(waveTrendSeriesRef.current.wt1, []);

      // Smart Money Concepts — order blocks drawn as filled rectangles via
      // a custom pane primitive (a plain line series can't fill a region
      // between two arbitrary price levels).
      orderBlockPrimitiveRef.current = new OrderBlockPrimitive();
      series.attachPrimitive(orderBlockPrimitiveRef.current);

      // Bollinger Bands — a plain main-pane overlay, same treatment as the
      // EMA lines above (upper/lower band + a neutral basis/midline).
      const bandOpts = (color, dashed = false) => ({
        color,
        lineWidth: 1,
        lineStyle: dashed ? LineStyle.Dotted : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: false,
      });
      bollingerSeriesRef.current = {
        upper: chart.addSeries(LineSeries, bandOpts("#60A5FA")),
        basis: chart.addSeries(LineSeries, bandOpts(COLORS.parchmentFaint, true)),
        lower: chart.addSeries(LineSeries, bandOpts("#60A5FA")),
      };

      // RSI — its own oscillator pane, same shape as WaveTrend above
      // (reference lines + the indicator line itself).
      const rsiOpts = (color, dashed = false) => ({
        color,
        lineWidth: 1,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: false,
      });
      rsiSeriesRef.current = {
        overbought: chart.addSeries(LineSeries, rsiOpts(COLORS.lossBright, true), RSI_PANE),
        oversold: chart.addSeries(LineSeries, rsiOpts(COLORS.gainBright, true), RSI_PANE),
        mid: chart.addSeries(LineSeries, rsiOpts(COLORS.parchmentFaint, true), RSI_PANE),
        line: chart.addSeries(LineSeries, rsiOpts("#FACC15"), RSI_PANE),
      };

      chart.panes()[0]?.setStretchFactor(6);
      chart.panes()[WAVETREND_PANE]?.setStretchFactor(0.0001);
      chart.panes()[RSI_PANE]?.setStretchFactor(0.0001);
    }

    chart.subscribeCrosshairMove((param) => {
      const bar = param.time ? param.seriesData.get(series) : null;
      setHoveredBar(bar || candlesRef.current[candlesRef.current.length - 1] || null);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
      emaSeriesRef.current = {};
      smaSeriesRef.current = [];
      statusBandSeriesRef.current = null;
      waveTrendSeriesRef.current = {};
      waveTrendMarkersRef.current = null;
      waveTrendCrossColorByTimeRef.current = new Map();
      orderBlockPrimitiveRef.current = null;
      bollingerSeriesRef.current = {};
      rsiSeriesRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the crosshair handler's "no hover" fallback pointed at the latest
  // data without re-subscribing on every candle update, and default the
  // legend to the most recent bar whenever fresh data comes in.
  useEffect(() => {
    candlesRef.current = candles;
    setHoveredBar(candles[candles.length - 1] ?? null);
  }, [candles]);

  // Intraday bars carry a numeric Unix timestamp (see lib/marketData.js);
  // day/week/month bars stay a plain "YYYY-MM-DD" string with no time
  // component. Without `timeVisible`, lightweight-charts' own axis labels
  // and crosshair readout show only the date even for 1H/4H data, making
  // same-day bars indistinguishable from each other.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const isIntraday = typeof candles[0]?.time === "number";
    chart.applyOptions({ timeScale: { timeVisible: isIntraday, secondsVisible: false } });
  }, [candles]);

  // Push data/markers/price lines whenever the candles or trade plan change.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || candles.length === 0) return;

    series.setData(candles);
    series.priceLines().forEach((pl) => series.removePriceLine(pl));

    EMA_DEFINITIONS.forEach((def) => {
      emaSeriesRef.current[def.key]?.setData(computeEMA(candles, def.period));
    });
    smaSeriesRef.current.forEach((s, i) => s.setData(computeSMA(candles, smaLines[i].period)));
    statusBandSeriesRef.current?.setData(statusBand.map((b) => ({ time: b.time, value: 1, color: b.color })));

    let smcBreaks = [];
    if (enableIndicators) {
      const wt = computeWaveTrend(candles);
      const wtSeries = waveTrendSeriesRef.current;
      wtSeries.zero?.setData(flatLine(candles, 0));
      wtSeries.overbought?.setData(flatLine(candles, 60));
      wtSeries.oversold?.setData(flatLine(candles, -60));
      wtSeries.wt1?.setData(
        wt.filter((p) => p.wt1 != null).map((p) => ({ time: p.time, value: p.wt1 }))
      );
      wtSeries.wt2?.setData(
        wt.filter((p) => p.wt2 != null).map((p) => ({ time: p.time, value: p.wt2 }))
      );

      const wtCrosses = [];
      const wtCrossColorByTime = new Map();
      for (let i = 1; i < wt.length; i++) {
        const prev = wt[i - 1];
        const curr = wt[i];
        if (prev.wt1 == null || prev.wt2 == null || curr.wt1 == null || curr.wt2 == null) continue;
        const prevDiff = prev.wt1 - prev.wt2;
        const currDiff = curr.wt1 - curr.wt2;
        if (prevDiff === 0 || currDiff === 0) continue;
        if ((prevDiff < 0) !== (currDiff < 0)) {
          const bullish = currDiff > 0;
          wtCrosses.push({
            time: curr.time,
            position: "inBar",
            color: bullish ? COLORS.gainBright : COLORS.lossBright,
            shape: "circle",
          });
          wtCrossColorByTime.set(
            curr.time,
            bullish ? WT_CROSS_CANDLE_GAIN_COLOR : WT_CROSS_CANDLE_LOSS_COLOR
          );
        }
      }
      waveTrendCrossesRef.current = wtCrosses;
      waveTrendCrossColorByTimeRef.current = wtCrossColorByTime;
      updateWaveTrendCrossMarkers(activeIndicators.waveTrend);
      applyWaveTrendCandleColors(activeIndicators.waveTrend);

      const smc = computeSmcStructure(candles);
      smcBreaks = smc.breaks;
      smcStructureRef.current = smc;
      updateOrderBlockBoxes(activeIndicators.smc);

      const bb = computeBollingerBands(candles);
      bollingerSeriesRef.current.upper?.setData(
        bb.filter((p) => p.upper != null).map((p) => ({ time: p.time, value: p.upper }))
      );
      bollingerSeriesRef.current.basis?.setData(
        bb.filter((p) => p.basis != null).map((p) => ({ time: p.time, value: p.basis }))
      );
      bollingerSeriesRef.current.lower?.setData(
        bb.filter((p) => p.lower != null).map((p) => ({ time: p.time, value: p.lower }))
      );

      const rsiPoints = computeRSI(candles);
      rsiSeriesRef.current.overbought?.setData(flatLine(candles, 70));
      rsiSeriesRef.current.oversold?.setData(flatLine(candles, 30));
      rsiSeriesRef.current.mid?.setData(flatLine(candles, 50));
      rsiSeriesRef.current.line?.setData(
        rsiPoints.filter((p) => p.value != null).map((p) => ({ time: p.time, value: p.value }))
      );
    }

    const priceLine = (price, color, title, dashed = false) => {
      if (price === null || price === undefined || price === "") return;
      series.createPriceLine({
        price: Number(price),
        color,
        lineWidth: 1,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true,
        title,
      });
    };

    priceLine(trade.entryPrice, COLORS.gold, "entry");
    priceLine(trade.stopPrice, COLORS.lossBright, "stop", true);
    priceLine(trade.target1, COLORS.gainBright, "target 1", true);
    priceLine(trade.target2, COLORS.gainBright, "target 2", true);
    extraPriceLines.forEach((l) => priceLine(l.price, l.color, l.title, l.dashed));

    const tradeMarkers = [
      // Only a real logged trade has an entry — a watchlist ticker (see
      // WatchlistCard) passes a trade-shaped object with no entryPrice, so
      // it gets the same chart/toggles without a misleading "Entry" arrow.
      ...(trade.entryPrice != null && trade.entryDate
        ? [
            {
              time: findMarkerTime(candles, trade.entryDate),
              position: "belowBar",
              color: COLORS.gold,
              shape: "arrowUp",
              text: "Entry",
            },
          ]
        : []),
      ...(trade.exits || []).map((ex) => ({
        time: findMarkerTime(candles, ex.date),
        position: "aboveBar",
        color: ex.price >= trade.entryPrice ? COLORS.gainBright : COLORS.lossBright,
        shape: "arrowDown",
        text: `Exit ${ex.shares}@${ex.price}`,
      })),
    ];

    const smcMarkers = activeIndicators.smc
      ? smcBreaks.map((b) => ({
          time: b.time,
          position: b.type === "bull" ? "belowBar" : "aboveBar",
          color: b.type === "bull" ? SMC_BULL_BREAK_COLOR : SMC_BEAR_BREAK_COLOR,
          shape: b.type === "bull" ? "arrowUp" : "arrowDown",
          text: b.kind,
        }))
      : [];

    const markers = [...tradeMarkers, ...smcMarkers, ...extraMarkers].sort((a, b) =>
      a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    );

    markersRef.current?.setMarkers(markers);
    // Set the initial view only the first time this chart gets real data —
    // a live tick re-runs this effect (new `candles` reference) roughly
    // once a second, and re-applying this on every one of those would yank
    // back any zoom/pan the user just set, right when they're looking at it.
    if (!hasFitInitialContentRef.current) {
      const lastIdx = candles.length - 1;
      // A watchlist ticker's trade-shaped object has no entryDate (see the
      // tradeMarkers comment above) — default to the most recent bars
      // rather than anchoring on a trade window that doesn't exist.
      const entryIdx =
        trade.entryPrice != null && trade.entryDate
          ? findBarIndexOnOrAfter(candles, trade.entryDate)
          : Math.max(0, lastIdx - DEFAULT_VIEW_MAX_BARS);

      // Show the trade's own window (entry through the end of the fetched
      // range, which is already padded past the exit/today) when it fits
      // in a readable number of bars. For a long-held trade on a fine
      // timeframe whose own span has more bars than that, anchor on the
      // most recent bars instead — the region closest to the exit, which
      // is what "how did I do" review usually cares about most.
      const from = Math.max(entryIdx - DEFAULT_VIEW_EDGE_PAD_BARS, lastIdx - DEFAULT_VIEW_MAX_BARS);
      const to = lastIdx + DEFAULT_VIEW_EDGE_PAD_BARS;
      chart.timeScale().setVisibleLogicalRange({ from, to });
      hasFitInitialContentRef.current = true;
    }
  }, [
    candles,
    trade.entryPrice,
    trade.stopPrice,
    trade.target1,
    trade.target2,
    trade.entryDate,
    trade.exits,
    enableIndicators,
    activeIndicators.smc,
    activeIndicators.waveTrend,
    extraMarkers,
    statusBand,
    extraPriceLines,
  ]);

  // Show/hide EMA lines as the user checks/unchecks them, without touching
  // the data (already set whenever candles change above).
  useEffect(() => {
    EMA_DEFINITIONS.forEach((def) => {
      emaSeriesRef.current[def.key]?.applyOptions({ visible: !!activeEmas[def.key] });
    });
  }, [activeEmas]);

  // Show/hide the other indicators the same way, plus resize the
  // oscillator panes so they only take up space when actually toggled on.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const wtVisible = !!activeIndicators.waveTrend;
    Object.values(waveTrendSeriesRef.current).forEach((s) => s?.applyOptions({ visible: wtVisible }));
    updateWaveTrendCrossMarkers(wtVisible);
    applyWaveTrendCandleColors(wtVisible);

    const bbVisible = !!activeIndicators.bollingerBands;
    Object.values(bollingerSeriesRef.current).forEach((s) => s?.applyOptions({ visible: bbVisible }));

    const rsiVisible = !!activeIndicators.rsi;
    Object.values(rsiSeriesRef.current).forEach((s) => s?.applyOptions({ visible: rsiVisible }));

    // Setting all panes' stretch factors together in one pass, rather than
    // calling pane.setHeight() per pane: setHeight() on a later pane was
    // observed to silently reset an earlier pane's just-applied height back
    // to its old value (a "remainder gets redistributed" side effect), so
    // only the last call in a batch ever stuck.
    const panes = chart.panes();
    panes[0]?.setStretchFactor(6);
    panes[WAVETREND_PANE]?.setStretchFactor(wtVisible ? 2 : 0.0001);
    panes[RSI_PANE]?.setStretchFactor(rsiVisible ? 2 : 0.0001);

    updateOrderBlockBoxes(activeIndicators.smc);
    // SMC markers are merged into the main markers set above and react to
    // activeIndicators.smc there, since they share the candlestick series'
    // single markers primitive.
  }, [activeIndicators]);

  function updateOrderBlockBoxes(visible) {
    const primitive = orderBlockPrimitiveRef.current;
    if (!primitive) return;
    const boxes = visible
      ? smcStructureRef.current.orderBlocks.map((b) => ({
          left: b.left,
          right: b.right,
          top: b.top,
          bottom: b.bottom,
          color: b.type === "bull" ? SMC_BULL_OB_FILL : SMC_BEAR_OB_FILL,
          borderColor: b.type === "bull" ? SMC_BULL_OB_COLOR : SMC_BEAR_OB_COLOR,
        }))
      : [];
    primitive.setBoxes(boxes);
  }

  function updateWaveTrendCrossMarkers(visible) {
    waveTrendMarkersRef.current?.setMarkers(visible ? waveTrendCrossesRef.current : []);
  }

  // Re-sends the full candle series with a per-bar color/wickColor override
  // on cross bars (50%-opacity gain/loss) so the candle itself is
  // highlighted, not just the marker dot on the WaveTrend pane above it.
  // Passing the plain candles back through when toggled off clears any
  // override left over from before.
  function applyWaveTrendCandleColors(visible) {
    const series = seriesRef.current;
    if (!series) return;
    const colorByTime = waveTrendCrossColorByTimeRef.current;
    const data =
      visible && colorByTime.size > 0
        ? candlesRef.current.map((c) => {
            const color = colorByTime.get(c.time);
            return color ? { ...c, color, wickColor: color, borderColor: color } : c;
          })
        : candlesRef.current;
    series.setData(data);
  }

  function toggleEma(key) {
    if (onToggleEma) {
      onToggleEma(key);
      return;
    }
    setUncontrolledActiveEmas((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleIndicator(key) {
    if (onToggleIndicator) {
      onToggleIndicator(key);
      return;
    }
    setUncontrolledActiveIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function zoom(factor) {
    const chart = chartRef.current;
    if (!chart) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    const center = (range.from + range.to) / 2;
    const halfSpan = ((range.to - range.from) / 2) * factor;
    chart.timeScale().setVisibleLogicalRange({ from: center - halfSpan, to: center + halfSpan });
  }

  function fit() {
    chartRef.current?.timeScale().fitContent();
  }

  return (
    <div
      className={`relative group${fillHeight ? " h-full" : ""}`}
      onClick={onExpand}
      role={onExpand ? "button" : undefined}
      title={onExpand ? "Click to expand" : undefined}
    >
      <div
        ref={containerRef}
        className={fillHeight ? "w-full h-full" : "w-full"}
        style={fillHeight ? undefined : aspectRatio ? { aspectRatio } : { height }}
      />

      <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1.5 max-w-[calc(100%-5rem)]">
        {hoveredBar && <OhlcLegend bar={hoveredBar} />}
        {enableIndicators && !hideToggleOverlay && (
          <>
            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
              {EMA_DEFINITIONS.map((def) => (
                <ToggleChip
                  key={def.key}
                  def={def}
                  active={!!activeEmas[def.key]}
                  onClick={() => toggleEma(def.key)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
              {INDICATOR_DEFINITIONS.map((def) => (
                <ToggleChip
                  key={def.key}
                  def={def}
                  active={!!activeIndicators[def.key]}
                  onClick={() => toggleIndicator(def.key)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div
        className={`absolute top-2 right-2 z-10 flex gap-1 transition-opacity ${
          alwaysShowControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <ChartButton onClick={() => zoom(ZOOM_IN_FACTOR)} title="Zoom in">
          +
        </ChartButton>
        <ChartButton onClick={() => zoom(ZOOM_OUT_FACTOR)} title="Zoom out">
          −
        </ChartButton>
        <ChartButton onClick={fit} title="Fit to data">
          ⤢
        </ChartButton>
      </div>
    </div>
  );
}

export function ToggleChip({ def, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Toggle ${def.fullLabel || def.label}`}
      className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
        active
          ? "bg-surface-alt text-parchment"
          : "border-line text-parchment-faint hover:text-parchment-dim"
      }`}
      style={active ? { borderColor: def.color } : undefined}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: def.color, opacity: active ? 1 : 0.4 }}
      />
      {def.label}
    </button>
  );
}

// Intraday bars (numeric Unix timestamp) get a date + time label; day/week/
// month bars (a plain "YYYY-MM-DD" string) have no time-of-day to show.
function formatBarTime(time) {
  if (typeof time !== "number") return time;
  return new Date(time * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OhlcLegend({ bar }) {
  const fmt = (v) => Number(v).toFixed(2);
  const up = bar.close >= bar.open;

  return (
    <div className="pointer-events-none flex flex-wrap gap-x-3 gap-y-0.5 rounded bg-surface/80 px-2 py-1 font-mono text-[11px] leading-tight">
      <span className="text-parchment-dim">{formatBarTime(bar.time)}</span>
      <span className="text-parchment-faint">
        O <span className="text-parchment-dim">{fmt(bar.open)}</span>
      </span>
      <span className="text-parchment-faint">
        H <span className="text-parchment-dim">{fmt(bar.high)}</span>
      </span>
      <span className="text-parchment-faint">
        L <span className="text-parchment-dim">{fmt(bar.low)}</span>
      </span>
      <span className="text-parchment-faint">
        C <span className={up ? "text-gain-bright" : "text-loss-bright"}>{fmt(bar.close)}</span>
      </span>
    </div>
  );
}

function ChartButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="w-6 h-6 flex items-center justify-center rounded bg-surface-alt border border-line text-parchment-dim hover:text-parchment hover:border-gold-dim text-sm leading-none"
      {...props}
    >
      {children}
    </button>
  );
}
