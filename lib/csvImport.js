// Parses a Trading212 "Orders" history CSV export into this journal's trade
// shape. Trading212's export only includes columns that actually apply to
// the downloaded data (confirmed via their own community forum — column set
// and order varies by account currency and content), so this only requires
// the five columns present in every export that contains order history:
// Action, Time, Ticker, No. of shares, Price / share. Everything else
// (Result, Total, taxes, currency conversion fee, etc.) is ignored — this
// app computes its own P&L from entry/exit price and shares.
//
// This app's trade model has one entry price per trade (see app/new/page.js)
// — it has no concept of scaling into a position at multiple prices. So each
// buy fill becomes its own trade (its own thesis-less, stop-less "lot"), and
// each sell fill is matched FIFO against that ticker's still-open lots,
// recorded as an exit — exactly mirroring how a manually-logged trade's
// partial exits already work.

// Each entry lists every header name Trading212 is known to have used for
// that column — e.g. plain "Time" in some export versions, "Time (UTC)" in
// others. Matched in order; a prefix match is tried as a fallback so a
// currency/timezone suffix we haven't seen yet (e.g. a future "Time (GMT)")
// doesn't break the import the way an exact-only match just did.
const COLUMNS = {
  action: { label: "Action", names: ["action"] },
  time: { label: "Time", names: ["time (utc)", "time"] },
  ticker: { label: "Ticker", names: ["ticker"] },
  shares: { label: "No. of shares", names: ["no. of shares"] },
  price: { label: "Price / share", names: ["price / share"] },
};
const EPSILON = 1e-6; // tolerates float noise from fractional-share arithmetic

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Minimal RFC4180-ish CSV parser — handles quoted fields with embedded
// commas/newlines/escaped quotes, which a plain string.split(",") would break
// on (e.g. a company Name field like "Alphabet, Inc.").
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell !== ""));
}

function buildHeaderIndex(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => {
    map[h.trim().toLowerCase()] = i;
  });
  return map;
}

// Exact match against every known name for this column first, then a
// prefix match against whatever's actually in the file — this is what lets
// "Time (UTC)" satisfy a lookup for "time" without hardcoding every
// currency/timezone variant Trading212 might use.
function resolveColumn(header, names) {
  for (const name of names) {
    if (name in header) return header[name];
  }
  const prefixKey = Object.keys(header).find((h) => names.some((name) => h.startsWith(name)));
  return prefixKey !== undefined ? header[prefixKey] : undefined;
}

function newLot(ticker, date, price, shares) {
  return {
    id: uid(),
    ticker,
    thesis: "",
    understoodBusiness: false,
    entryDate: date,
    entryPrice: price,
    stopPrice: null,
    shares,
    sharesRemaining: shares,
    target1: null,
    target2: null,
    emotion: "Neutral",
    notes: "Imported from Trading212 CSV.",
    accountSizeAtEntry: null,
    maxPositionPercentAllowed: null,
    stopMovedAgainstPlan: false,
    status: "open",
    exits: [],
    tags: [],
  };
}

// Returns { trades, warnings }. Throws only if the file doesn't look like a
// Trading212 orders export at all (missing required columns) — anything
// row-level (an unparseable row, a sell that doesn't match a tracked buy)
// is collected into `warnings` instead, so one bad row doesn't block the
// whole import.
export function parseTrading212Csv(csvText) {
  // A leading UTF-8 BOM should already be stripped by FileReader/TextDecoder
  // per spec, but that's an assumption about the caller's environment this
  // module shouldn't have to trust — strip it explicitly so a raw BOM
  // character can never corrupt the first header's name.
  const cleanText = typeof csvText === "string" ? csvText.replace(/^﻿/, "") : csvText;

  const rows = parseCsvRows(cleanText);
  if (rows.length < 2) {
    throw new Error("This file doesn't have any data rows.");
  }

  const header = buildHeaderIndex(rows[0]);

  const actionIdx = resolveColumn(header, COLUMNS.action.names);
  const timeIdx = resolveColumn(header, COLUMNS.time.names);
  const tickerIdx = resolveColumn(header, COLUMNS.ticker.names);
  const sharesIdx = resolveColumn(header, COLUMNS.shares.names);
  const priceIdx = resolveColumn(header, COLUMNS.price.names);

  const resolved = { action: actionIdx, time: timeIdx, ticker: tickerIdx, shares: sharesIdx, price: priceIdx };
  const missing = Object.entries(resolved)
    .filter(([, idx]) => idx === undefined)
    .map(([key]) => COLUMNS[key].label);
  if (missing.length > 0) {
    throw new Error(
      `This doesn't look like a Trading212 orders export — missing column(s): ${missing.join(
        ", "
      )}. Make sure you exported "Orders" history (not Dividends or Transactions).`
    );
  }

  const fills = [];
  const warnings = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const action = (r[actionIdx] || "").trim().toLowerCase();
    const isBuy = action.includes("buy");
    const isSell = action.includes("sell");
    if (!isBuy && !isSell) continue; // dividends, deposits, interest, conversions, etc.

    const ticker = (r[tickerIdx] || "").trim().toUpperCase();
    const shares = parseFloat((r[sharesIdx] || "").replace(/,/g, ""));
    const price = parseFloat((r[priceIdx] || "").replace(/,/g, ""));
    const timeRaw = (r[timeIdx] || "").trim();
    const dateMatch = timeRaw.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : null;

    if (!ticker || !date || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(price) || price <= 0) {
      warnings.push(`Row ${i + 1}: couldn't parse a valid ticker/date/shares/price — skipped.`);
      continue;
    }

    fills.push({ action: isBuy ? "buy" : "sell", ticker, date, time: timeRaw, shares, price });
  }

  fills.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  const openLotsByTicker = new Map();

  for (const fill of fills) {
    if (!openLotsByTicker.has(fill.ticker)) openLotsByTicker.set(fill.ticker, []);
    const lots = openLotsByTicker.get(fill.ticker);

    if (fill.action === "buy") {
      lots.push(newLot(fill.ticker, fill.date, fill.price, fill.shares));
      continue;
    }

    let remainingToSell = fill.shares;
    for (const lot of lots) {
      if (remainingToSell <= EPSILON) break;
      if (lot.sharesRemaining <= EPSILON) continue;
      const take = Math.min(lot.sharesRemaining, remainingToSell);
      lot.exits.push({ id: uid(), date: fill.date, price: fill.price, shares: take, reason: "Imported from CSV" });
      lot.sharesRemaining -= take;
      remainingToSell -= take;
      if (lot.sharesRemaining <= EPSILON) lot.status = "closed";
    }

    if (remainingToSell > EPSILON) {
      warnings.push(
        `${fill.ticker}: sold ${remainingToSell} share(s) on ${fill.date} that couldn't be matched to a tracked buy ` +
          `(the position was likely opened before your export's date range) — not recorded.`
      );
    }
  }

  const trades = [];
  openLotsByTicker.forEach((lots) => {
    lots.forEach(({ sharesRemaining, ...trade }) => trades.push(trade));
  });
  trades.sort((a, b) => (a.entryDate < b.entryDate ? -1 : a.entryDate > b.entryDate ? 1 : 0));

  return { trades, warnings };
}