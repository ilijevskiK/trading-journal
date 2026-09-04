// Node-only — pure query/mapping functions, pool (or a transaction client
// with the same .query() interface) passed as the first argument, matching
// lib/allowlist.js's convention. No auth() calls here; contexts/tradesActions.js
// is the thin "use server" layer that checks the session and calls these.
//
// Every query here is scoped by user_id — in the old single-user
// localStorage world any id the client passed was implicitly "yours"; now a
// signed-in user could edit/delete another user's row by guessing a
// sequential integer id if this were omitted. Exits have no user_id column
// of their own, so ownership is enforced via a join/EXISTS against trades.

import { encrypt, decrypt } from "./crypto";

function n(v) {
  return v === null || v === undefined ? null : parseFloat(v);
}

export function mapTradeRow(row, exits = []) {
  return {
    id: row.id,
    ticker: row.ticker,
    thesis: row.thesis,
    understoodBusiness: row.understood_business,
    entryDate: row.entry_date,
    entryPrice: parseFloat(row.entry_price),
    stopPrice: n(row.stop_price),
    shares: parseFloat(row.shares),
    target1: n(row.target1),
    target2: n(row.target2),
    emotion: row.emotion,
    notes: row.notes,
    premortem: row.premortem,
    tags: row.tags || [],
    strategyId: row.strategy_id,
    accountSizeAtEntry: n(row.account_size_at_entry),
    maxPositionPercentAllowed: n(row.max_position_percent_allowed),
    stopMovedAgainstPlan: row.stop_moved_against_plan,
    status: row.status,
    exits,
  };
}

export function mapExitRow(row) {
  return {
    id: row.id,
    date: row.date,
    price: parseFloat(row.price),
    shares: parseFloat(row.shares),
    reason: row.reason,
  };
}

export function mapDepositRow(row) {
  return { id: row.id, date: row.date, amount: parseFloat(row.amount) };
}

export function mapSettingsRow(row) {
  return {
    accountSize: parseFloat(row.account_size),
    defaultRiskPercent: parseFloat(row.default_risk_percent),
    maxPositionPercentAllowed: parseFloat(row.max_position_percent_allowed),
    twelveDataApiKey: decrypt(row.twelve_data_api_key) || "",
    finnhubApiKey: decrypt(row.finnhub_api_key) || "",
  };
}

// Centralized here (not just in the client's old addTrade) so the
// CSV-import path gets identical defaults for free instead of duplicating
// this spread.
export function withTradeDefaults(trade) {
  return { premortem: "", strategyId: null, tags: [], ...trade };
}

const TRADE_COLUMNS = {
  ticker: "ticker",
  thesis: "thesis",
  understoodBusiness: "understood_business",
  entryDate: "entry_date",
  entryPrice: "entry_price",
  stopPrice: "stop_price",
  shares: "shares",
  target1: "target1",
  target2: "target2",
  emotion: "emotion",
  notes: "notes",
  premortem: "premortem",
  tags: "tags",
  strategyId: "strategy_id",
  accountSizeAtEntry: "account_size_at_entry",
  maxPositionPercentAllowed: "max_position_percent_allowed",
  stopMovedAgainstPlan: "stop_moved_against_plan",
  status: "status",
};

const SETTINGS_COLUMNS = {
  accountSize: "account_size",
  defaultRiskPercent: "default_risk_percent",
  maxPositionPercentAllowed: "max_position_percent_allowed",
  twelveDataApiKey: "twelve_data_api_key",
  finnhubApiKey: "finnhub_api_key",
};

// Encrypts the two API-key fields (if present) before they ever reach a
// SET clause or INSERT — every write path that can touch these columns
// (updateSettings, bulkImport's settings patch, and app/onboarding/actions.js's
// separate upsert) has to call this or its own encrypt() before writing.
function encryptSettingsPatch(patch) {
  const next = { ...patch };
  if ("twelveDataApiKey" in next) next.twelveDataApiKey = encrypt(next.twelveDataApiKey);
  if ("finnhubApiKey" in next) next.finnhubApiKey = encrypt(next.finnhubApiKey);
  return next;
}

// Builds a parameterized "col = $n, col2 = $n+1" fragment only from keys
// actually present in `patch` — used by updateTrade/updateSettings so a
// partial patch only touches the columns it actually mentions. `tags` has
// to be JSON.stringify'd — pg does not auto-serialize JS arrays for jsonb
// params.
function buildSetClause(patch, columnMap, startIndex = 1) {
  const fragments = [];
  const params = [];
  let i = startIndex;
  for (const key of Object.keys(patch)) {
    const column = columnMap[key];
    if (!column) continue;
    const value = key === "tags" ? JSON.stringify(patch[key] || []) : patch[key];
    fragments.push(`${column} = $${i}`);
    params.push(value);
    i++;
  }
  return { setSql: fragments.join(", "), params, nextIndex: i };
}

// pool.query('BEGIN') followed by more pool.query(...) calls is a classic
// bug — each call can land on a different pooled connection, so the
// transaction silently does nothing. This grabs one dedicated connection
// for the whole transaction instead.
async function withTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getInitialData(pool, userId) {
  const [tradesRes, exitsRes, depositsRes, settingsRes] = await Promise.all([
    pool.query("SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
    pool.query(
      `SELECT e.* FROM exits e JOIN trades t ON t.id = e.trade_id
       WHERE t.user_id = $1 ORDER BY e.trade_id, e.date, e.id`,
      [userId]
    ),
    pool.query("SELECT * FROM deposits WHERE user_id = $1 ORDER BY date DESC, id DESC", [userId]),
    pool.query("SELECT * FROM user_settings WHERE user_id = $1", [userId]),
  ]);

  const exitsByTradeId = new Map();
  exitsRes.rows.forEach((row) => {
    if (!exitsByTradeId.has(row.trade_id)) exitsByTradeId.set(row.trade_id, []);
    exitsByTradeId.get(row.trade_id).push(mapExitRow(row));
  });

  const trades = tradesRes.rows.map((row) => mapTradeRow(row, exitsByTradeId.get(row.id) || []));
  const deposits = depositsRes.rows.map(mapDepositRow);
  const settings = settingsRes.rows[0] ? mapSettingsRow(settingsRes.rows[0]) : null;

  return { trades, deposits, settings };
}

async function insertTradeRow(client, userId, trade) {
  const t = withTradeDefaults(trade);
  const { rows } = await client.query(
    `INSERT INTO trades
       (user_id, ticker, thesis, understood_business, entry_date, entry_price, stop_price,
        shares, target1, target2, emotion, notes, premortem, tags, strategy_id,
        account_size_at_entry, max_position_percent_allowed, stop_moved_against_plan, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      userId,
      t.ticker,
      t.thesis,
      t.understoodBusiness,
      t.entryDate,
      t.entryPrice,
      t.stopPrice,
      t.shares,
      t.target1,
      t.target2,
      t.emotion,
      t.notes,
      t.premortem,
      JSON.stringify(t.tags || []),
      t.strategyId,
      t.accountSizeAtEntry,
      t.maxPositionPercentAllowed,
      t.stopMovedAgainstPlan,
      t.status || "open",
    ]
  );
  return rows[0];
}

export async function insertTrade(pool, userId, trade) {
  const row = await insertTradeRow(pool, userId, trade);
  return mapTradeRow(row, []);
}

export async function updateTrade(pool, userId, tradeId, patch) {
  const { setSql, params, nextIndex } = buildSetClause(patch, TRADE_COLUMNS, 1);
  if (!setSql) return null;
  const { rows } = await pool.query(
    `UPDATE trades SET ${setSql}, updated_at = now()
     WHERE id = $${nextIndex} AND user_id = $${nextIndex + 1}
     RETURNING *`,
    [...params, tradeId, userId]
  );
  if (!rows[0]) return null;
  const exitsRes = await pool.query("SELECT * FROM exits WHERE trade_id = $1 ORDER BY date, id", [
    tradeId,
  ]);
  return mapTradeRow(rows[0], exitsRes.rows.map(mapExitRow));
}

export async function deleteTrade(pool, userId, tradeId) {
  await pool.query("DELETE FROM trades WHERE id = $1 AND user_id = $2", [tradeId, userId]);
}

async function insertExitRow(client, tradeId, exit, userId) {
  const { rows } = await client.query(
    `INSERT INTO exits (trade_id, date, price, shares, reason)
     SELECT t.id, $2, $3, $4, $5 FROM trades t WHERE t.id = $1 AND t.user_id = $6
     RETURNING *`,
    [tradeId, exit.date, exit.price, exit.shares, exit.reason || "", userId]
  );
  return rows[0];
}

export async function addExit(pool, userId, tradeId, exit) {
  const row = await insertExitRow(pool, tradeId, exit, userId);
  if (!row) throw new Error("Trade not found.");
  return mapExitRow(row);
}

export async function removeExit(pool, userId, tradeId, exitId) {
  await pool.query(
    `DELETE FROM exits e
     WHERE e.id = $1 AND e.trade_id = $2
       AND EXISTS (SELECT 1 FROM trades t WHERE t.id = e.trade_id AND t.user_id = $3)`,
    [exitId, tradeId, userId]
  );
}

export async function updateSettings(pool, userId, patch) {
  const { setSql, params, nextIndex } = buildSetClause(
    encryptSettingsPatch(patch),
    SETTINGS_COLUMNS,
    1
  );
  if (!setSql) return null;
  // Safe as a plain UPDATE, not an upsert: the onboarding gate (Phase 3.3)
  // guarantees every user reaching Settings already has a user_settings
  // row — the "row might not exist yet" failure mode that bit onboarding
  // doesn't apply here.
  const { rows } = await pool.query(
    `UPDATE user_settings SET ${setSql}, updated_at = now() WHERE user_id = $${nextIndex} RETURNING *`,
    [...params, userId]
  );
  return rows[0] ? mapSettingsRow(rows[0]) : null;
}

async function insertDepositRow(client, userId, deposit) {
  const { rows } = await client.query(
    "INSERT INTO deposits (user_id, date, amount) VALUES ($1, $2, $3) RETURNING *",
    [userId, deposit.date, deposit.amount]
  );
  return rows[0];
}

export async function addDeposit(pool, userId, deposit) {
  return mapDepositRow(await insertDepositRow(pool, userId, deposit));
}

export async function removeDeposit(pool, userId, depositId) {
  await pool.query("DELETE FROM deposits WHERE id = $1 AND user_id = $2", [depositId, userId]);
}

// Deletes trades (cascades to exits) and deposits, resets user_settings
// columns to the app's real defaults — but deliberately leaves
// onboarding_completed untouched, since resetting trading data shouldn't
// route someone back through onboarding. Uses the JS DEFAULT_SETTINGS
// constants, not the SQL table's own column defaults (db/0002_app_tables.sql
// defaults account_size to 0, not this app's real default of 10000).
export async function resetAll(pool, userId, defaults) {
  return withTransaction(pool, async (client) => {
    await client.query("DELETE FROM trades WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM deposits WHERE user_id = $1", [userId]);
    const { rows } = await client.query(
      `UPDATE user_settings SET
         account_size = $2, default_risk_percent = $3, max_position_percent_allowed = $4,
         twelve_data_api_key = $5, finnhub_api_key = $6, updated_at = now()
       WHERE user_id = $1
       RETURNING *`,
      [
        userId,
        defaults.accountSize,
        defaults.defaultRiskPercent,
        defaults.maxPositionPercentAllowed,
        encrypt(defaults.twelveDataApiKey),
        encrypt(defaults.finnhubApiKey),
      ]
    );
    return rows[0] ? mapSettingsRow(rows[0]) : null;
  });
}

// No id-based dedup (Postgres assigns its own ids now) and deliberately no
// content-based dedup either — see ROADMAP.md Phase 3.4 for why a unique
// constraint would wrongly reject legitimate same-day, same-price scale-in
// lots. Running this twice with the same data will duplicate everything;
// the safety net is at the UI layer (confirm + disable-while-in-flight in
// app/settings/page.js), not here.
export async function bulkImport(pool, userId, { trades = [], deposits = [], settings = null }) {
  return withTransaction(pool, async (client) => {
    const insertedTrades = [];
    for (const trade of trades) {
      const row = await insertTradeRow(client, userId, trade);
      const exitRows = [];
      for (const exit of trade.exits || []) {
        const exitRow = await insertExitRow(client, row.id, exit, userId);
        exitRows.push(mapExitRow(exitRow));
      }
      insertedTrades.push(mapTradeRow(row, exitRows));
    }

    const insertedDeposits = [];
    for (const deposit of deposits) {
      insertedDeposits.push(mapDepositRow(await insertDepositRow(client, userId, deposit)));
    }

    let updatedSettings = null;
    if (settings && typeof settings === "object") {
      const { setSql, params, nextIndex } = buildSetClause(
        encryptSettingsPatch(settings),
        SETTINGS_COLUMNS,
        1
      );
      if (setSql) {
        const { rows } = await client.query(
          `UPDATE user_settings SET ${setSql}, updated_at = now() WHERE user_id = $${nextIndex} RETURNING *`,
          [...params, userId]
        );
        updatedSettings = rows[0] ? mapSettingsRow(rows[0]) : null;
      }
    }

    return { trades: insertedTrades, deposits: insertedDeposits, settings: updatedSettings };
  });
}
