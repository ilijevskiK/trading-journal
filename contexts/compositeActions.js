"use server";

import { auth } from "@/auth";
import pool from "@/lib/db";
import { getLatestComposite } from "@/lib/compositeDb";

const MISSING_TABLE = "42P01";

// The latest Composite Ratings. They're built by scripts/run-composite.mjs.
export async function getCompositeAction() {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  try {
    return (await getLatestComposite(pool)) ?? { notRun: true };
  } catch (e) {
    if (e.code === MISSING_TABLE) {
      return { error: "The Composite Screener needs its table: run db/0011_composite.sql against your database once." };
    }
    return { error: e.message || "Couldn't load the Composite Screener." };
  }
}
