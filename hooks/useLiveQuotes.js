"use client";

import { useEffect, useState } from "react";
import { fetchQuote } from "@/lib/marketData";
import { getCachedQuote, setCachedQuote } from "@/lib/chartCache";

// Latest price per ticker for "as of right now" valuations (dashboard
// balance sheet) — lighter than useTradeCandles/useWatchlistCandles since it
// only needs one number per ticker, not a candle series.
export function useLiveQuotes(tickers, apiKey) {
  const key = [...new Set(tickers)].sort().join(",");
  const [state, setState] = useState({ quotes: {}, loading: false });

  useEffect(() => {
    if (!apiKey || !key) {
      setState({ quotes: {}, loading: false });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    async function load() {
      const uniqueTickers = key.split(",");
      const results = await Promise.all(
        uniqueTickers.map(async (ticker) => {
          const cached = getCachedQuote(ticker);
          if (cached != null) return [ticker, cached];
          const { price } = await fetchQuote({ symbol: ticker, apiKey });
          if (price != null) setCachedQuote(ticker, price);
          return [ticker, price];
        })
      );

      if (cancelled) return;
      const quotes = {};
      results.forEach(([ticker, price]) => {
        if (price != null) quotes[ticker] = price;
      });
      setState({ quotes, loading: false });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [key, apiKey]);

  return state;
}