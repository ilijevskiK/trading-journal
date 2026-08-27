import {
  MarketStructureDiagram,
  OrderBlockDiagram,
  FairValueGapDiagram,
  EqualHighsLowsDiagram,
  PremiumDiscountDiagram,
} from "@/components/diagrams/SMCDiagrams";

export const meta = {
  slug: "smart-money-concepts-luxalgo",
  name: "Smart Money Concepts (SMC)",
  developer: "LuxAlgo",
  category: "Structure",
  summary:
    "All-in-one price action toolkit: market structure (BOS/CHoCH), order blocks, fair value gaps, equal highs/lows, and premium/discount zones.",
  tradingviewUrl: "https://www.tradingview.com/script/CnB3fSph-Smart-Money-Concepts-SMC-LuxAlgo/",
};

export default function SmartMoneyConceptsContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          Smart Money Concepts (SMC) is LuxAlgo&apos;s implementation of the ICT
          (Inner Circle Trader) price-action methodology — a discretionary
          framework built around the idea that price moves in response to where
          large institutional orders and resting liquidity are likely to sit,
          rather than purely from indicator crossovers. LuxAlgo released it in
          late 2022 and it became one of the most-used community indicators on
          TradingView.
        </p>
        <p>
          It doesn&apos;t generate buy/sell signals on its own. It automatically
          labels five things on the chart that SMC traders normally have to mark
          up by hand: market structure breaks, order blocks, fair value gaps,
          equal highs/lows, and premium/discount zones.
        </p>
      </Section>

      <Section title="Market structure — BOS vs. CHoCH">
        <p>
          The indicator tracks swing points and labels them Higher High (HH),
          Higher Low (HL), Lower High (LH), and Lower Low (LL) — the same
          vocabulary as classic Dow Theory trend structure. Two events get
          called out specifically:
        </p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            <span className="text-gain-bright font-mono text-sm">BOS</span> —{" "}
            <strong className="text-parchment">Break of Structure.</strong>{" "}
            Price breaks past the most recent swing point in the direction of
            the existing trend. Read as trend continuation.
          </li>
          <li>
            <span className="text-loss-bright font-mono text-sm">CHoCH</span> —{" "}
            <strong className="text-parchment">Change of Character.</strong>{" "}
            Price breaks a swing point against the prevailing trend — the
            first sign the trend may be reversing.
          </li>
        </ul>
        <p>
          It also separates two timeframes of structure: <em>internal</em>{" "}
          (smaller, more frequent swings — noisier) and <em>swing</em> (the
          major trend, filtered for noise). Both can be toggled independently.
        </p>
        <MarketStructureDiagram />
      </Section>

      <Section title="Order blocks">
        <p>
          An order block is the last opposite-direction candle before a strong
          move that breaks structure — e.g. the last down candle right before a
          sharp rally. The theory: that candle is where large participants
          built a position, so price is expected to react again if it returns
          to that zone (&quot;mitigation&quot;) before continuing in the
          breakout&apos;s direction. The indicator draws these automatically for
          both internal and swing structure, with a setting to cap how many
          recent blocks stay on the chart.
        </p>
        <OrderBlockDiagram />
      </Section>

      <Section title="Fair value gaps (FVG)">
        <p>
          A fair value gap is a three-candle imbalance: the wick of the first
          candle and the wick of the third candle don&apos;t overlap, leaving a
          price range in the middle that never actually traded — usually
          created by a strong impulsive candle in between. SMC traders treat
          these as inefficiencies price tends to revisit before continuing.
          The indicator boxes them automatically, with an &quot;Auto
          Threshold&quot; setting to filter out insignificant gaps.
        </p>
        <FairValueGapDiagram />
      </Section>

      <Section title="Equal highs / equal lows (EQH / EQL)">
        <p>
          When price taps the same high (or low) more than once, SMC treats
          that level as a pool of resting liquidity — stop-losses and
          breakout orders clustered just beyond it. The expectation is that
          price sweeps through the level to trigger those orders before
          reversing. The indicator requires a configurable number of
          confirming bars before it labels a level as EQH/EQL, to reduce false
          positives.
        </p>
        <EqualHighsLowsDiagram />
      </Section>

      <Section title="Premium / discount / equilibrium">
        <p>
          The indicator divides the most recent swing range in half. The
          upper 50% is labeled <strong className="text-parchment">premium</strong> —
          considered an expensive place to buy — and the lower 50% is labeled{" "}
          <strong className="text-parchment">discount</strong> — considered a
          cheap place to buy. The midpoint is the{" "}
          <strong className="text-parchment">equilibrium</strong>. This is
          meant as a rough filter for where in a range an entry sits, not a
          standalone signal.
        </p>
        <PremiumDiscountDiagram />
      </Section>

      <Section title="Key settings">
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>Mode: Historical vs. Present, and Colored vs. Monochrome styling</li>
          <li>Internal structure toggle, with an optional confluence filter</li>
          <li>Swing structure toggle, with swing point (HH/HL/LH/LL) labels</li>
          <li>Internal and swing order block count, plus a volatility-based filter</li>
          <li>Fair value gap auto-threshold, timeframe, and extension length</li>
          <li>EQH/EQL confirmation bar count</li>
          <li>Previous highs/lows across daily/weekly/monthly timeframes</li>
          <li>Premium/discount zone display toggle</li>
        </ul>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          SMC is a discretionary reading of price action, not a backtested
          statistical edge — LuxAlgo&apos;s own materials are upfront that
          there&apos;s no supporting data proving institutional intent behind
          these patterns. Treat it as a way to sharpen the{" "}
          <em>thesis</em> field on the New Trade form (e.g. &quot;reclaiming a
          bullish order block after a swing CHoCH&quot;), not as a replacement
          for the discipline checklist. An order block lining up is not a
          substitute for a written stop-loss or a position sized within your
          account&apos;s limit.
        </p>
      </Section>

      <p className="text-xs text-parchment-faint pt-2 border-t border-line">
        Source:{" "}
        <a
          href="https://www.tradingview.com/script/CnB3fSph-Smart-Money-Concepts-SMC-LuxAlgo/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-bright hover:underline"
        >
          Smart Money Concepts (SMC) [LuxAlgo] on TradingView
        </a>
        . Diagrams above are original recreations for this journal, not
        TradingView/LuxAlgo screenshots.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl text-parchment">{title}</h2>
      <div className="space-y-3 text-sm text-parchment-dim leading-relaxed">{children}</div>
    </section>
  );
}
