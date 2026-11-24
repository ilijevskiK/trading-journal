"use server";

import { auth } from "@/auth";
import pool from "@/lib/db";
import { getLatestGroups } from "@/lib/industriesDb";

const MISSING_TABLE = "42P01";

// The latest industry group ranking. It's built by scripts/run-industries.mjs.
export async function getGroupsAction() {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  try {
    return (await getLatestGroups(pool)) ?? { notRun: true };
  } catch (e) {
    if (e.code === MISSING_TABLE) {
      return { error: "Leading Groups needs its tables: run db/0009_industries.sql against your database once." };
    }
    return { error: e.message || "Couldn't load the group ranking." };
  }
}
