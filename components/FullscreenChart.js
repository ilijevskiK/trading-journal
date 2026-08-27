"use client";

import { useEffect, useState } from "react";
import CandlestickChart, {
  EMA_DEFINITIONS,
  INDICATOR_DEFINITIONS,
  ToggleChip,
} from "@/components/CandlestickChart";
import ChartModal from "@/components/ChartModal";
import { TIMEFRAMES } from "@/lib/timeframes";

const TOP_EMA_KEYS = ["ema5", "ema10", "ema30", "ema50", "ema200"];
const TOP_INDICATOR_KEYS = ["bollingerBands", "rsi", "vwap", "atr"];
const LEFT_INDICATOR_KEYS = ["alphaTrend", "waveTrend", "squeeze", "smc"];
const RIGHT_INDICATOR_KEYS = ["stageAnalysis", "entryDisqualifier"];

const DEFAULT_ACTIVE_EMAS = {};
const DEFAULT_ACTIVE_INDICATORS = {};

// Remembers which toggles were on the last time any fullscreen chart was
// open, so reopening (even a different ticker) restores the same set
// instead of always starting from scratch.
const STORAGE_KEY = "tj_fullscreen_chart_toggles_v1";

function loadStoredToggles() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveStoredToggles(emas, indicators) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ emas, indicators }));
  } catch (e) {
    // Persistence is a nice-to-have — a full/unavailable localStorage
    // shouldn't break the chart.
  }
}

const emaByKey = Object.fromEntries(EMA_DEFINITIONS.map((def) => [def.key, def]));
const indicatorByKey = Object.fromEntries(INDICATOR_DEFINITIONS.map((def) => [def.key, def]));

// The fullscreen chart view: EMA5/10/30/50/200 + Bollinger Bands + RSI live
// in the top margin under "Default Indicators", the TradingView-style
// indicators (AlphaTrend, WaveTrend, Squeeze Momentum, Smart Money Concepts)
// live in the left margin, and this journal's own strategy indicators
// (Stage Analysis, Entry Disqualifier) live in the right margin — all in the
// empty space around the chart instead of overlaid on top of it. None are
// active until the user toggles them on.
export default function FullscreenChart({
  title,
  trade,
  candles,
  loading,
  error,
  timeframe,
  onTimeframeChange,
  apiKey,
  onClose,
}) {
  const [activeEmas, setActiveEmas] = useState(
    () => loadStoredToggles()?.emas ?? DEFAULT_ACTIVE_EMAS
  );
  const [activeIndicators, setActiveIndicators] = useState(
    () => loadStoredToggles()?.indicators ?? DEFAULT_ACTIVE_INDICATORS
  );

  useEffect(() => {
    saveStoredToggles(activeEmas, activeIndicators);
  }, [activeEmas, activeIndicators]);

  function toggleEma(key) {
    setActiveEmas((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleIndicator(key) {
    setActiveIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function emaChip(key) {
    return (
      <ToggleChip
        key={key}
        def={emaByKey[key]}
        active={!!activeEmas[key]}
        onClick={() => toggleEma(key)}
      />
    );
  }

  function indicatorChip(key) {
    return (
      <ToggleChip
        key={key}
        def={indicatorByKey[key]}
        active={!!activeIndicators[key]}
        onClick={() => toggleIndicator(key)}
      />
    );
  }

  return (
    <ChartModal title={title} onClose={onClose}>
      <div className="h-full flex flex-col">
        <div className="flex flex-col items-center gap-1.5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <GroupLabel>Timeframe</GroupLabel>
            <div className="flex gap-1.5">
              {TIMEFRAMES.map((tf) => (
                <TimeframeButton
                  key={tf.key}
                  label={tf.label}
                  active={timeframe === tf.key}
                  onClick={() => onTimeframeChange(tf.key)}
                />
              ))}
            </div>
            {loading && (
              <span className="font-mono text-[10px] text-parchment-faint">Loading…</span>
            )}
            {error && (
              <span className="font-mono text-[10px] text-loss-bright">{error.message}</span>
            )}
          </div>
          <GroupLabel>Default Indicators</GroupLabel>
          <div className="flex flex-wrap justify-center gap-3">
            {TOP_EMA_KEYS.map(emaChip)}
            {TOP_INDICATOR_KEYS.map(indicatorChip)}
          </div>
        </div>
        <div className="flex-1 flex gap-4 min-h-0">
          <div className="flex flex-col gap-3 w-36 shrink-0 pt-1">
            <GroupLabel>TradingView Indicators</GroupLabel>
            {LEFT_INDICATOR_KEYS.map(indicatorChip)}
          </div>
          <div className="flex-1 min-w-0">
            {/* key={timeframe} forces a full remount on timeframe change —
                lightweight-charts isn't meant to have a series' time-value
                type (date string for 1D/1W vs. numeric timestamp for
                1H/4H) change under it via setData(), and this also gets a
                fresh fitContent() for the new range for free. */}
            <CandlestickChart
              key={timeframe}
              trade={trade}
              candles={candles}
              apiKey={apiKey}
              fillHeight
              alwaysShowControls
              enableIndicators
              hideToggleOverlay
              activeEmas={activeEmas}
              onToggleEma={toggleEma}
              activeIndicators={activeIndicators}
              onToggleIndicator={toggleIndicator}
            />
          </div>
          <div className="flex flex-col gap-3 w-36 shrink-0 pt-1">
            <GroupLabel>Strategies</GroupLabel>
            {RIGHT_INDICATOR_KEYS.map(indicatorChip)}
          </div>
        </div>
      </div>
    </ChartModal>
  );
}

function GroupLabel({ children }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wide text-parchment-faint">
      {children}
    </span>
  );
}

function TimeframeButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
        active
          ? "border-gold-dim bg-surface-alt text-parchment"
          : "border-line text-parchment-faint hover:text-parchment-dim"
      }`}
    >
      {label}
    </button>
  );
}
