import {
  AnnotatedBreakoutDiagram,
  RelativeStrengthDiagram,
} from "@/components/diagrams/StageAnalysisModelDiagrams";

export const meta = {
  slug: "2024-stage-analysis-model-book-weinstein",
  title: "2024 Stage Analysis Model Book",
  author: "Stan Weinstein",
  edition: "2024 Edition, published with TraderLion",
  category: "Stage Analysis — Chart Study",
  summary:
    "A slim, chart-first companion to the 1988 classic — 30+ real, annotated charts from calendar 2024 showing Weinstein marking entries, stops, and targets on live Stage 1-4 setups as they actually unfolded.",
  amazonUrl: "https://www.amazon.com/2024-Stage-Analysis-Model-Weinstein/dp/B0F1FB96NJ",
};

export default function StageAnalysisModelBookContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          This is a different kind of book than{" "}
          <em>Secrets For Profiting in Bull and Bear Markets</em>, already in
          this library — that 1988 book is the theory; this 2024 release,
          published in partnership with TraderLion, is the applied companion.
          It&apos;s a short, chart-first &quot;model book&quot; (about 70
          pages) built around{" "}
          <strong className="text-parchment">
            30+ annotated real charts from calendar year 2024
          </strong>
          , each one marked up directly with Weinstein&apos;s own entry
          points, stop placements, and price targets on stocks and ETFs as
          the Stage Analysis setups actually played out that year. There is
          very little new theory here — the value is seeing the same
          four-stage framework applied, in real time, to real tickers,
          rather than read about in the abstract.
        </p>
      </Section>

      <Section title="The model, restated with its formulas">
        <p>
          The book leans on the same three tools as the original — a moving
          average, volume, and relative strength — but ties each one to a
          specific, checkable number rather than a feel:
        </p>
        <div className="rounded-md border border-line bg-surface-alt p-4 font-mono text-xs text-parchment-dim space-y-2">
          <div>
            <span className="text-gold-bright">30-week MA</span> = simple
            average of the last 30 weekly closing prices (≈ the 150-day MA
            on a daily chart)
          </div>
          <div>
            <span className="text-gold-bright">RS ratio</span> = stock price
            ÷ benchmark index price, plotted as its own line — rising means
            the stock is outperforming the market, independent of the
            stock&apos;s own price direction
          </div>
        </div>
        <p>
          Stage 2 is only confirmed once price closes above{" "}
          <em>both</em> the prior base&apos;s resistance level{" "}
          <em>and</em> a 30-week MA that has already turned up — either one
          alone, the book repeats across its 2024 examples, is a common way
          to get faked out of a breakout too early.
        </p>
      </Section>

      <Section title="A worked breakout, annotated the way the book does it">
        <AnnotatedBreakoutDiagram />
        <p className="text-xs text-parchment-faint">
          Illustrative recreation of the annotation style the book uses on
          its real 2024 charts — not a reproduction of any actual chart from
          the book.
        </p>
        <p>
          The pattern repeated across the book&apos;s 2024 chart set: a
          months-long Stage 1 base with a flattening 30-week average (①),
          then a breakout above both the base&apos;s resistance and the now
          rising average, confirmed by a volume spike well above the base
          period&apos;s average volume (②), with the entry taken at or just
          above the breakout/pivot level rather than chased later (③). The
          initial stop sits below the base&apos;s low — a level chosen{" "}
          <em>before</em> the entry, not adjusted afterward based on how the
          trade feels.
        </p>
      </Section>

      <Section title="Relative strength as a leader/laggard filter">
        <RelativeStrengthDiagram />
        <p>
          Several of the book&apos;s 2024 examples pair a Stage 2 price
          breakout with an RS line that had already been trending up for
          weeks beforehand — the book&apos;s point being that a stock
          already acting like a market leader, by this ratio, gives a
          breakout more room to work than the same chart pattern on a stock
          the market is ignoring.
        </p>
      </Section>

      <Section title="Risk management, made concrete">
        <p>
          Because every example is a real 2024 chart rather than a
          hypothetical, the risk-management points land more specifically
          than in the original book: exact stop levels below exact base lows,
          exact points where a position was trimmed or exited as a stock
          rolled from Stage 2 into Stage 3, and — for the setups that
          failed — exact examples of a breakout that reversed back below the
          pivot, with the stop doing its job. Seeing the losers marked up
          alongside the winners is deliberate: the book is as much about
          what a failed Stage 2 attempt looks like in real time as what a
          successful one does.
        </p>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          This book is essentially a worked-example version of two checks
          this journal already asks for on every trade: a written thesis and
          a stop that doesn&apos;t move against the plan. Every annotated
          chart here is Weinstein showing his stop and his entry logic{" "}
          <em>decided before the fact</em>, then simply letting the chart
          confirm or deny it — the same order of operations this journal
          tries to enforce by asking for both before a position is opened,
          not after.
        </p>
      </Section>

      <p className="text-xs text-parchment-faint pt-2 border-t border-line">
        <a
          href="https://www.amazon.com/2024-Stage-Analysis-Model-Weinstein/dp/B0F1FB96NJ"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-bright hover:underline"
        >
          2024 Stage Analysis Model Book — on Amazon
        </a>
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
