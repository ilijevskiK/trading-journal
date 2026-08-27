"use client";

import { useEffect, useState } from "react";

// A starred-tickers list shown beside the watchlist's 6-chart grid — same
// localStorage persistence pattern as useWatchlist, but deliberately
// uncapped: this is for keeping an eye on more names than you have chart
// slots for, not for charting all of them at once.
const STORAGE_KEY = "tj_favorite_tickers_v1";

export function useFavoriteTickers() {
  const [tickers, setTickers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setTickers(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to load favorite tickers", e);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
    } catch (e) {
      console.error("Failed to save favorite tickers", e);
    }
  }, [tickers, loaded]);

  function addFavorite(rawTicker) {
    const ticker = (rawTicker || "").trim().toUpperCase();
    if (!ticker) return { ok: false, reason: "empty" };
    if (tickers.includes(ticker)) return { ok: false, reason: "duplicate" };
    setTickers((prev) => [...prev, ticker]);
    return { ok: true };
  }

  function removeFavorite(ticker) {
    setTickers((prev) => prev.filter((t) => t !== ticker));
  }

  return { tickers, loaded, addFavorite, removeFavorite };
}