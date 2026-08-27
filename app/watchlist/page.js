"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTrades } from "@/contexts/TradesContext";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useFavoriteTickers } from "@/hooks/useFavoriteTickers";
import { sharesRemaining } from "@/lib/calc";
import WatchlistCard from "@/components/WatchlistCard";
import TickerSearchInput from "@/components/TickerSearchInput";
import FavoriteTickersList from "@/components/FavoriteTickersList";

export default function WatchlistPage() {
  const { trades, settings } = useTrades();
  const apiKey = settings.twelveDataApiKey;
  const finnhubApiKey = settings.finnhubApiKey;
  const { tickers, loaded, addTicker, removeTicker, maxTickers } = useWatchlist();
  const [formError, setFormError] = useState(null);

  const {
    tickers: favoriteTickers,
    loaded: favoritesLoaded,
    addFavorite,
    removeFavorite,
  } = useFavoriteTickers();
  const [favoriteFormError, setFavoriteFormError] = useState(null);

  // Any ticker with an open position defaults into Favourites — one-way
  // only (adds missing ones, never removes), so closing a trade or manually
  // un-starring a ticker later doesn't get silently undone by this effect.
  const openTickers = useMemo(
    () => [...new Set(trades.filter((t) => sharesRemaining(t) > 0).map((t) => t.ticker))],
    [trades]
  );
  useEffect(() => {
    if (!favoritesLoaded) return;
    openTickers.forEach((ticker) => addFavorite(ticker));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTickers, favoritesLoaded]);

  function handleSelect(ticker) {
    const result = addTicker(ticker);
    if (!result.ok) {
      setFormError(
        result.reason === "full"
          ? `You can track up to ${maxTickers} tickers at once — remove one first.`
          : result.reason === "duplicate"
          ? "Already on your watchlist."
          : "Enter a ticker symbol."
      );
      return;
    }
    setFormError(null);
  }

  function handleAddFavorite(ticker) {
    const result = addFavorite(ticker);
    if (!result.ok) {
      setFavoriteFormError(result.reason === "duplicate" ? "Already in favourites." : "Enter a ticker symbol.");
      return;
    }
    setFavoriteFormError(null);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl text-parchment">Watchlist</h1>
          <span className="font-mono text-xs text-parchment-faint">
            {tickers.length} of {maxTickers}
          </span>
        </div>
        <p className="text-xs text-parchment-faint mt-2 max-w-lg">
          Track up to {maxTickers} tickers you&apos;re considering for a new
          trade — click any chart to open the same full toggle set (Stage
          Analysis, Entry Disqualifier, and the rest) a logged trade already
          gets, before you&apos;ve actually taken the position.
        </p>

        <div className="mt-4">
          <TickerSearchInput
            apiKey={apiKey}
            onSelect={handleSelect}
            disabled={tickers.length >= maxTickers || !apiKey}
            placeholder={
              !apiKey ? "Add a Twelve Data API key in Settings first" : "Search by ticker or company name…"
            }
          />
        </div>
        {formError && <p className="text-xs text-loss-bright mt-1.5">{formError}</p>}

        <div className="rule-divider mt-4 mb-6" />

        {!apiKey ? (
          <div className="border border-line rounded-lg bg-surface-alt px-6 py-10 text-center text-sm text-parchment-faint">
            Add a Twelve Data API key in{" "}
            <Link href="/settings" className="text-gold-bright hover:underline">
              Settings
            </Link>{" "}
            to see price charts here.
          </div>
        ) : !loaded ? null : tickers.length === 0 ? (
          <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
            Nothing on your watchlist yet — add a ticker above to start
            analyzing it.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tickers.map((ticker) => (
              <WatchlistCard
                key={ticker}
                ticker={ticker}
                apiKey={apiKey}
                finnhubApiKey={finnhubApiKey}
                onRemove={() => removeTicker(ticker)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="lg:w-72 shrink-0">
        <div className="border border-line rounded-lg bg-surface p-4">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-sm text-parchment">Favourites</h2>
            <span className="font-mono text-xs text-parchment-faint">{favoriteTickers.length}</span>
          </div>
          <p className="text-xs text-parchment-faint mb-3">
            Tickers to keep an eye on — no chart-slot limit, and no API calls
            spent on them either. Use &quot;+ chart&quot; to promote one into
            the grid above when you want to actually see it.
          </p>

          <TickerSearchInput
            apiKey={apiKey}
            onSelect={handleAddFavorite}
            disabled={!apiKey}
            placeholder={!apiKey ? "Add a Twelve Data API key first" : "Search to favourite…"}
            containerClassName="relative"
          />
          {favoriteFormError && (
            <p className="text-xs text-loss-bright mt-1.5">{favoriteFormError}</p>
          )}

          <div className="rule-divider mt-3 mb-1" />

          {!favoritesLoaded ? null : (
            <FavoriteTickersList
              tickers={favoriteTickers}
              openTickers={openTickers}
              onRemove={removeFavorite}
              onAddToGrid={handleSelect}
              gridTickers={tickers}
              gridFull={tickers.length >= maxTickers}
            />
          )}
        </div>
      </div>
    </div>
  );
}