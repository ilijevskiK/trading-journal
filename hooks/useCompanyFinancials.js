"use client";

import { useEffect, useState } from "react";
import { getCompanyFinancialsAction } from "@/contexts/fundamentalsActions";

// Kept for the session and shared by every CAN SLIM letter page, so
// switching from Current Earnings to Annual Earnings for the same ticker
// doesn't download the filings again.
const cache = new Map();

export function useCompanyFinancials(ticker) {
  const [state, setState] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    if (!ticker) {
      setState({ loading: false, data: null, error: null });
      return;
    }
    const cached = cache.get(ticker);
    if (cached) {
      setState({ loading: false, data: cached, error: null });
      return;
    }
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    getCompanyFinancialsAction(ticker)
      .then((result) => {
        if (cancelled) return;
        if (!result.error) cache.set(ticker, result);
        setState({ loading: false, data: result.error ? null : result, error: result.error || null });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, data: null, error: "Couldn't load the filings. Try again." });
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return state;
}
