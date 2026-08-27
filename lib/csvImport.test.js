import { describe, it, expect } from "vitest";
import { parseTrading212Csv } from "./csvImport";

describe("parseTrading212Csv", () => {
  it("throws when the file has no data rows", () => {
    expect(() => parseTrading212Csv("Action,Time,Ticker,No. of shares,Price / share\n")).toThrow(
      /doesn't have any data rows/
    );
  });

  it("throws when a required column is missing", () => {
    const csv = "Action,Time,Ticker\nBuy,2026-01-05 10:00:00,AAPL\n";
    expect(() => parseTrading212Csv(csv)).toThrow(/missing column/);
  });

  it("strips a leading UTF-8 BOM before parsing headers", () => {
    const csv =
      "﻿Action,Time,Ticker,No. of shares,Price / share\n" +
      "Market buy,2026-01-05 10:00:00,AAPL,10,100\n";
    const { trades } = parseTrading212Csv(csv);
    expect(trades).toHaveLength(1);
    expect(trades[0].ticker).toBe("AAPL");
  });

  it("accepts a 'Time (UTC)' header as a variant of 'Time'", () => {
    const csv =
      "Action,Time (UTC),Ticker,No. of shares,Price / share\n" +
      "Market buy,2026-01-05 10:00:00,AAPL,10,100\n";
    const { trades } = parseTrading212Csv(csv);
    expect(trades).toHaveLength(1);
    expect(trades[0].entryDate).toBe("2026-01-05");
  });

  it("handles quoted fields with embedded commas", () => {
    const csv =
      'Action,Time,Ticker,Name,No. of shares,Price / share\n' +
      'Market buy,2026-01-05 10:00:00,BRK.B,"Berkshire, Hathaway Inc",10,100\n';
    const { trades } = parseTrading212Csv(csv);
    expect(trades).toHaveLength(1);
    expect(trades[0].ticker).toBe("BRK.B");
  });

  it("turns a simple buy into one open trade with no exits", () => {
    const csv =
      "Action,Time,Ticker,No. of shares,Price / share\n" +
      "Market buy,2026-01-05 10:00:00,AAPL,10,100\n";
    const { trades, warnings } = parseTrading212Csv(csv);
    expect(warnings).toHaveLength(0);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      ticker: "AAPL",
      entryPrice: 100,
      shares: 10,
      status: "open",
      exits: [],
    });
  });

  it("matches a full sell FIFO against a single buy and closes the trade", () => {
    const csv =
      "Action,Time,Ticker,No. of shares,Price / share\n" +
      "Market buy,2026-01-05 10:00:00,AAPL,10,100\n" +
      "Market sell,2026-01-10 10:00:00,AAPL,10,120\n";
    const { trades, warnings } = parseTrading212Csv(csv);
    expect(warnings).toHaveLength(0);
    expect(trades).toHaveLength(1);
    expect(trades[0].status).toBe("closed");
    expect(trades[0].exits).toEqual([
      expect.objectContaining({ date: "2026-01-10", price: 120, shares: 10 }),
    ]);
  });

  it("matches a partial sell against the oldest lot first (FIFO)", () => {
    const csv =
      "Action,Time,Ticker,No. of shares,Price / share\n" +
      "Market buy,2026-01-01 10:00:00,AAPL,10,100\n" +
      "Market buy,2026-01-02 10:00:00,AAPL,10,110\n" +
      "Market sell,2026-01-10 10:00:00,AAPL,12,120\n";
    const { trades, warnings } = parseTrading212Csv(csv);
    expect(warnings).toHaveLength(0);
    const [lot1, lot2] = trades.sort((a, b) => (a.entryDate < b.entryDate ? -1 : 1));
    // first lot (10 shares @ 100) should be fully exited
    expect(lot1.status).toBe("closed");
    expect(lot1.exits[0].shares).toBe(10);
    // second lot (10 shares @ 110) should have only 2 shares exited, still open
    expect(lot2.status).toBe("open");
    expect(lot2.exits[0].shares).toBe(2);
  });

  it("warns instead of throwing when a sell can't be matched to a tracked buy", () => {
    const csv =
      "Action,Time,Ticker,No. of shares,Price / share\n" +
      "Market sell,2026-01-10 10:00:00,AAPL,10,120\n";
    const { trades, warnings } = parseTrading212Csv(csv);
    expect(trades).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/couldn't be matched/);
  });

  it("skips unparseable rows with a warning instead of failing the whole import", () => {
    const csv =
      "Action,Time,Ticker,No. of shares,Price / share\n" +
      "Market buy,2026-01-05 10:00:00,AAPL,notanumber,100\n" +
      "Market buy,2026-01-06 10:00:00,MSFT,10,200\n";
    const { trades, warnings } = parseTrading212Csv(csv);
    expect(trades).toHaveLength(1);
    expect(trades[0].ticker).toBe("MSFT");
    expect(warnings).toHaveLength(1);
  });

  it("ignores non-buy/sell rows like dividends", () => {
    const csv =
      "Action,Time,Ticker,No. of shares,Price / share\n" +
      "Dividend,2026-01-05 10:00:00,AAPL,,\n" +
      "Market buy,2026-01-06 10:00:00,AAPL,10,100\n";
    const { trades } = parseTrading212Csv(csv);
    expect(trades).toHaveLength(1);
  });
});
