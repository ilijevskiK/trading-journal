"use client";

import { useEffect, useRef, useState } from "react";
import { searchSymbols } from "@/lib/marketData";

// Debounced autocomplete over Twelve Data's /symbol_search — no bulk
// download, just a ranked-by-relevance lookup as the user types.
//
// Two usage modes:
// - "add to list" (watchlist): leave `value`/`onQueryChange` unset, and it
//   behaves as before — clears itself after a selection.
// - "form field" (new trade): pass `value` (the field's current text),
//   `onQueryChange` to keep that state updated as the user types, and
//   `clearOnSelect={false}` so picking a suggestion fills the field instead
//   of wiping it.
export default function TickerSearchInput({
  apiKey,
  onSelect,
  onQueryChange,
  onBlur,
  disabled,
  placeholder,
  value,
  clearOnSelect = true,
  containerClassName = "relative flex-1 max-w-xs",
  inputClassName = "w-full bg-surface-alt border border-line rounded px-3 py-1.5 text-sm text-parchment placeholder:text-parchment-faint focus:outline-none focus:border-gold-dim disabled:opacity-40",
}) {
  const [query, setQueryState] = useState(value ?? "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  // Keep in sync if a parent resets the field's value from outside (e.g.
  // clearing the form). No-op for callers that don't pass `value`.
  useEffect(() => {
    if (value !== undefined && value !== query) {
      setQueryState(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function setQuery(next) {
    setQueryState(next);
    onQueryChange?.(next);
  }

  useEffect(() => {
    if (!query.trim() || !apiKey) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const { results: found } = await searchSymbols({ query, apiKey, limit: 8 });
      if (cancelled) return;
      setResults(found);
      setLoading(false);
      setActiveIndex(-1);
      setOpen(true);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, apiKey]);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectResult(symbol) {
    onSelect(symbol);
    setQuery(clearOnSelect ? "" : symbol);
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        selectResult(results[activeIndex].symbol);
      } else if (query.trim()) {
        selectResult(query.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={containerClassName}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
      />

      {open && query.trim() && (
        <div className="absolute z-20 mt-1 w-full max-w-sm rounded-lg border border-line bg-surface shadow-lg overflow-hidden">
          {loading ? (
            <p className="px-3 py-2 text-xs text-parchment-faint">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-parchment-faint">No matches for &quot;{query}&quot;.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.symbol}-${r.exchange}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectResult(r.symbol);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left border-t border-line first:border-t-0 transition-colors ${
                  i === activeIndex ? "bg-surface-alt" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="font-mono text-sm text-parchment">{r.symbol}</span>
                  <span className="block text-xs text-parchment-faint truncate">{r.name}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-parchment-faint shrink-0">
                  {r.exchange}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
