import { describe, it, expect, vi } from "vitest";
import {
  mapTradeRow,
  mapExitRow,
  mapDepositRow,
  mapSettingsRow,
  withTradeDefaults,
  updateTrade,
  updateSettings,
} from "./tradesDb";

describe("mapTradeRow", () => {
  it("coerces numeric columns from strings and passes non-numeric fields through", () => {
    const row = {
      id: 1,
      ticker: "AAPL",
      thesis: "Breakout",
      understood_business: true,
      entry_date: "2026-01-06",
      entry_price: "100.50",
      stop_price: "90.00",
      shares: "10",
      target1: "120",
      target2: null,
      emotion: "Confident",
      notes: "",
      premortem: "",
      tags: ["earnings"],
      strategy_id: "stage-analysis",
      account_size_at_entry: "10000",
      max_position_percent_allowed: "20",
      stop_moved_against_plan: false,
      status: "open",
    };
    const trade = mapTradeRow(row, []);
    expect(trade.entryPrice).toBe(100.5);
    expect(trade.stopPrice).toBe(90);
    expect(trade.shares).toBe(10);
    expect(trade.target1).toBe(120);
    expect(trade.target2).toBeNull();
    expect(trade.strategyId).toBe("stage-analysis");
    expect(trade.tags).toEqual(["earnings"]);
  });

  it("defaults tags to an empty array when the row has none", () => {
    const trade = mapTradeRow({ id: 1, tags: null, entry_price: "1", shares: "1" }, []);
    expect(trade.tags).toEqual([]);
  });

  it("attaches the given exits array as-is", () => {
    const exits = [{ id: 1, date: "2026-01-10", price: 110, shares: 5, reason: "Target hit" }];
    const trade = mapTradeRow({ id: 1, entry_price: "1", shares: "1" }, exits);
    expect(trade.exits).toBe(exits);
  });
});

describe("mapExitRow / mapDepositRow / mapSettingsRow", () => {
  it("coerces exit numeric columns", () => {
    const exit = mapExitRow({ id: 1, date: "2026-01-10", price: "110.25", shares: "5", reason: "Target hit" });
    expect(exit.price).toBe(110.25);
    expect(exit.shares).toBe(5);
  });

  it("coerces deposit amount", () => {
    const deposit = mapDepositRow({ id: 1, date: "2026-01-01", amount: "500.5" });
    expect(deposit.amount).toBe(500.5);
  });

  it("coerces settings numerics and falls back empty strings for missing keys", () => {
    const settings = mapSettingsRow({
      account_size: "10000",
      default_risk_percent: "1.5",
      max_position_percent_allowed: "20",
      twelve_data_api_key: null,
      finnhub_api_key: null,
    });
    expect(settings.accountSize).toBe(10000);
    expect(settings.twelveDataApiKey).toBe("");
    expect(settings.finnhubApiKey).toBe("");
  });
});

describe("withTradeDefaults", () => {
  it("fills premortem/strategyId/tags only when absent", () => {
    expect(withTradeDefaults({ ticker: "AAPL" })).toMatchObject({
      premortem: "",
      strategyId: null,
      tags: [],
    });
    expect(withTradeDefaults({ ticker: "AAPL", tags: ["x"] }).tags).toEqual(["x"]);
  });
});

function makePool(rows) {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

describe("updateTrade", () => {
  it("builds a SET clause only from the given patch keys, scoped by trade id and user id", async () => {
    const pool = makePool([
      { id: 1, ticker: "AAPL", entry_price: "1", shares: "1", tags: [] },
    ]);
    await updateTrade(pool, 42, 1, { status: "closed", tags: ["reviewed"] });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("status = $1");
    expect(sql).toContain("tags = $2");
    expect(sql).toContain("WHERE id = $3 AND user_id = $4");
    expect(params).toEqual(["closed", JSON.stringify(["reviewed"]), 1, 42]);
  });

  it("returns null without querying when the patch is empty", async () => {
    const pool = makePool([]);
    const result = await updateTrade(pool, 42, 1, {});
    expect(result).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe("updateSettings", () => {
  it("builds a SET clause scoped by user id", async () => {
    const pool = makePool([
      {
        account_size: "5000",
        default_risk_percent: "1",
        max_position_percent_allowed: "10",
        twelve_data_api_key: "abc",
        finnhub_api_key: null,
      },
    ]);
    await updateSettings(pool, 7, { accountSize: 5000 });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("account_size = $1");
    expect(sql).toContain("WHERE user_id = $2");
    expect(params).toEqual([5000, 7]);
  });
});
