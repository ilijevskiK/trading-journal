"use client";

import { useEffect, useState } from "react";
import { fetchDailyCandles } from "@/lib/marketData";
import { getCachedCandles, setCachedCandles } from "@/lib/chartCache";
import { lookbackDaysFor } from "@/lib/timeframes";
import { todayLocalDateStr } from "@/lib/calc";

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Same lookback-per-interval as a logged trade's chart (see
// useTradeCandles), anchored at today instead of an entry date — a
// watchlist ticker has no trade dates yet, only "as of right now".
// `enabled: false` skips fetching entirely (used for the fullscreen-only
// timeframe query, which shouldn't do any work while the modal is closed).
export function useWatchlistCandles(ticker, apiKey, { interval = "1day", enabled = true } = {}) {
  // `key` tags which cacheKey `candles` actually belongs to — see the same
  // field in useTradeCandles for why: without it, switching interval would
  // briefly hand back the *previous* interval's candles under the new
  // interval's name, before the effect below has even run.
  const [state, setState] = useState({ key: null, candles: [], loading: true, error: null });
  const [refetchToken, setRefetchToken] = useState(0);
  const cacheKey = `watchlist:${ticker}:${interval}`;

  useEffect(() => {
    if (!ticker || !enabled) {
      setState({ key: cacheKey, candles: [], loading: false, error: null });
      return;
    }

    let cancelled = false;

    async function load() {
      setState({ key: cacheKey, candles: [], loading: true, error: null });

      const today = todayLocalDateStr();
      const from = addDays(today, -lookbackDaysFor(interval));

      // Always "open" — a watchlist ticker is always "as of today", so the
      // cache uses the same short TTL as an open trade rather than caching
      // indefinitely.
      const cached = getCachedCandles(cacheKey, { from, to: today, isOpen: true });
      if (cached) {
        if (!cancelled) setState({ key: cacheKey, candles: cached, loading: false, error: null });
        return;
      }

      const { candles, error } = await fetchDailyCandles({
        symbol: ticker,
        apiKey,
        startDate: from,
        endDate: today,
        interval,
      });

      if (cancelled) return;
      if (error) {
        setState({ key: cacheKey, candles: [], loading: false, error });
        return;
      }
      setCachedCandles(cacheKey, { from, to: today, candles });
      setState({ key: cacheKey, candles, loading: false, error: null });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ticker, apiKey, interval, enabled, cacheKey, refetchToken]);

  const isStale = state.key !== cacheKey;
  return {
    candles: isStale ? [] : state.candles,
    loading: isStale ? true : state.loading,
    error: isStale ? null : state.error,
    refetch: () => setRefetchToken((t) => t + 1),
  };
}
