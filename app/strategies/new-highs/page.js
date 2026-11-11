"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StockLetterPage from "@/components/canslim/StockLetterPage";
import { LETTER_LINKS } from "@/components/canslim/letterLinks";
import LetterSection, { formatDate } from "@/components/canslim/LetterSection";
import CandlestickChart from "@/components/CandlestickChart";
import FullscreenChart from "@/components/FullscreenChart";
import { useTrades } from "@/contexts/TradesContext";
import { useWatchlistCandles } from "@/hooks/useWatchlistCandles";
import { completedSessions } from "@/lib/marketStatus";
import { analyzeNewHighs, NEW_HIGH_RULES } from "@/lib/canslimN";
import { useStockNote } from "@/hooks/useStockNote";

const MA50_COLOR = "#E0BE6E";
const MA200_COLOR = "#8A7238";
const PIVOT_COLOR = "#C9A24B";
const HIGH_COLOR = "#9AA0AC";
const BREAKOUT_COLOR = "#6FCBA6";
const SMA_LINES = [
  { period: 50, color: MA50_COLOR },
  { period: 200, color: MA200_COLOR },
];

export default function NewHighsPage() {
  return (
    <StockLetterPage
      path="/strategies/new-highs"
      title="New Highs"
      intro="The “N” in CAN SLIM: something new behind the stock, and its price breaking out of a proper base to a new high. Prices from Twelve Data; the “new” is your call."
      source="prices"
      related={LETTER_LINKS.filter((l) => l.letter !== "N")}
    >
      {({ ticker }) => <NewHighs key={ticker} ticker={ticker} />}
    </StockLetterPage>
  );
}

function NewHighs({ ticker }) {
  const { settings, loaded } = useTrades();
  const apiKey = settings.twelveDataApiKey;
  const { candles, loading, error, refetch } = useWatchlistCandles(ticker, apiKey);
  const { note, saveNote, noteError, savedAt } = useStockNote(ticker);

  const result = useMemo(
    () =>
      candles.length
        ? analyzeNewHighs(completedSessions(candles), {
            pivot: note.pivot ?? null,
            newConfirmed: Boolean(note.newThing?.confirmed),
          })
        : null,
    [candles, note]
  );

  if (!loaded) return null;
  if (!apiKey) {
    return (
      <p className="text-sm text-parchment-dim">
        Add a Twelve Data API key in{" "}
        <Link href="/settings" className="text-gold-bright hover:underline">
          Settings
        </Link>{" "}
        to check price action.
      </p>
    );
  }
  if (loading) return <p className="text-sm text-parchment-faint">Loading {ticker} prices…</p>;
  if (error) {
    return (
      <p className="text-sm text-loss-bright">
        {error.message}{" "}
        <button onClick={refetch} className="underline">
          Retry
        </button>
      </p>
    );
  }
  if (!result) return <p className="text-sm text-parchment-faint">No price data found for {ticker}.</p>;

  const r = NEW_HIGH_RULES;
  return (
    <LetterSection
      letter="N"
      title="New product, management, or price high"
      rule={`Price within ${r.maxBelowHighPct}% of its 52-week high, breaking out of a ${r.minBaseWeeks}+ week base no deeper than ${r.maxBaseDepthPct}%, on volume ${r.breakoutVolumePct}%+ above average, bought within ${r.buyRangePct}% of the pivot. And something new behind it.`}
      result={result}
    >
      <ManualInputs note={note} onSave={saveNote} error={noteError} savedAt={savedAt} />
      {result.stats && <Stats stats={result.stats} />}
      <PriceChart ticker={ticker} candles={candles} stats={result.stats} apiKey={apiKey} />
    </LetterSection>
  );
}

const inputClass =
  "bg-ink border border-line rounded-md px-3 py-2 text-sm text-parchment placeholder:text-parchment-faint focus:outline-none focus:border-gold-dim";

function ManualInputs({ note, onSave, error, savedAt }) {
  const [pivot, setPivot] = useState(note.pivot ?? "");
  const [confirmed, setConfirmed] = useState(Boolean(note.newThing?.confirmed));
  const [text, setText] = useState(note.newThing?.note || "");

  useEffect(() => {
    setPivot(note.pivot ?? "");
    setConfirmed(Boolean(note.newThing?.confirmed));
    setText(note.newThing?.note || "");
  }, [note]);

  const recentlySaved = savedAt && Date.now() - savedAt < 2000;

  return (
    <div className="grid md:grid-cols-2 gap-4 mt-5">
      <form
        className="rounded-md border border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ pivot: pivot === "" ? null : pivot });
        }}
      >
        <label className="block text-xs text-parchment-dim mb-1" htmlFor="pivot">
          Pivot (buy point)
        </label>
        <p className="text-[11px] text-parchment-faint mb-2">
          The price the stock must clear to break out, usually the high of the base&apos;s handle or right side.
        </p>
        <div className="flex gap-2">
          <input
            id="pivot"
            type="number"
            step="0.01"
            min="0"
            value={pivot}
            onChange={(e) => setPivot(e.target.value)}
            placeholder="e.g. 150.25"
            className={`${inputClass} flex-1 font-mono`}
          />
          <button type="submit" className="bg-gold text-ink px-3 py-2 rounded-md text-sm font-medium hover:bg-gold-bright">
            Save
          </button>
        </div>
      </form>

      <form
        className="rounded-md border border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ newThing: { confirmed, note: text } });
        }}
      >
        <label className="flex items-center gap-2 text-xs text-parchment-dim cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="accent-gold w-3.5 h-3.5"
          />
          Something new is driving it
        </label>
        <p className="text-[11px] text-parchment-faint mt-1 mb-2">
          A new product or service, new management, or a change in its industry.
        </p>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's new, e.g. Blackwell chips"
            maxLength={500}
            className={`${inputClass} flex-1`}
          />
          <button type="submit" className="bg-gold text-ink px-3 py-2 rounded-md text-sm font-medium hover:bg-gold-bright">
            Save
          </button>
        </div>
      </form>

      {(error || recentlySaved) && (
        <p className={`md:col-span-2 text-xs ${error ? "text-loss-bright" : "text-gain-bright"}`}>
          {error || "Saved ✓"}
        </p>
      )}
    </div>
  );
}

const ZONE_LABELS = {
  below: { label: "Below pivot", tone: "text-parchment-dim" },
  buy: { label: "In buy range", tone: "text-gain-bright" },
  extended: { label: "Extended", tone: "text-warn" },
};

function Stats({ stats }) {
  const money = (v) => `$${v.toFixed(2)}`;
  const items = [
    ["Last close", `${money(stats.close)} · ${formatDate(stats.asOf)}`],
    ["52-week high", `${money(stats.high52)} · ${formatDate(stats.highDate)}`],
    ["Below the high", `${stats.pctBelowHigh.toFixed(1)}%`],
  ];
  if (stats.pivot) {
    items.push(["Pivot / buy up to", `${money(stats.pivot)} / ${money(stats.buyLimit)}`]);
    items.push(["Where it is now", ZONE_LABELS[stats.zone].label, ZONE_LABELS[stats.zone].tone]);
  }
  if (stats.base) {
    items.push(["Base", `${stats.base.weeks.toFixed(0)} weeks, ${stats.base.depthPct.toFixed(0)}% deep`]);
    items.push(["Base low", `${money(stats.base.low)} · ${formatDate(stats.base.lowDate)}`]);
    if (stats.base.volumeDryUpRatio != null) {
      items.push(["Volume late in base", `${(stats.base.volumeDryUpRatio * 100).toFixed(0)}% of normal`]);
    }
  }
  if (stats.breakoutDate) {
    items.push([
      "Breakout",
      `${formatDate(stats.breakoutDate)}${
        stats.breakoutVolumePct != null
          ? ` · volume ${stats.breakoutVolumePct >= 0 ? "+" : ""}${stats.breakoutVolumePct.toFixed(0)}%`
          : ""
      }`,
    ]);
  }
  return (
    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-5 text-xs">
      {items.map(([label, value, tone]) => (
        <div key={label} className="flex justify-between gap-3 border-b border-line/60 py-1">
          <dt className="text-parchment-faint">{label}</dt>
          <dd className={`font-mono text-right ${tone || "text-parchment-dim"}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PriceChart({ ticker, candles, stats, apiKey }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [timeframe, setTimeframe] = useState("1day");
  const fullscreenQuery = useWatchlistCandles(ticker, apiKey, {
    interval: timeframe,
    enabled: fullscreen && timeframe !== "1day",
  });
  const daily = timeframe === "1day";
  const trade = useMemo(() => ({ ticker, status: "open", exits: [] }), [ticker]);

  const priceLines = useMemo(() => {
    if (!stats) return [];
    const lines = [{ price: stats.high52, color: HIGH_COLOR, title: "52-wk high", dashed: true }];
    if (stats.pivot) {
      lines.push({ price: stats.pivot, color: PIVOT_COLOR, title: "pivot" });
      lines.push({ price: stats.buyLimit, color: PIVOT_COLOR, title: `+${NEW_HIGH_RULES.buyRangePct}%`, dashed: true });
    }
    return lines;
  }, [stats]);

  const markers = useMemo(() => {
    if (!stats) return [];
    const out = [];
    if (stats.base) {
      out.push({ time: stats.base.leftDate, position: "aboveBar", color: HIGH_COLOR, shape: "arrowDown", text: "Base" });
      out.push({ time: stats.base.lowDate, position: "belowBar", color: HIGH_COLOR, shape: "arrowUp", text: "Low" });
    }
    if (stats.breakoutDate) {
      out.push({ time: stats.breakoutDate, position: "belowBar", color: BREAKOUT_COLOR, shape: "arrowUp", text: "Breakout" });
    }
    return out.sort((a, b) => (a.time < b.time ? -1 : 1));
  }, [stats]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px] text-parchment-faint">
        <Swatch color={MA50_COLOR} label="50-day average" />
        <Swatch color={MA200_COLOR} label="200-day average" />
        {stats?.pivot && <Swatch color={PIVOT_COLOR} label={`Pivot, and +${NEW_HIGH_RULES.buyRangePct}% buy limit (dashed)`} />}
        <Swatch color={HIGH_COLOR} label="52-week high (dashed)" />
      </div>
      <CandlestickChart
        trade={trade}
        candles={candles}
        aspectRatio="16/9"
        smaLines={SMA_LINES}
        extraMarkers={markers}
        extraPriceLines={priceLines}
        onExpand={() => setFullscreen(true)}
      />
      {fullscreen && (
        <FullscreenChart
          title={ticker}
          trade={trade}
          candles={daily ? candles : fullscreenQuery.candles}
          loading={daily ? false : fullscreenQuery.loading}
          error={daily ? null : fullscreenQuery.error}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          smaLines={daily ? SMA_LINES : undefined}
          extraMarkers={daily ? markers : undefined}
          extraPriceLines={priceLines}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}

function Swatch({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-4 h-0.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
