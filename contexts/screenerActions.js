"use server";

import { auth } from "@/auth";
import pool from "@/lib/db";
import { getLatestScreen } from "@/lib/screenerDb";
import { getGroupsForTickers } from "@/lib/industriesDb";

const MISSING_TABLE = "42P01";

// The latest daily screen. It's built by scripts/run-screener.mjs, not
// here: the download takes far longer than a page request may run.
export async function getScreenerAction() {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  try {
    const screen = await getLatestScreen(pool);
    if (!screen) return { notRun: true };
    // Each stock's industry group and its rank. A nice-to-have: without the
    // group tables the screener still works, just without the Group column.
    const groups = await getGroupsForTickers(pool, screen.stocks.map((s) => s.ticker)).catch(() => new Map());
    return { ...screen, stocks: screen.stocks.map((s) => ({ ...s, group: groups.get(s.ticker) ?? null })) };
  } catch (e) {
    if (e.code === MISSING_TABLE) {
      return { error: "The screener needs its tables: run db/0008_screener.sql against your database once." };
    }
    return { error: e.message || "Couldn't load the screener." };
  }
}
