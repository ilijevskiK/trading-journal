import {
  AnnotatedBreakoutDiagram,
  RelativeStrengthDiagram,
} from "@/components/diagrams/StageAnalysisModelDiagrams";

export const meta = {
  slug: "stage-analysis-breakout-weinstein",
  title: "Stage Analysis Breakout Strategy",
  author: "Adapted from Stan Weinstein",
  category: "Trend Following",
  summary:
    "A mechanical breakout system built directly from Weinstein's Stage 2 confirmation — a rising 30-week average, a resistance breakout on expanding volume for entry, and a close back below the average for the exit.",
};

export default function StageAnalysisStrategyContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          Stan Weinstein&apos;s <em>Secrets For Profiting in Bull and Bear
          Markets</em>, already in this journal&apos;s Books section,
          describes Stage Analysis as a framework for judging where a stock
          is in its cycle before ever asking whether to buy it. This
          strategy takes that framework and turns it into a small set of
          mechanical, backtestable rules — the same 30-week moving average,
          volume confirmation, and breakout logic the book describes,
          expressed as exact conditions rather than chart-reading judgment
          calls. It isn&apos;t an abstract idea sitting next to this
          journal — the identical logic runs live on every trade&apos;s
          chart here, as the <strong className="text-parchment">Stage
          Analysis</strong> toggle, and as a supporting checklist inside the{" "}
          <strong className="text-parchment">Entry Disqualifier — Noise
          Filter</strong> strategy also in this library. Every rule below is
          something you can actually go click on.
        </p>
      </Section>

      <Section title="The entry: a confirmed Stage 2 breakout">
        <AnnotatedBreakoutDiagram />
        <p className="text-xs text-parchment-faint">
          Original diagram — the same breakout shape described in the book
          write-up, restated here as the strategy&apos;s exact entry
          condition.
        </p>
        <p>A trade is only taken when three things line up on the same bar:</p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            Price closes above a recent resistance level — the highest high
            of the last 20 bars, i.e. the top of the base.
          </li>
          <li>
            Price closes above the 30-week (150-day) moving average, and
            that average is itself higher than it was 10 bars ago —
            Weinstein&apos;s requirement that the average has actually
            turned up, not just that price poked above a flat line.
          </li>
          <li>
            Volume on the breakout bar is at least 1.5× its own 50-day
            average — the strategy&apos;s stand-in for Weinstein&apos;s
            insistence that a real Stage 2 breakout doesn&apos;t happen
            quietly.
          </li>
        </ul>
        <p>
          Missing any one of the three is deliberately disqualifying: a
          breakout on light volume, or a breakout while the 30-week average
          is still flat or falling, is exactly the kind of fakeout the book
          warns about.
        </p>
      </Section>

      <Section title="Seeing it live: the Stage Analysis chart toggle">
        <p>
          Open any trade in this journal, expand its chart to full screen,
          and switch on the <strong className="text-parchment">Stage
          Analysis</strong> chip. Three things appear, all driven by the
          exact rules above rather than a separate drawing:
        </p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            The 30-week average itself, drawn in{" "}
            <span className="text-gain-bright">green</span> whenever it&apos;s
            rising and <span className="text-loss-bright">red</span> whenever
            it&apos;s falling — so the single most important filter in the
            whole strategy is something you can see change color in real
            time, not something you have to calculate in your head.
          </li>
          <li>
            A dotted, stair-stepped line at the rolling resistance level —
            the exact 20-bar high the entry rule checks price against.
          </li>
          <li>
            A small green <span className="font-mono">&quot;Stage 2&quot;</span>{" "}
            marker under any bar where all three entry conditions fired
            together, and a red{" "}
            <span className="font-mono">&quot;Stage 3/4&quot;</span> marker
            above the bar where a position from one of those breakouts would
            have been mechanically closed.
          </li>
        </ul>
        <p>
          If you&apos;re looking at a trade you already logged, this is a
          direct, after-the-fact check: did the entry you actually took line
          up with a real &quot;Stage 2&quot; marker, or did it land somewhere
          the average was still flat, red, or below price without the volume
          behind it? The chart will show you honestly either way.
        </p>
      </Section>

      <Section title="Stop and position size — set before the trade, not after">
        <p>
          The stop is the lowest low over a lookback window ending at the
          breakout — in practice, the base&apos;s own low. Position size is
          then solved backwards from that stop distance and a fixed risk
          budget, rather than picked as a round number of shares. This
          journal&apos;s own <strong className="text-parchment">Position
          size calculator</strong>, on the New Trade form, is that exact
          calculation made concrete: enter the same entry price and
          stop-loss price the strategy uses, set a{" "}
          <em>Risk tolerance for this trade (% of account)</em>, and it works
          out the <em>Stop distance</em>, the <em>$ at risk</em>, and a{" "}
          <em>Suggested shares</em> figure you can take as-is or override
          with a custom count.
        </p>
        <p>
          A wider base with a stop further away automatically produces a
          smaller suggested position; a tight base allows a larger one — the
          dollars put at risk stay constant either way. If the resulting
          size would still be too large a share of the account, the form
          says so directly: <em>&quot;Over your position-size limit. Reduce
          shares or reconsider — this is the exact mistake that hurt on
          oversized names before.&quot;</em> That warning and this
          strategy&apos;s stop rule are describing the same discipline from
          two different screens.
        </p>
      </Section>

      <Section title="The exit: Stage 3/4, no negotiation">
        <p>
          There is exactly one hard exit condition: a daily close back below
          the 30-week moving average. No partial exceptions, no waiting to
          see if it recovers. This mirrors the book&apos;s most quoted line —
          &quot;take the oath&quot; to not hold a stock once it has broken
          its trend — turned into a single, unambiguous rule a backtester
          (or a person) can apply exactly the same way every time. On the
          chart, this is the red{" "}
          <span className="font-mono">&quot;Stage 3/4&quot;</span> marker
          described above; there is no equivalent soft version of it.
        </p>
        <p>
          The New Trade form&apos;s two scale-out fields —{" "}
          <em>Target 1 ($) — sell first third here</em> and{" "}
          <em>Target 2 ($) — sell second third here</em> — are a separate,
          softer layer on top of this, not a substitute for it. Selling
          partial size into strength while a stock is still in a healthy
          Stage 2 is a way of banking profit during the move the strategy is
          trying to catch; the hard MA-break rule is what still governs
          whatever&apos;s left if the stock never reaches those targets, or
          reverses after only partially hitting them.
        </p>
      </Section>

      <Section title="Optional filter: relative strength">
        <RelativeStrengthDiagram />
        <p className="text-xs text-parchment-faint">
          Not encoded in the Pine script below — a manual pre-filter, same
          as the book describes.
        </p>
        <p>
          The book&apos;s tie-breaker — preferring breakouts in stocks whose
          relative-strength line against the broader market is already
          trending up — isn&apos;t built into the script itself, since it
          depends on a benchmark series the strategy doesn&apos;t load by
          default. Applied manually, it&apos;s a useful filter on top of the
          mechanical signal: the same breakout in a stock already
          outperforming the market is a stronger version of the same setup.
        </p>
      </Section>

      <Section title="Pairing it with the Entry Disqualifier">
        <p>
          The <strong className="text-parchment">Entry Disqualifier — Noise
          Filter</strong> strategy, also in this library, runs on the exact
          same stage math as this one — including a benchmark comparison
          this strategy leaves manual. Toggle it on the same chart and its
          checklist panel checks, among other things,{" "}
          <em>&quot;Wrong stage (not Stage 2)&quot;</em> and{" "}
          <em>&quot;Market not Stage 2&quot;</em> directly against the
          benchmark, plus <em>&quot;Underperforming benchmark&quot;</em> —
          the same relative-strength idea above, but computed rather than
          eyeballed. It&apos;s deliberately not another buy signal: a clean{" "}
          <em>&quot;No disqualifiers&quot;</em> reading just means none of
          its seven reasons to skip currently apply to a stock that has
          already earned a &quot;Stage 2&quot; marker here. The two are
          meant to be read together, not as competing tools.
        </p>
      </Section>

      <Section title="Logging it honestly, and judging it over many trades">
        <p>
          This journal&apos;s discipline checklist —{" "}
          <em>Thesis written</em>, <em>Stop set</em>,{" "}
          <em>Understood business</em>, <em>Stop not moved</em>, and{" "}
          <em>Within size limit</em> — maps onto this strategy almost line
          for line: the &quot;Stage 2&quot; entry conditions are what{" "}
          <em>Thesis written</em> should actually mean for a trade like this,
          the base low is what <em>Stop set</em> is recording, and the hard
          MA-break rule is exactly what <em>Stop not moved</em> is checking
          you didn&apos;t quietly abandon under pressure.
        </p>
        <p>
          Whether the strategy is actually working isn&apos;t something to
          judge from any single trade, win or lose — it&apos;s what the
          Dashboard&apos;s <em>Avg R-multiple</em>,{" "}
          <em>Expectancy / trade</em>, and <em>R-multiple by trade</em> chart
          are for. Trading in the Zone, also in this library, makes the same
          point about any mechanical edge: the distribution across a real
          sample of logged trades is the only honest verdict, not how the
          last one or two felt.
        </p>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          The whole strategy is really this journal&apos;s own checklist
          expressed as code: the entry conditions are the &quot;thesis
          written&quot; check made explicit and mechanical, the stop is set
          from the base low before the position is ever sized, and the
          single hard exit rule is exactly the &quot;stop not moved against
          the plan&quot; discipline this journal already asks for on every
          trade — just with no room left to negotiate with it in the moment.
        </p>
      </Section>
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
