"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DEFAULT_SETTINGS } from "@/lib/settingsDefaults";
import {
  getInitialDataAction,
  addTradeAction,
  updateTradeAction,
  deleteTradeAction,
  addExitAction,
  removeExitAction,
  updateSettingsAction,
  addDepositAction,
  removeDepositAction,
  resetAllAction,
  importDataAction,
} from "./tradesActions";

const TradesContext = createContext(null);

export function TradesProvider({ children }) {
  const [trades, setTrades] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [deposits, setDeposits] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getInitialDataAction()
      .then(({ trades, settings, deposits }) => {
        setTrades(trades);
        setSettings(settings || DEFAULT_SETTINGS);
        setDeposits(deposits);
      })
      .catch((e) => {
        console.error("Failed to load journal data", e);
      })
      .finally(() => setLoaded(true));
  }, []);

  const addTrade = useCallback(async (trade) => {
    const newTrade = await addTradeAction(trade);
    setTrades((prev) => [newTrade, ...prev]);
    return newTrade.id;
  }, []);

  const updateTrade = useCallback(async (id, patch) => {
    const updated = await updateTradeAction(id, patch);
    if (updated) setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const deleteTrade = useCallback(async (id) => {
    await deleteTradeAction(id);
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addExit = useCallback(async (id, exit) => {
    const newExit = await addExitAction(id, exit);
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exits: [...(t.exits || []), newExit] } : t))
    );
  }, []);

  const removeExit = useCallback(async (tradeId, exitId) => {
    await removeExitAction(tradeId, exitId);
    setTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId ? { ...t, exits: (t.exits || []).filter((e) => e.id !== exitId) } : t
      )
    );
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const updated = await updateSettingsAction(patch);
    if (updated) setSettings(updated);
    return updated;
  }, []);

  // Deposits are kept separate from `settings.accountSize` — that field
  // stays the original starting size, and each deposit is its own dated
  // record, so the equity curve can show *when* capital was added instead
  // of just silently inflating a single number (see lib/calc.js's
  // currentAccountSize/computeEquityCurve for where these get combined).
  const addDeposit = useCallback(async (deposit) => {
    const newDeposit = await addDepositAction(deposit);
    setDeposits((prev) => [newDeposit, ...prev]);
    return newDeposit.id;
  }, []);

  const removeDeposit = useCallback(async (id) => {
    await removeDepositAction(id);
    setDeposits((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const resetAll = useCallback(async () => {
    const { settings: resetSettings } = await resetAllAction();
    setTrades([]);
    setDeposits([]);
    setSettings(resetSettings);
  }, []);

  // No id-based dedup — Postgres assigns its own ids, so the old
  // "skip trades whose id already exists" check no longer means anything.
  // Running the same import twice will duplicate everything; see
  // app/settings/page.js for the confirm-before-import UI safety net.
  const importData = useCallback(async (data) => {
    const result = await importDataAction(data);
    setTrades((prev) => [...result.trades, ...prev]);
    if (result.deposits.length > 0) {
      setDeposits((prev) => [...result.deposits, ...prev]);
    }
    if (result.settings) setSettings(result.settings);
    return result.trades.length;
  }, []);

  return (
    <TradesContext.Provider
      value={{
        trades,
        settings,
        deposits,
        loaded,
        addTrade,
        updateTrade,
        deleteTrade,
        addExit,
        removeExit,
        updateSettings,
        addDeposit,
        removeDeposit,
        resetAll,
        importData,
      }}
    >
      {children}
    </TradesContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradesContext);
  if (!ctx) throw new Error("useTrades must be used within TradesProvider");
  return ctx;
}
