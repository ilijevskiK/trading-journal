"use client";

import { useEffect, useState } from "react";

// Persists the watchlist grid's tickers (order = grid position) so the
// section reopens in the same state it was left in — same pattern as
// TradesContext's own localStorage load/save.
const STORAGE_KEY = "tj_watchlist_v1";
const MAX_TICKERS = 6;

export function useWatchlist() {
  const [tickers, setTickers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setTickers(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to load watchlist", e);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
    } catch (e) {
      console.error("Failed to save watchlist", e);
    }
  }, [tickers, loaded]);

  function addTicker(rawTicker) {
    const ticker = (rawTicker || "").trim().toUpperCase();
    if (!ticker) return { ok: false, reason: "empty" };
    if (tickers.includes(ticker)) return { ok: false, reason: "duplicate" };
    if (tickers.length >= MAX_TICKERS) return { ok: false, reason: "full" };
    setTickers((prev) => [...prev, ticker]);
    return { ok: true };
  }

  function removeTicker(ticker) {
    setTickers((prev) => prev.filter((t) => t !== ticker));
  }

  return { tickers, loaded, addTicker, removeTicker, maxTickers: MAX_TICKERS };
}
