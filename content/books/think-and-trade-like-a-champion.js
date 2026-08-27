import {
  PowerPlayDiagram,
  CheatEntryDiagram,
} from "@/components/diagrams/ThinkTradeChampionDiagrams";

export const meta = {
  slug: "think-and-trade-like-a-champion-minervini",
  title: "Think & Trade Like a Champion",
  author: "Mark Minervini",
  edition: "The Secrets, Rules & Blunt Truths of a Stock Market Wizard (2017)",
  category: "Momentum / Trading Psychology",
  summary:
    "Minervini's follow-up — less new theory, more advanced patterns (the Cheat entry, the Power Play) and the mindset work behind actually executing a system under pressure, including a psychology chapter co-authored with performance coach Jairek Robbins.",
  amazonUrl: "https://www.amazon.com/Think-Trade-Like-Champion-Secrets/dp/0996307931",
};

export default function ThinkAndTradeLikeAChampionContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          This 2017 follow-up to{" "}
          <em>Trade Like a Stock Market Wizard</em>, already in this library,
          isn&apos;t a rewrite of SEPA or the Trend Template — Minervini
          assumes those. Instead it&apos;s built around two things the first
          book covered more lightly: two advanced, higher-precision chart
          setups (backed by more than 80 real chart examples), and a full
          chapter on trading psychology co-written with performance coach
          Jairek Robbins. The title says the order on purpose — his own
          framing is that he had to learn to{" "}
          <em>think</em> like the traders he studied before he could{" "}
          <em>trade</em> like them.
        </p>
      </Section>

      <Section title="Risk-first, restated as an identity, not just a rule">
        <p>
          The book&apos;s second chapter makes the same point as the first
          book&apos;s position-sizing math, but frames it as a survival
          issue rather than an optimization one: if you can&apos;t cut a
          loser, Minervini argues, it&apos;s not a question of if that
          loser eventually gets big enough to end your trading — it&apos;s
          only a question of when. The rest of the book&apos;s more
          aggressive entries only make sense in that context — they&apos;re
          allowed to be more aggressive because the loss side of the trade
          is still capped exactly the same way.
        </p>
      </Section>

      <Section title="The Cheat (3C): an earlier, smaller entry">
        <p>
          The <strong className="text-parchment">Cheat</strong>, short for
          &quot;Cup Completion Cheat,&quot; is the earliest point Minervini
          says a position can reasonably be taken in a base that looks like
          a cup with two handles instead of one. The stock forms a first,
          shallow plateau — contained within roughly 5-10% high to low —
          before the base fully resolves into a second, more standard
          handle. Buying that first plateau feels early (hence the name),
          but because it sits closer to support, the stop is tighter and
          the risk is smaller than waiting for the fully confirmed second
          handle.
        </p>
        <CheatEntryDiagram />
        <p className="text-xs text-parchment-faint">
          Original recreation of the two-handle structure the book
          describes — not a reproduction of any specific chart in it.
        </p>
      </Section>

      <Section title="The Power Play: a high-tight flag">
        <p>
          The <strong className="text-parchment">Power Play</strong> (a
          high-tight flag) is the one setup Minervini says he&apos;ll take
          on price action alone, without waiting for the fundamental
          confirmation SEPA otherwise requires — because the pattern itself
          is rare and violent enough to be the signal. The criteria are
          specific: the stock has already surged{" "}
          <strong className="text-parchment">100% or more</strong> in eight
          weeks or less, then consolidates sideways in a tight range,
          pulling back no more than about{" "}
          <strong className="text-parchment">20-25%</strong> over roughly
          two to six weeks on noticeably lighter volume, before breaking
          out again in continuation of the original move.
        </p>
        <PowerPlayDiagram />
        <p className="text-xs text-parchment-faint">
          Original recreation of the surge/flag/continuation shape and its
          stated percentage bounds — not a reproduction of any specific
          chart in the book.
        </p>
      </Section>

      <Section title="Position management: sell half when in doubt">
        <p>
          For the moments a trade stops being clean — price stalls, doubt
          creeps in, but nothing has technically broken down — Minervini&apos;s
          rule is to sell half. If the stock keeps working, a meaningful
          position is still on for the rest of the move; if it rolls over
          into the stop instead, the trade is already close to breakeven or
          a small win rather than a full loss. He&apos;s also blunt about a
          related reality: no one exits at the exact top, and trying to is
          a worse habit than accepting a good exit and moving on.
        </p>
      </Section>

      <Section title="The psychology chapter">
        <p>
          Working with Jairek Robbins, Minervini treats the mental side as
          a skill trained the same way the technical side is, not an
          afterthought — covering fear and paralysis around pulling the
          trigger, the value of a fixed pre-market and post-market
          preparation routine, and an analogy he returns to often: traders
          rarely give their craft the years of deliberate, structured
          training that a doctor or lawyer is required to put in before
          being trusted with real stakes, then are surprised when the
          results don&apos;t match professions that do.
        </p>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          &quot;Sell half when in doubt&quot; is a concrete, partial-exit
          version of this journal&apos;s scale-out habit — a way to
          de-risk a stalling trade without forcing an all-or-nothing
          decision on incomplete information. And the book&apos;s
          risk-first framing is the same argument, restated, behind the
          &quot;stop not moved against the plan&quot; check already tied
          to the first Minervini book and to O&apos;Neil: the stop is what
          makes the more aggressive entries here (the Cheat, the Power
          Play) survivable at all, not a separate concern from them.
        </p>
      </Section>

      <p className="text-xs text-parchment-faint pt-2 border-t border-line">
        <a
          href="https://www.amazon.com/Think-Trade-Like-Champion-Secrets/dp/0996307931"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-bright hover:underline"
        >
          Think & Trade Like a Champion — on Amazon
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
