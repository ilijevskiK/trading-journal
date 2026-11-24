"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getGroupsAction } from "@/contexts/industriesActions";
import { formatDate } from "@/components/canslim/LetterSection";
import { LEADING_GROUP_RANKS, MIN_GROUP_MEMBERS } from "@/lib/industries";
import { TAXONOMY, allTaxonomyGroups } from "@/lib/industryTaxonomy";

const STALE_AFTER_DAYS = 4;
const LEADING = LEADING_GROUP_RANKS;

// How a rank moved: positive = climbed. Null when there's nothing to compare.
function climb(now, before) {
  return before == null ? null : before - now;
}

function Change({ now, before }) {
  const d = climb(now, before);
  if (d === null) return <span className="text-parchment-faint">—</span>;
  if (d === 0) return <span className="text-parchment-faint">0</span>;
  return <span className={d > 0 ? "text-gain-bright" : "text-loss-bright"}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>;
}

export default function LeadingGroupsPage() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [selected, setSelected] = useState(() => new Set()); // chosen sectors; none chosen = all

  useEffect(() => {
    getGroupsAction()
      .then((res) => setState({ loading: false, data: res.error ? null : res, error: res.error ?? null }))
      .catch(() => setState({ loading: false, data: null, error: "Couldn't load the group ranking." }));
  }, []);

  const groups = state.data?.groups ?? [];
  // Each sector with how many ranked groups it has and its best group's rank.
  const sectors = useMemo(() => {
    const bySector = new Map();
    for (const g of groups) {
      const s = bySector.get(g.sector) ?? { name: g.sector, groups: 0, best: Infinity };
      s.groups++;
      s.best = Math.min(s.best, g.rank);
      bySector.set(g.sector, s);
    }
    return [...bySector.values()].sort((a, b) => a.best - b.best);
  }, [groups]);
  const shown = useMemo(() => groups.filter((g) => !selected.size || selected.has(g.sector)), [groups, selected]);

  const toggleSector = (name) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next.size === sectors.length ? new Set() : next; // every sector chosen is the same as all
    });
  const ageDays = state.data?.asOf ? (Date.now() - new Date(`${state.data.asOf}T00:00:00`).getTime()) / 86_400_000 : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/strategies" className="text-xs text-parchment-faint hover:text-parchment">
        ← CAN SLIM
      </Link>
      <h1 className="font-display text-3xl text-parchment mt-3">Leading Groups</h1>
      <p className="text-xs text-parchment-faint mt-2 max-w-2xl">
        O&apos;Neil: about three quarters of a stock&apos;s move comes from its industry group, so look for leaders
        inside the groups that are leading. Each group is ranked by the <em>median</em> RS score of its stocks,
        so one runaway stock can&apos;t carry a small group. The groups are this app&apos;s own, in the style of
        Investor&apos;s Business Daily&apos;s 197, so expect similar leaders but not the same list.
      </p>
      <HowItWorks />
      <div className="rule-divider mt-4 mb-6" />

      {state.loading && <p className="text-sm text-parchment-faint">Loading the group ranking…</p>}
      {state.error && <p className="text-sm text-loss-bright">{state.error}</p>}
      {state.data?.notRun && (
        <p className="text-sm text-parchment-dim max-w-2xl">
          The groups haven&apos;t been ranked yet. Run <code>npm run industries</code> once the screener has built
          the RS Ratings.
        </p>
      )}

      {state.data?.groups && (
        <>
          <p className={`text-xs ${ageDays > STALE_AFTER_DAYS ? "text-warn" : "text-parchment-faint"}`}>
            As of the {formatDate(state.data.asOf)} close · {groups.length} groups
            {ageDays > STALE_AFTER_DAYS && " · the daily job hasn't run since"}
          </p>
          <div className="mt-4 mb-4">
            <p className="text-[10px] uppercase tracking-wide text-parchment-faint mb-2">
              Sectors · pick one or more
              {selected.size > 0 && ` · ${selected.size} selected, ${shown.length} groups shown`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <SectorTile
                label="All sectors"
                detail={`${groups.length} groups`}
                pressed={selected.size === 0}
                onClick={() => setSelected(new Set())}
              />
              {sectors.map((s) => (
                <SectorTile
                  key={s.name}
                  label={s.name}
                  detail={`${s.groups} ${s.groups === 1 ? "group" : "groups"} · best #${s.best}`}
                  pressed={selected.has(s.name)}
                  onClick={() => toggleSector(s.name)}
                />
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono whitespace-nowrap">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-parchment-faint border-b border-line *:px-2 first:*:pl-0 last:*:pr-0">
                  <th className="pb-2 font-normal font-body text-right">Rank</th>
                  <th className="pb-2 font-normal font-body">Group</th>
                  <th className="pb-2 font-normal font-body">Sector</th>
                  <th className="pb-2 font-normal font-body text-right" title="Median RS Rating of its stocks">RS</th>
                  <th className="pb-2 font-normal font-body text-right">Stocks</th>
                  <th className="pb-2 font-normal font-body text-right" title="Rank change over 5 trading days">1 wk</th>
                  <th className="pb-2 font-normal font-body text-right" title="Rank change over 63 trading days">3 mo</th>
                  <th className="pb-2 font-normal font-body">Strongest stocks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((g) => (
                  <tr key={g.key} className="text-parchment-dim *:px-2 first:*:pl-0 last:*:pr-0">
                    <td className={`py-2 text-right ${g.rank <= LEADING ? "text-gold-bright" : "text-parchment"}`}>{g.rank}</td>
                    <td className="py-2 font-body text-parchment">{g.name}</td>
                    <td className="py-2 font-body">{g.sector}</td>
                    <td className={`py-2 text-right ${g.medianRating >= 80 ? "text-gain-bright" : "text-parchment"}`}>
                      {g.medianRating}
                    </td>
                    <td className="py-2 text-right">{g.members}</td>
                    <td className="py-2 text-right">
                      <Change now={g.rank} before={g.rankWeekAgo} />
                    </td>
                    <td className="py-2 text-right">
                      <Change now={g.rank} before={g.rankQuarterAgo} />
                    </td>
                    <td className="py-2 font-body">
                      <span className="inline-flex gap-2">
                        {g.topStocks.map((s) => (
                          <Link
                            key={s.ticker}
                            href={`/strategies/leadership?ticker=${encodeURIComponent(s.ticker)}`}
                            className="hover:text-gold-bright"
                            title={`RS Rating ${s.rating}`}
                          >
                            {s.ticker}
                          </Link>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-parchment-faint mt-4 max-w-2xl">
            Gold ranks are the top {LEADING}. Groups with fewer than 3 rated stocks, shell companies and funds
            aren&apos;t ranked. Rank changes compare with the ranking 5 and 63 trading days earlier: ▲ means the
            group climbed.
          </p>
        </>
      )}
    </div>
  );
}

const STEPS = [
  {
    title: "1 · Every company gets one group",
    body: () => (
      <>
        There are {allTaxonomyGroups().length} possible groups in {Object.keys(TAXONOMY).length} sectors, a list written
        for this app in the style of IBD&apos;s industry groups. Each company was placed in one of them by an AI model
        that read its name and its SEC industry description. The placement was not checked company by company, so some
        will be wrong. New listings have no group until the next refresh. Funds, SPACs and preferred shares are
        marked unclassified and left out.
      </>
    ),
  },
  {
    title: "2 · Every stock gets an RS score",
    body: () => (
      <>
        The RS score is a stock&apos;s price performance over 12 months, with the latest 3 months counted double (3
        months 40%; 6, 9 and 12 months 20% each). The RS Rating on the other CAN SLIM pages is that score ranked from 1
        to 99 against every stock. Warrants and preferred shares are not counted as stocks.
      </>
    ),
  },
  {
    title: "3 · A group's score is the median of its stocks",
    body: () => (
      <>
        The group&apos;s score is the <em>median</em> RS score of the stocks in it, not the average, so a single
        runaway stock can&apos;t lift a small group. A group needs at least {MIN_GROUP_MEMBERS} rated stocks to be
        ranked; smaller ones are left out.
      </>
    ),
  },
  {
    title: "4 · Groups are ranked",
    body: () => (
      <>
        Groups are sorted by that score, highest first, and numbered from 1. The ranking is rebuilt after every trading
        day from the stored RS scores, so it moves with the market.
      </>
    ),
  },
];

const COLUMNS = [
  ["Rank", `The group's place today. Gold means the top ${LEADING_GROUP_RANKS}, a rule of thumb from O'Neil's books for where leaders tend to come from.`],
  ["RS", "The median RS Rating (1-99) of the group's stocks."],
  ["Stocks", "How many rated stocks are in the group."],
  ["1 wk / 3 mo", "How many places the group has climbed (▲) or fallen (▼) since 5 and 63 trading days ago. A dash means it wasn't ranked then or the history doesn't go back that far."],
  ["Strongest stocks", "The five stocks in the group with the highest RS scores. Click one to open it on the Leadership page."],
  ["Sector tiles", "Pick one or more sectors to narrow the table. Each tile shows how many ranked groups the sector has and the rank of its best group. Ranks always stay the overall ranks."],
];

function HowItWorks() {
  return (
    <details className="mt-4 max-w-3xl rounded-md border border-line px-4 py-3 text-xs text-parchment-dim">
      <summary className="cursor-pointer text-parchment hover:text-gold-bright">How this table is built</summary>
      <div className="mt-3 space-y-4 leading-relaxed">
        <p>
          The idea comes from William O&apos;Neil: most of a stock&apos;s move comes with its industry group, so the best
          stocks are usually found inside groups that are already leading. This table ranks the groups so you can see
          which ones those are.
        </p>

        {STEPS.map((step) => (
          <div key={step.title}>
            <p className="text-parchment mb-1">{step.title}</p>
            <p>{step.body()}</p>
          </div>
        ))}

        <div>
          <p className="text-parchment mb-1.5">Reading the table</p>
          <dl className="divide-y divide-line">
            {COLUMNS.map(([term, text]) => (
              <div key={term} className="flex gap-3 py-1.5 first:pt-0">
                <dt className="w-28 shrink-0 text-parchment">{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-parchment-faint">
          This is the app&apos;s own version of the idea. IBD uses its own group list and does not publish its exact
          ranking method in full, so the leaders should look alike but the ranks will not match. A
          group&apos;s rank is a starting point for finding stocks, not a signal to buy.
        </p>
      </div>
    </details>
  );
}

function SectorTile({ label, detail, pressed, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`text-left rounded-md border px-3 py-2 transition-colors ${
        pressed
          ? "border-gold-dim bg-surface text-gold-bright"
          : "border-line text-parchment-dim hover:border-gold-dim hover:text-parchment"
      }`}
    >
      <span className="block text-xs font-medium leading-snug">{label}</span>
      <span className="block text-[10px] text-parchment-faint mt-0.5">{detail}</span>
    </button>
  );
}
