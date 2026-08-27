import {
  WaveTrendSignalDiagram,
  WaveTrendDivergenceDiagram,
  WaveTrendCrossHighlightDiagram,
} from "@/components/diagrams/WaveTrendDiagrams";

export const meta = {
  slug: "wavetrend-oscillator-lazybear",
  name: "WaveTrend Oscillator [WT]",
  developer: "LazyBear",
  category: "Momentum",
  summary:
    "Momentum oscillator (WT1/WT2) similar to RSI/Stochastic, tuned for earlier, smoother overbought/oversold and divergence signals.",
  tradingviewUrl: "https://www.tradingview.com/script/2KE8wTuF-Indicator-WaveTrend-Oscillator-WT/",
};

export default function WaveTrendOscillatorContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          WaveTrend Oscillator [WT] is a momentum indicator published by
          LazyBear on TradingView in 2014, ported from an older TradeStation/
          MultiCharts script. It plays the same role as RSI or Stochastic —
          flagging overbought/oversold conditions — but runs price through an
          extra layer of smoothing designed to catch turns earlier and with
          less jitter than those two.
        </p>
        <p>
          It plots two lines: <strong className="text-parchment">WT1</strong>{" "}
          (the fast, primary line) and{" "}
          <strong className="text-parchment">WT2</strong> (a slower signal
          line — a 4-period average of WT1). Crossovers between the two,
          filtered by overbought/oversold bands, are the core signal.
        </p>
      </Section>

      <Section title="How it's calculated">
        <p>
          In order, from the typical price (HLC3 — the average of high, low,
          and close):
        </p>
        <ol className="list-decimal list-inside space-y-1 text-parchment-dim font-mono text-xs">
          <li>AP = (High + Low + Close) / 3</li>
          <li>ESA = EMA(AP, Channel Length)</li>
          <li>D = EMA(|AP − ESA|, Channel Length)</li>
          <li>CI = (AP − ESA) / (0.015 × D)</li>
          <li>WT1 = EMA(CI, Average Length)</li>
          <li>WT2 = SMA(WT1, 4)</li>
        </ol>
        <p>
          The 0.015 constant is a fixed scaling factor that keeps the output
          in a fairly consistent range (typically roughly −80 to +80) across
          different instruments, the same role the 0.015 constant plays in
          Lambert&apos;s original Commodity Channel Index formula this is
          derived from.
        </p>
      </Section>

      <Section title="Overbought / oversold bands and the WT1 / WT2 cross">
        <p>
          Two lines sit above and below zero: an overbought pair (default{" "}
          <span className="font-mono text-loss-bright text-xs">+60 / +53</span>) and
          an oversold pair (default{" "}
          <span className="font-mono text-gain-bright text-xs">−60 / −53</span>). The
          core signal:
        </p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            <strong className="text-gain-bright">Buy</strong> — WT1 crosses
            back above WT2 while both are below the oversold band.
          </li>
          <li>
            <strong className="text-loss-bright">Sell</strong> — WT1 crosses
            back below WT2 while both are above the overbought band.
          </li>
        </ul>
        <p>
          LazyBear&apos;s own notes on the script are explicit that these
          crosses are the easiest signal to automate, but{" "}
          <em>not the only useful signal</em> the indicator produces —
          divergences (below) are the other main one.
        </p>
        <WaveTrendSignalDiagram />
      </Section>

      <Section title="On the chart in this journal: cross markers and candle highlighting">
        <p>
          LazyBear&apos;s original script leaves you to eyeball where WT1
          crosses WT2. This journal&apos;s chart adds two things on top of
          the exact same WT1/WT2 calculation above — no new indicator, no
          change to the signal itself:
        </p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            A colored circle is plotted directly on the WaveTrend pane at
            every WT1/WT2 crossover — green for a bullish cross (WT1 moving
            back above WT2), red for a bearish one.
          </li>
          <li>
            The candle at that same bar is tinted on the price chart itself —
            the same green/red the candles already use for gains and losses,
            at 50% opacity — so the cross is visible where you&apos;re
            actually looking, not just down in the oscillator pane.
          </li>
        </ul>
        <p>
          Both are tied to the single WaveTrend toggle — turning it off
          clears the markers and any candle tint along with the WT1/WT2
          lines. Note this highlights <em>every</em> crossover, not just the
          ones inside the overbought/oversold bands above — the coloring is a
          visibility aid for where a cross happened, not a filtered buy/sell
          signal on its own.
        </p>
        <WaveTrendCrossHighlightDiagram />
      </Section>

      <Section title="Divergences">
        <p>
          Because WT1 is smoother than raw price, it can put in a higher low
          while price makes a lower low (bullish divergence) — or a lower
          high while price makes a higher high (bearish divergence). These
          are read as fading momentum ahead of a possible reversal, and are
          considered more reliable when they occur near the overbought or
          oversold extremes rather than around the zero line.
        </p>
        <WaveTrendDivergenceDiagram />
      </Section>

      <Section title="Inputs you can adjust, and why">
        <div className="space-y-4">
          <InputRow name="Channel Length (n1)" default="10">
            Smoothing window used for ESA and the deviation term (steps 2–3
            above). This is the main responsiveness dial: lower it to react
            faster on shorter timeframes or faster-moving instruments, at the
            cost of more noise and false crosses. Raise it to smooth out chop
            on higher timeframes, at the cost of later signals.
          </InputRow>
          <InputRow name="Average Length (n2)" default="21">
            A second EMA smoothing pass applied to the Channel Index to
            produce WT1. Same tradeoff as Channel Length — shorter reacts
            quicker but whipsaws more, longer lags but filters more noise.
            Because this smoothing is stacked on top of Channel Length, small
            changes here move signal timing more than the same change to n1.
          </InputRow>
          <InputRow name="Overbought Level 1 / 2" default="60 / 53">
            The two upper thresholds. Level 1 is the stricter, further-out
            band; Level 2 sits closer to zero and flags overbought earlier.
            Tightening both (lower values) produces more sell signals with
            more false positives; widening them (higher values) waits for a
            stronger extreme before flagging, producing fewer but generally
            higher-conviction signals.
          </InputRow>
          <InputRow name="Oversold Level 1 / 2" default="−60 / −53">
            Mirror of the overbought levels on the downside — same
            frequency-vs-reliability tradeoff applies to buy signals.
          </InputRow>
        </div>
        <p>
          WT2&apos;s 4-period averaging length is fixed in LazyBear&apos;s
          original script rather than exposed as an input — it&apos;s listed
          here as a calculation detail, not something you can adjust.
        </p>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          WaveTrend is a momentum/timing tool, not a thesis. It can help time
          an entry inside a setup you already have a written reason for — for
          example, waiting for a WT buy cross out of oversold before sizing
          into a name you already understand — but a crossover by itself
          isn&apos;t a thesis, and it doesn&apos;t set your stop. Like any
          fast oscillator, it will throw false crosses in choppy, low-momentum
          conditions; that&apos;s a reason to keep position sizing tied to
          your stop distance rather than to how confident a signal looks.
        </p>
      </Section>

      <p className="text-xs text-parchment-faint pt-2 border-t border-line">
        Source:{" "}
        <a
          href="https://www.tradingview.com/script/2KE8wTuF-Indicator-WaveTrend-Oscillator-WT/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-bright hover:underline"
        >
          WaveTrend Oscillator [WT] by LazyBear on TradingView
        </a>
        . Diagrams above are original recreations for this journal, not
        TradingView screenshots.
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

function InputRow({ name, default: defaultValue, children }) {
  return (
    <div className="border-l-2 border-gold-dim pl-3">
      <p className="text-sm text-parchment">
        {name}{" "}
        <span className="font-mono text-xs text-gold-bright">default {defaultValue}</span>
      </p>
      <p className="text-sm text-parchment-dim leading-relaxed mt-0.5">{children}</p>
    </div>
  );
}
