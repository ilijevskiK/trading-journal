"use server";

import { auth } from "@/auth";
import pool from "@/lib/db";
import { computeRsRatings, snapshotTargets, RS_PERIODS } from "@/lib/rsRating";
import { closesOnOrBefore, latestRequestableDate } from "@/lib/massiveData";
import { fetchSecTickerSet } from "@/lib/secEdgar";
import { getLatestRun, getRating, getRatingHistory, saveRun, withRankingLock } from "@/lib/rsRatingsDb";

const MISSING_TABLE = "42P01";
const REFRESH_AFTER_HOURS = 12;

// Downloads the five snapshots, ranks every company, and saves the run.
async function runRanking(client, massiveKey, userAgent) {
  const latest = await closesOnOrBefore(latestRequestableDate(), massiveKey);
  if (!latest) throw new Error("Massive returned no recent trading day.");
  const targets = snapshotTargets(latest.date);
  const snapshots = { now: latest.closes };
  for (const p of RS_PERIODS) {
    const found = await closesOnOrBefore(targets[p.key], massiveKey);
    snapshots[p.key] = found?.closes ?? new Map();
  }
  const universe = await fetchSecTickerSet(userAgent);
  const ratings = computeRsRatings(snapshots, universe);
  if (ratings.length < 500) throw new Error("Too few stocks to rank; the price download looks incomplete.");
  await saveRun(client, latest.date, ratings);
}

function needsRefresh(run) {
  if (!run) return true;
  const ageHours = (Date.now() - new Date(run.created_at).getTime()) / 3_600_000;
  return ageHours >= REFRESH_AFTER_HOURS && run.as_of < latestRequestableDate();
}

export async function getRsRatingAction(ticker) {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const symbol = String(ticker || "").trim().toUpperCase().replace("-", ".");
  if (!/^[A-Z.]{1,10}$/.test(symbol)) return { error: "Invalid ticker." };

  const massiveKey = process.env.MASSIVE_API_KEY;
  const userAgent = process.env.SEC_USER_AGENT;
  if (!massiveKey) {
    return { error: 'MASSIVE_API_KEY isn\'t set. Add your free massive.com key to .env.local (MASSIVE_API_KEY="...") and restart the server.' };
  }
  if (!userAgent) return { error: "SEC_USER_AGENT isn't set (needed for the list of companies to rank)." };

  try {
    let run = await getLatestRun(pool);
    let refreshError = null;
    if (needsRefresh(run)) {
      try {
        const ran = await withRankingLock(pool, (client) => runRanking(client, massiveKey, userAgent));
        if (!ran && !run) return { pending: true };
        run = await getLatestRun(pool);
      } catch (e) {
        if (e.code === MISSING_TABLE || !run) throw e;
        refreshError = e.message; // keep showing the last good run
      }
    }
    const rating = await getRating(pool, symbol);
    if (!rating) return { notRanked: true, asOf: run?.as_of ?? null, universe: run?.universe ?? null, refreshError };
    return { ...rating, history: await getRatingHistory(pool, symbol), refreshError };
  } catch (e) {
    if (e.code === MISSING_TABLE) {
      return { error: "RS Ratings need their tables: run db/0007_rs_ratings.sql against your database once." };
    }
    return { error: e.message || "Couldn't compute RS Ratings." };
  }
}
