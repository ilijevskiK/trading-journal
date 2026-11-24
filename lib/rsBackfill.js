// Rebuilds past RS Ratings from the stored price history: for each trading
// day it ranks every stock as it stood on that day, using only the prices
// up to then. Pure; the script that saves the results is
// scripts/backfill-rs-history.mjs.

import { historyIsComplete, rankStocks } from "./screener.js";

export const MIN_RANKED = 500; // same sanity floor as the daily job

// Yields { asOf, ratings } for each stored day from `since` on that has a
// full year of history behind it (a day without one would be ranked on
// fewer periods and not be comparable). `skipDates` are days that already
// have a saved ranking. Splits are applied as of the latest day: a split
// after a given day moves all of that day's prices equally, so its ratios
// don't change.
export function* backfillRatings(days, splits, universe, { since = null, skipDates = new Set() } = {}) {
  for (let i = 0; i < days.length; i++) {
    const date = days[i].date;
    if (since && date < since) continue;
    if (skipDates.has(date)) continue;
    const upToDate = days.slice(0, i + 1);
    if (!historyIsComplete(upToDate)) continue;
    const ratings = rankStocks(upToDate, splits, universe);
    if (ratings.length < MIN_RANKED) continue;
    yield { asOf: date, ratings };
  }
}
