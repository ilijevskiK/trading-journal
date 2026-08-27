"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeTrades } from "@/lib/finnhubSocket";

const THROTTLE_MS = 1000;
const STALE_AFTER_MS = 10000;
const STALE_CHECK_INTERVAL_MS = 5000;

// Latest live trade price for `symbol`, throttled to at most one React
// update per second so a fast-ticking stock doesn't hammer re-renders (and
// the indicator recompute that follows every candle update).
//
// `isLive` reflects whether a tick has actually arrived recently — false
// before the first one, and false again once trades stop for a stretch
// (market closed, symbol not streamed on the free tier, connection dropped),
// so the UI doesn't keep claiming "live" once the data's gone stale.
export function useFinnhubTrades(symbol, apiKey) {
  const [tick, setTick] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const latestRef = useRef(null);
  const lastFlushRef = useRef(0);
  const flushTimerRef = useRef(null);

  useEffect(() => {
    if (!symbol || !apiKey) {
      setTick(null);
      setIsLive(false);
      return;
    }

    function flush() {
      lastFlushRef.current = Date.now();
      setTick(latestRef.current);
      setIsLive(true);
      flushTimerRef.current = null;
    }

    function handleTrade(nextTick) {
      latestRef.current = nextTick;
      const sinceLastFlush = Date.now() - lastFlushRef.current;
      if (sinceLastFlush >= THROTTLE_MS) {
        flush();
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flush, THROTTLE_MS - sinceLastFlush);
      }
    }

    const unsubscribe = subscribeTrades(symbol, apiKey, handleTrade);

    const staleCheck = setInterval(() => {
      if (latestRef.current && Date.now() - latestRef.current.timestamp > STALE_AFTER_MS) {
        setIsLive(false);
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => {
      unsubscribe();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      clearInterval(staleCheck);
    };
  }, [symbol, apiKey]);

  return { tick, isLive };
}