// Storage for company SIC codes and the daily group rankings
// (db/0009_industries.sql).

import { groupByKey, makeResolver, rankGroups } from "./industries.js";

const KEEP_DAYS = 400;

// Every ticker that already has a row (even one with no SIC), as a Set.
export async function getClassifiedTickers(pool) {
  const { rows } = await pool.query("SELECT ticker FROM stock_industries");
  return new Set(rows.map((r) => r.ticker));
}

export async function saveIndustries(pool, tickers, sic, description) {
  await pool.query(
    `INSERT INTO stock_industries (ticker, sic, sic_description)
     SELECT t, $2, $3 FROM unnest($1::text[]) AS t
     ON CONFLICT (ticker) DO UPDATE SET sic = EXCLUDED.sic,
       sic_description = EXCLUDED.sic_description, updated_at = now()`,
    [tickers, sic, description]
  );
}

// Map(ticker -> sic) for the stocks that have one.
export async function getSicMap(pool) {
  const { rows } = await pool.query("SELECT ticker, sic FROM stock_industries WHERE sic IS NOT NULL");
  return new Map(rows.map((r) => [r.ticker, r.sic]));
}

// Map(ticker -> group name) from the AI classification (db/0010_stock_groups.sql).
export async function getAssignments(pool) {
  const { rows } = await pool.query("SELECT ticker, group_name FROM stock_groups");
  return new Map(rows.map((r) => [r.ticker, r.group_name]));
}

export async function saveAssignments(pool, tickers, groupNames) {
  await pool.query(
    `INSERT INTO stock_groups (ticker, group_name)
     SELECT * FROM unnest($1::text[], $2::text[])
     ON CONFLICT (ticker) DO UPDATE SET group_name = EXCLUDED.group_name, updated_at = now()`,
    [tickers, groupNames]
  );
}

// How tickers are grouped right now: the AI assignments if any are loaded,
// otherwise the SIC tables.
export async function loadResolver(pool) {
  const [assignments, sicByTicker] = await Promise.all([getAssignments(pool).catch(() => new Map()), getSicMap(pool)]);
  return makeResolver({ assignments, sicByTicker });
}

// Tickers in the most recent RS ranking: the stocks worth classifying.
export async function getLatestRatedTickers(pool) {
  const { rows } = await pool.query(
    "SELECT ticker FROM rs_ratings WHERE as_of = (SELECT max(as_of) FROM rs_runs)"
  );
  return rows.map((r) => r.ticker);
}

// RS run dates that have no group ranking yet, oldest first (or every
// date with `all`, to rank again after the grouping rules changed).
export async function getUnrankedDates(pool, { all = false } = {}) {
  const { rows } = await pool.query(
    `SELECT as_of FROM rs_runs
     ${all ? "" : "WHERE as_of NOT IN (SELECT DISTINCT as_of FROM group_rankings)"} ORDER BY as_of`
  );
  return rows.map((r) => r.as_of);
}

export async function saveGroupRanking(client, asOf, ranked) {
  await client.query("BEGIN");
  try {
    await client.query("DELETE FROM group_rankings WHERE as_of = $1", [asOf]);
    await client.query(
      `INSERT INTO group_rankings (as_of, group_key, rank, members, median_score, median_rating)
       SELECT $1, * FROM unnest($2::text[], $3::smallint[], $4::smallint[], $5::numeric[], $6::smallint[])`,
      [
        asOf,
        ranked.map((g) => g.key),
        ranked.map((g) => g.rank),
        ranked.map((g) => g.members),
        ranked.map((g) => g.medianScore),
        ranked.map((g) => g.medianRating),
      ]
    );
    await client.query("DELETE FROM group_rankings WHERE as_of < $1::date - $2::int", [asOf, KEEP_DAYS]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

// Ranks the groups for one RS run date from its stored ratings, saves the
// ranking, and returns it.
export async function rankAndSaveDate(pool, asOf, resolve) {
  const { rows } = await pool.query("SELECT ticker, score, rating FROM rs_ratings WHERE as_of = $1", [asOf]);
  const ranked = rankGroups(rows, resolve);
  const client = await pool.connect();
  try {
    await saveGroupRanking(client, asOf, ranked);
  } finally {
    client.release();
  }
  return ranked;
}

const WEEK_AGO = 5; // trading days back
const QUARTER_AGO = 63;
const TOP_STOCKS = 5;

// The latest ranking, best group first. Each group carries its rank a week
// and a quarter ago (null when there's no ranking that far back, or it
// wasn't ranked then) and its best-rated stocks. Null before the first run.
export async function getLatestGroups(pool) {
  const { rows: dates } = await pool.query(
    "SELECT DISTINCT as_of FROM group_rankings ORDER BY as_of DESC LIMIT $1",
    [QUARTER_AGO + 1]
  );
  if (!dates.length) return null;
  const asOf = dates[0].as_of;
  const weekDate = dates[WEEK_AGO]?.as_of ?? null;
  const quarterDate = dates[QUARTER_AGO]?.as_of ?? null;

  const { rows } = await pool.query(
    `SELECT as_of, group_key, rank, members, median_rating FROM group_rankings
     WHERE as_of = ANY($1::date[])`,
    [[asOf, weekDate, quarterDate].filter(Boolean)]
  );
  const rankAt = (date) => new Map(rows.filter((r) => r.as_of === date).map((r) => [r.group_key, r.rank]));
  const weekRanks = weekDate ? rankAt(weekDate) : new Map();
  const quarterRanks = quarterDate ? rankAt(quarterDate) : new Map();

  // Best-rated stocks per group, from the same day's ratings.
  const { resolve } = await loadResolver(pool);
  const { rows: stocks } = await pool.query("SELECT ticker, rating FROM rs_ratings WHERE as_of = $1 ORDER BY score DESC", [asOf]);
  const top = new Map();
  for (const s of stocks) {
    const g = resolve(s.ticker);
    if (!g) continue;
    if (!top.has(g.key)) top.set(g.key, []);
    if (top.get(g.key).length < TOP_STOCKS) top.get(g.key).push({ ticker: s.ticker, rating: s.rating });
  }

  const groups = rows
    .filter((r) => r.as_of === asOf)
    .map((r) => {
      const g = groupByKey(r.group_key);
      return {
        key: r.group_key,
        name: g?.name ?? r.group_key,
        sector: g?.sector ?? "Other",
        rank: r.rank,
        members: r.members,
        medianRating: r.median_rating,
        rankWeekAgo: weekRanks.get(r.group_key) ?? null,
        rankQuarterAgo: quarterRanks.get(r.group_key) ?? null,
        topStocks: top.get(r.group_key) ?? [],
      };
    })
    .sort((a, b) => a.rank - b.rank);
  return { asOf, groups };
}

// Map(ticker -> { name, rank, total }) for the given tickers, from the
// latest group ranking: the group each is in and how that group ranks.
// Tickers whose group isn't ranked (too few stocks, none assigned) are left out.
export async function getGroupsForTickers(pool, tickers) {
  const { rows: latest } = await pool.query("SELECT max(as_of) AS as_of FROM group_rankings");
  if (!latest[0]?.as_of) return new Map();
  const { rows } = await pool.query("SELECT group_key, rank FROM group_rankings WHERE as_of = $1", [latest[0].as_of]);
  const rankByKey = new Map(rows.map((r) => [r.group_key, r.rank]));
  const { resolve } = await loadResolver(pool);
  const result = new Map();
  for (const ticker of tickers) {
    const group = resolve(ticker);
    const rank = group && rankByKey.get(group.key);
    if (rank) result.set(ticker, { name: group.name, rank, total: rows.length });
  }
  return result;
}
