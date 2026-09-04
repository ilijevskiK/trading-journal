"use client";

import { useEffect, useState } from "react";
import {
  fetchCompanyProfile,
  fetchBasicFinancials,
  fetchCompanyEarnings,
  fetchPeers,
  fetchCompanyNews,
  fetchRecommendationTrends,
} from "@/lib/finnhubData";
import { getCachedFundamentals, setCachedFundamentals } from "@/lib/chartCache";

// Company "glimpse" for the S&P 500 page — profile, valuation/margin/growth
// metrics, earnings, peers, recent news, and analyst recommendations,
// bundled into one cached unit per ticker (24h TTL, see lib/chartCache.js).
// `ticker` may be null (modal closed) to skip fetching entirely.
export function useCompanyGlimpse(ticker, apiKey) {
  const [state, setState] = useState({ data: null, loading: false, error: null });

  useEffect(() => {
    if (!ticker) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    if (!apiKey) {
      setState({ data: null, loading: false, error: { message: "No Finnhub API key set." } });
      return;
    }

    const cached = getCachedFundamentals(ticker);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    async function load() {
      const [profileRes, metricsRes, earningsRes, peersRes, newsRes, recommendationRes] = await Promise.all([
        fetchCompanyProfile({ symbol: ticker, apiKey }),
        fetchBasicFinancials({ symbol: ticker, apiKey }),
        fetchCompanyEarnings({ symbol: ticker, apiKey }),
        fetchPeers({ symbol: ticker, apiKey }),
        fetchCompanyNews({ symbol: ticker, apiKey }),
        fetchRecommendationTrends({ symbol: ticker, apiKey }),
      ]);

      if (cancelled) return;

      const firstError = profileRes.error || metricsRes.error || earningsRes.error;
      if (firstError && !profileRes.data) {
        setState({ data: null, loading: false, error: firstError });
        return;
      }

      const data = {
        profile: profileRes.data,
        metrics: metricsRes.data,
        earnings: earningsRes.data,
        peers: peersRes.data,
        news: newsRes.data,
        recommendation: recommendationRes.data,
      };
      setCachedFundamentals(ticker, data);
      setState({ data, loading: false, error: null });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ticker, apiKey]);

  return state;
}
