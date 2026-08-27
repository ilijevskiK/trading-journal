"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const TRADES_KEY = "tj_trades_v1";
const SETTINGS_KEY = "tj_settings_v1";
const DEPOSITS_KEY = "tj_deposits_v1";

const DEFAULT_SETTINGS = {
  accountSize: 10000,
  defaultRiskPercent: 1.5,
  maxPositionPercentAllowed: 20,
  twelveDataApiKey: "",
  finnhubApiKey: "",
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const TradesContext = createContext(null);

export function TradesProvider({ children }) {
  const [trades, setTrades] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [deposits, setDeposits] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const rawTrades = window.localStorage.getItem(TRADES_KEY);
      const rawSettings = window.localStorage.getItem(SETTINGS_KEY);
      const rawDeposits = window.localStorage.getItem(DEPOSITS_KEY);
      if (rawTrades) setTrades(JSON.parse(rawTrades));
      if (rawSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
      if (rawDeposits) setDeposits(JSON.parse(rawDeposits));
    } catch (e) {
      console.error("Failed to load journal data from localStorage", e);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
    } catch (e) {
      console.error("Failed to save trades", e);
    }
  }, [trades, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  }, [settings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(DEPOSITS_KEY, JSON.stringify(deposits));
    } catch (e) {
      console.error("Failed to save deposits", e);
    }
  }, [deposits, loaded]);

  const addTrade = useCallback((trade) => {
    const newTrade = {
      id: uid(),
      exits: [],
      tags: [],
      premortem: "",
      strategyId: null,
      ...trade,
    };
    setTrades((prev) => [newTrade, ...prev]);
    return newTrade.id;
  }, []);

  const updateTrade = useCallback((id, patch) => {
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTrade = useCallback((id) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addExit = useCallback((id, exit) => {
    setTrades((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, exits: [...(t.exits || []), { id: uid(), ...exit }] }
          : t
      )
    );
  }, []);

  const removeExit = useCallback((tradeId, exitId) => {
    setTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId
          ? { ...t, exits: (t.exits || []).filter((e) => e.id !== exitId) }
          : t
      )
    );
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // Deposits are kept separate from `settings.accountSize` — that field
  // stays the original starting size, and each deposit is its own dated
  // record, so the equity curve can show *when* capital was added instead
  // of just silently inflating a single number (see lib/calc.js's
  // currentAccountSize/computeEquityCurve for where these get combined).
  const addDeposit = useCallback((deposit) => {
    const newDeposit = { id: uid(), ...deposit };
    setDeposits((prev) => [newDeposit, ...prev]);
    return newDeposit.id;
  }, []);

  const removeDeposit = useCallback((id) => {
    setDeposits((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setTrades([]);
    setSettings(DEFAULT_SETTINGS);
    setDeposits([]);
  }, []);

  const importData = useCallback((data) => {
    if (!data || !Array.isArray(data.trades)) {
      throw new Error("File doesn't look like a trading journal export.");
    }
    let addedCount = 0;
    setTrades((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const incoming = data.trades.filter((t) => t && t.id && !existingIds.has(t.id));
      addedCount = incoming.length;
      return [...incoming, ...prev];
    });
    if (Array.isArray(data.deposits)) {
      setDeposits((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const incoming = data.deposits.filter((d) => d && d.id && !existingIds.has(d.id));
        return [...incoming, ...prev];
      });
    }
    if (data.settings && typeof data.settings === "object") {
      setSettings((prev) => ({ ...prev, ...data.settings }));
    }
    return addedCount;
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
