// Helpers shared by the scripts that download price history
// (scripts/run-screener.mjs, scripts/backfill-rs-history.mjs).

import { fetchGroupedBars, isWeekend, previousDay } from "./massiveData.js";
import { getStoredDates, savePriceDay } from "./screenerDb.js";

export function log(message) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} isn't set.`);
  return value;
}

export function daysBefore(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

export function weekdaysBetween(oldest, latest) {
  const dates = [];
  for (let d = latest; d >= oldest; d = previousDay(d)) if (!isWeekend(d)) dates.push(d);
  return dates; // newest first, so an interrupted backfill still has recent days
}

export async function withRetryOnRateLimit(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e.status !== 429) throw e;
    log("Rate limited; waiting a minute.");
    await new Promise((r) => setTimeout(r, 61_000));
    return fn();
  }
}

// Downloads every weekday from `oldest` to `latest` that isn't stored yet.
// Each day is saved as it arrives, so an interrupted run can simply be rerun.
export async function downloadMissingDays(pool, universe, oldest, latest, apiKey) {
  const stored = await getStoredDates(pool);
  const missing = weekdaysBetween(oldest, latest).filter((d) => !stored.has(d));
  if (!missing.length) return log("Price history is up to date.");
  log(`Downloading ${missing.length} day(s), about ${Math.ceil(missing.length / 5)} min.`);
  for (const [i, date] of missing.entries()) {
    const bars = await withRetryOnRateLimit(() => fetchGroupedBars(date, apiKey, { adjusted: false }));
    if (bars === null) {
      log(`${date}: not available yet, skipped.`);
      continue;
    }
    await savePriceDay(pool, date, bars.filter((b) => universe.has(b.T)));
    log(`${date}: ${bars.length ? `${bars.length} bars` : "market closed"} (${i + 1}/${missing.length})`);
  }
}
