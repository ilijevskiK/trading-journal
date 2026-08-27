import {
  SqueezeBandsDiagram,
  MomentumHistogramDiagram,
} from "@/components/diagrams/SqueezeDiagrams";

export const meta = {
  slug: "squeeze-momentum-lazybear",
  name: "Squeeze Momentum Indicator",
  developer: "LazyBear",
  category: "Volatility",
  summary:
    "Flags low-volatility compression (Bollinger Bands inside Keltner Channels) ahead of expansion, with a linear-regression momentum histogram for direction.",
  tradingviewUrl: "https://www.tradingview.com/script/nqQ1DT5a-Squeeze-Momentum-Indicator-LazyBear/",
};

export default function SqueezeMomentumContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          The Squeeze Momentum Indicator is LazyBear&apos;s TradingView port of
          John Carter&apos;s &quot;TTM Squeeze&quot; concept from{" "}
          <em>Mastering the Trade</em>. The idea: volatility cycles between
          compression (a tight, quiet range) and expansion (a sharp directional
          move) — and rather than guessing when a move is coming, it&apos;s
          detectable directly by comparing two volatility bands against each
          other.
        </p>
        <p>
          It plots two things: a row of small dots on the zero line marking
          the current squeeze state, and a momentum histogram showing
          direction and strength once a move starts.
        </p>
      </Section>

      <Section title="How the squeeze is detected">
        <p>
          The indicator computes two channels around price: Bollinger Bands
          (mean ± a standard-deviation multiple) and Keltner Channels (mean ±
          an average-range multiple). Because Bollinger Bands react to
          standard deviation and Keltner Channels react to average true
          range, the two widen and narrow at different rates — and that gap
          is what signals a squeeze:
        </p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            <strong className="text-warn">Squeeze on</strong> — Bollinger
            Bands sit entirely inside the Keltner Channels. Volatility has
            compressed; the market is coiling.
          </li>
          <li>
            <strong className="text-gain-bright">Squeeze released</strong> —
            Bollinger Bands have expanded back outside the Keltner Channels.
            The coil has fired; a directional move is underway or just
            started.
          </li>
          <li>
            <strong className="text-parchment-faint">No squeeze</strong> —
            neither condition holds; normal, unremarkable volatility.
          </li>
        </ul>
        <SqueezeBandsDiagram />
      </Section>

      <Section title="The momentum histogram">
        <p>
          Once you know a squeeze fired, the histogram tells you which way.
          Instead of a plain momentum calculation, LazyBear&apos;s version
          runs a linear regression on the difference between closing price
          and a baseline (the average of the Keltner-period high/low midpoint
          and a moving average of close) — smoother than raw momentum, less
          prone to single-bar noise. Bars are colored by direction{" "}
          <em>and</em> whether that direction is strengthening or fading:
        </p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim font-mono text-xs">
          <li>lime — positive and rising (momentum building up)</li>
          <li>green — positive and falling (upmove losing steam)</li>
          <li>red — negative and falling (momentum building down)</li>
          <li>maroon — negative and rising (downmove losing steam)</li>
        </ul>
        <MomentumHistogramDiagram />
      </Section>

      <Section title="How it's normally traded">
        <p>
          The common approach: wait for the squeeze to be <em>on</em>{" "}
          (compression), then wait for it to release, then take the trade in
          whatever direction the histogram is pointing — not immediately on
          the black-cross squeeze signal itself, but on the first bar after
          release. Exit (or tighten) when the histogram changes color against
          the position, since that&apos;s the momentum fading. LazyBear&apos;s
          own notes suggest pairing it with a trend filter (ADX, moving
          averages) since the squeeze only tells you volatility is about to
          expand — not that it will expand in your favor.
        </p>
      </Section>

      <Section title="Inputs you can adjust, and why">
        <div className="space-y-4">
          <InputRow name="BB Length" default="20">
            Lookback for the Bollinger Bands&apos; moving average and standard
            deviation. Shorter reacts to recent volatility faster and flags
            squeezes sooner but more often; longer smooths it out and reduces
            false compressions on noisy instruments.
          </InputRow>
          <InputRow name="BB MultFactor" default="2.0">
            How many standard deviations wide the Bollinger Bands are.
            Raising it widens the bands, making a squeeze (BB inside KC)
            harder to trigger — fewer, more extreme compressions. Lowering it
            makes squeezes trigger more easily.
          </InputRow>
          <InputRow name="KC Length" default="20">
            Lookback for the Keltner Channel&apos;s moving average and range.
            Same responsiveness-vs-noise tradeoff as BB Length, but for the
            channel BB is being compared against.
          </InputRow>
          <InputRow name="KC MultFactor" default="1.5">
            How many range multiples wide the Keltner Channel is. This is the
            most direct squeeze-sensitivity dial: raising it widens the KC
            envelope, making it easier for BB to sit inside it (more squeeze
            signals, some weaker); lowering it tightens the envelope, making
            genuine compression harder to reach (fewer, stronger signals).
          </InputRow>
          <InputRow name="Use TrueRange (KC)" default="on">
            Whether the Keltner Channel&apos;s range term uses true range
            (includes gaps) or a plain high-low range. Leave it on for
            instruments that gap (most stocks, overnight futures); on
            instruments that trade continuously with no gaps, switching it
            off changes little.
          </InputRow>
        </div>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          A squeeze release is a volatility signal, not a thesis — it says a
          move is likely starting, not which stock, or why it&apos;s worth
          owning. Treat a fresh release as a timing trigger on a name that
          already has a written thesis, not a reason to buy something on its
          own. And because expansion, by definition, means the range is about
          to widen quickly, this is exactly the situation where sizing to a
          real stop distance matters most — a squeeze breakout that fails
          tends to fail fast.
        </p>
      </Section>

      <p className="text-xs text-parchment-faint pt-2 border-t border-line">
        Source:{" "}
        <a
          href="https://www.tradingview.com/script/nqQ1DT5a-Squeeze-Momentum-Indicator-LazyBear/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-bright hover:underline"
        >
          Squeeze Momentum Indicator [LazyBear] on TradingView
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
