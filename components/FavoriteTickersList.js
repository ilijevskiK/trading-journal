"use client";

// The starred-tickers sidebar on the Watchlist page — deliberately ticker-
// only, no price/quote fetching. Twelve Data's free tier caps out at 8
// requests/min; since this list is meant to hold more names than the
// 6-chart grid ever could, fetching a quote per favourite would burn through
// that budget fast as the list grows. Ticker-only means the list can grow
// as large as you want with zero added API cost.
//
// Split into two groups: tickers with an open position (auto-added — see
// app/watchlist/page.js) first, then everything else — names you're just
// watching for a potential entry. The split is derived from `openTickers`
// each render rather than stored, so it always reflects current trade
// status even if a position closes without touching the favourites list.
export default function FavoriteTickersList({
  tickers,
  openTickers = [],
  onRemove,
  onAddToGrid,
  gridTickers,
  gridFull,
}) {
  if (tickers.length === 0) {
    return (
      <p className="text-xs text-parchment-faint">
        No favourites yet — search above to star a ticker you want to keep an
        eye on without giving it a chart slot.
      </p>
    );
  }

  const openSet = new Set(openTickers);
  const openFavorites = tickers.filter((t) => openSet.has(t));
  const watchingFavorites = tickers.filter((t) => !openSet.has(t));

  return (
    <div>
      {openFavorites.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-parchment-faint mb-1">
            Open positions
          </p>
          <ul className="divide-y divide-line">
            {openFavorites.map((ticker) => (
              <FavoriteRow
                key={ticker}
                ticker={ticker}
                inGrid={gridTickers.includes(ticker)}
                gridFull={gridFull}
                onAddToGrid={onAddToGrid}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </div>
      )}

      {openFavorites.length > 0 && watchingFavorites.length > 0 && (
        <div className="rule-divider my-3" />
      )}

      {watchingFavorites.length > 0 && (
        <div>
          {openFavorites.length > 0 && (
            <p className="text-[10px] uppercase tracking-wide text-parchment-faint mb-1">
              Watching
            </p>
          )}
          <ul className="divide-y divide-line">
            {watchingFavorites.map((ticker) => (
              <FavoriteRow
                key={ticker}
                ticker={ticker}
                inGrid={gridTickers.includes(ticker)}
                gridFull={gridFull}
                onAddToGrid={onAddToGrid}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FavoriteRow({ ticker, inGrid, gridFull, onAddToGrid, onRemove }) {
  return (
    <li className="py-2 flex items-center justify-between gap-2">
      <span className="font-mono text-sm text-parchment truncate min-w-0">{ticker}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {!inGrid && (
          <button
            type="button"
            onClick={() => onAddToGrid(ticker)}
            disabled={gridFull}
            title={gridFull ? "Chart grid is full — remove one first" : `Add ${ticker} to the chart grid`}
            className="text-[10px] uppercase tracking-wide border border-line rounded px-1.5 py-0.5 text-parchment-faint hover:text-gold-bright hover:border-gold-dim disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-parchment-faint disabled:hover:border-line"
          >
            + chart
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(ticker)}
          title={`Remove ${ticker} from favourites`}
          className="text-parchment-faint hover:text-loss-bright text-xs px-1"
        >
          ✕
        </button>
      </div>
    </li>
  );
}