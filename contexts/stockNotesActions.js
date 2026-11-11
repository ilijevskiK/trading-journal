"use server";

import { auth } from "@/auth";
import pool from "@/lib/db";
import { getStockNote, saveStockNote } from "@/lib/stockNotesDb";
import { OWNER_TRENDS } from "@/lib/canslimI";

const MISSING_TABLE = "42P01";
const MIGRATION_HINT = "Saving needs the stock_notes table: run db/0006_stock_notes.sql against your database once.";

function cleanTicker(ticker) {
  const t = String(ticker || "").trim().toUpperCase();
  return /^[A-Z.\-]{1,10}$/.test(t) ? t : null;
}

export async function getStockNoteAction(ticker) {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const t = cleanTicker(ticker);
  if (!t) return { error: "Invalid ticker." };
  try {
    return { note: await getStockNote(pool, session.user.id, t) };
  } catch (e) {
    return { note: {}, error: e.code === MISSING_TABLE ? MIGRATION_HINT : "Couldn't load your notes." };
  }
}

// Only the fields the CAN SLIM pages actually use are accepted.
export async function saveStockNoteAction(ticker, patch) {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  const t = cleanTicker(ticker);
  if (!t) return { error: "Invalid ticker." };

  const clean = {};
  if ("pivot" in patch) {
    const pivot = patch.pivot === null || patch.pivot === "" ? null : Number(patch.pivot);
    if (pivot !== null && !(pivot > 0)) return { error: "The pivot must be a positive price." };
    clean.pivot = pivot;
  }
  if ("newThing" in patch) {
    clean.newThing = {
      confirmed: Boolean(patch.newThing?.confirmed),
      note: String(patch.newThing?.note || "").slice(0, 500),
    };
  }

  if ("institutional" in patch) {
    const i = patch.institutional || {};
    clean.institutional = {
      ownersTrend: OWNER_TRENDS.includes(i.ownersTrend) ? i.ownersTrend : null,
      qualityBuyers: Boolean(i.qualityBuyers),
      overOwned: Boolean(i.overOwned),
      note: String(i.note || "").slice(0, 500),
    };
  }

  try {
    return { note: await saveStockNote(pool, session.user.id, t, clean) };
  } catch (e) {
    return { error: e.code === MISSING_TABLE ? MIGRATION_HINT : "Couldn't save." };
  }
}
