"use client";

import { useEffect, useState } from "react";
import { fetchDailyCandles } from "@/lib/marketData";
import { getCachedCandles, setCachedCandles } from "@/lib/chartCache";
import { lookbackDaysFor } from "@/lib/timeframes";
import { lastExitDate, todayLocalDateStr } from "@/lib/calc";

// Look back as far as Twelve Data's time_series endpoint allows in a
// single request (hard cap: 5,000 bars per call) so the chart can show
// long-term context, not just the trade's own short window — see
// lib/timeframes.js for how far back each interval goes. The end side only
// needs a small pad past the exit (or "today" for open trades).
const END_PAD_DAYS = 15;

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Computes a year-before-entry -> exit+pad (closed) or -> today (open) date
// range for a trade, then fetches/caches candles at the given interval.
// `enabled: false` skips fetching entirely (used for the fullscreen-only
// timeframe query, which shouldn't do any work while the modal is closed).
export function useTradeCandles(trade, apiKey, { interval = "1day", enabled = true } = {}) {
  // `key` tags which cacheKey `candles` actually belongs to. Switching
  // interval changes cacheKey in the same render this hook is called with
  // the new value, but the effect that fetches it hasn't run yet — without
  // this, callers would briefly get the *previous* interval's candles
  // handed back under the new interval's name (e.g. a chart keyed by
  // timeframe would flash stale daily data into a freshly-mounted "1H"
  // instance before real hourly data arrives).
  const [state, setState] = useState({ key: null, candles: [], loading: true, error: null });
  const [refetchToken, setRefetchToken] = useState(0);

  const isOpen = trade.status !== "closed";
  const today = todayLocalDateStr();
  const rangeEnd = isOpen ? today : lastExitDate(trade) || trade.entryDate;

  const from = addDays(trade.entryDate, -lookbackDaysFor(interval));
  const to = addDays(rangeEnd, END_PAD_DAYS);
  const cacheKey = `${trade.id}:${interval}`;

  useEffect(() => {
    if (!enabled) {
      setState({ key: cacheKey, candles: [], loading: false, error: null });
      return;
    }

    let cancelled = false;

    async function load() {
      setState({ key: cacheKey, candles: [], loading: true, error: null });

      const cached = getCachedCandles(cacheKey, { from, to, isOpen });
      if (cached) {
        if (!cancelled) setState({ key: cacheKey, candles: cached, loading: false, error: null });
        return;
      }

      const { candles, error } = await fetchDailyCandles({
        symbol: trade.ticker,
        apiKey,
        startDate: from,
        endDate: to,
        interval,
      });

      if (cancelled) return;

      if (error) {
        setState({ key: cacheKey, candles: [], loading: false, error });
        return;
      }

      setCachedCandles(cacheKey, { from, to, candles });
      setState({ key: cacheKey, candles, loading: false, error: null });
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade.id, trade.ticker, trade.entryDate, isOpen, from, to, apiKey, interval, enabled, cacheKey, refetchToken]);

  const isStale = state.key !== cacheKey;
  return {
    candles: isStale ? [] : state.candles,
    loading: isStale ? true : state.loading,
    error: isStale ? null : state.error,
    refetch: () => setRefetchToken((t) => t + 1),
  };
}
