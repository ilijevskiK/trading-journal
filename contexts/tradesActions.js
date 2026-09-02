"use server";

import { auth } from "@/auth";
import pool from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settingsDefaults";
import * as db from "@/lib/tradesDb";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");
  return session.user.id;
}

// Short-circuits with no query at all when there's no session — true on
// /signin, since TradesProvider wraps every route.
export async function getInitialDataAction() {
  const session = await auth();
  if (!session?.user) {
    return { trades: [], settings: DEFAULT_SETTINGS, deposits: [] };
  }
  const { trades, deposits, settings } = await db.getInitialData(pool, session.user.id);
  return { trades, deposits, settings: settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS };
}

export async function addTradeAction(trade) {
  const userId = await requireUserId();
  return db.insertTrade(pool, userId, trade);
}

export async function updateTradeAction(tradeId, patch) {
  const userId = await requireUserId();
  return db.updateTrade(pool, userId, tradeId, patch);
}

export async function deleteTradeAction(tradeId) {
  const userId = await requireUserId();
  await db.deleteTrade(pool, userId, tradeId);
}

export async function addExitAction(tradeId, exit) {
  const userId = await requireUserId();
  return db.addExit(pool, userId, tradeId, exit);
}

export async function removeExitAction(tradeId, exitId) {
  const userId = await requireUserId();
  await db.removeExit(pool, userId, tradeId, exitId);
}

export async function updateSettingsAction(patch) {
  const userId = await requireUserId();
  return db.updateSettings(pool, userId, patch);
}

export async function addDepositAction(deposit) {
  const userId = await requireUserId();
  return db.addDeposit(pool, userId, deposit);
}

export async function removeDepositAction(depositId) {
  const userId = await requireUserId();
  await db.removeDeposit(pool, userId, depositId);
}

export async function resetAllAction() {
  const userId = await requireUserId();
  const settings = await db.resetAll(pool, userId, DEFAULT_SETTINGS);
  return { settings: settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS };
}

export async function importDataAction(data) {
  const userId = await requireUserId();
  if (!data || !Array.isArray(data.trades)) {
    throw new Error("File doesn't look like a trading journal export.");
  }
  const result = await db.bulkImport(pool, userId, data);
  return {
    ...result,
    settings: result.settings ? { ...DEFAULT_SETTINGS, ...result.settings } : null,
  };
}
