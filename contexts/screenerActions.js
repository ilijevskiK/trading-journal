"use server";

import { auth } from "@/auth";
import pool from "@/lib/db";
import { getLatestScreen } from "@/lib/screenerDb";

const MISSING_TABLE = "42P01";

// The latest daily screen. It's built by scripts/run-screener.mjs, not
// here: the download takes far longer than a page request may run.
export async function getScreenerAction() {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  try {
    return (await getLatestScreen(pool)) ?? { notRun: true };
  } catch (e) {
    if (e.code === MISSING_TABLE) {
      return { error: "The screener needs its tables: run db/0008_screener.sql against your database once." };
    }
    return { error: e.message || "Couldn't load the screener." };
  }
}
