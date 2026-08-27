import {
  TrendTemplateDiagram,
  VCPDiagram,
  RiskRewardDiagram,
} from "@/components/diagrams/StockMarketWizardDiagrams";

export const meta = {
  slug: "trade-like-a-stock-market-wizard-minervini",
  title: "Trade Like a Stock Market Wizard",
  author: "Mark Minervini",
  edition: "How to Achieve Super Performance in Stocks in Any Market (2013)",
  category: "Momentum / Growth",
  summary:
    "Minervini's SEPA framework — a strict Trend Template for qualifying a stock, the Volatility Contraction Pattern for timing entry, and a risk-first position-sizing formula behind his record-setting returns.",
  amazonUrl: "https://www.amazon.com/Trade-Like-Stock-Market-Wizard/dp/0071807225",
};

export default function TradeLikeAStockMarketWizardContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          Mark Minervini turned a few thousand dollars into a multi-million
          dollar trading account, then proved it wasn&apos;t luck by winning
          the U.S. Investing Championship twice, twenty-four years apart —{" "}
          <strong className="text-parchment">155%</strong> in 1997 trading
          his own $250,000 while only about 50% invested on average, and a
          record <strong className="text-parchment">334.8%</strong> in the
          $1 million division in 2021. Between those two wins, from 1994 to
          2000, he averaged roughly{" "}
          <strong className="text-parchment">220% a year</strong> with only
          a single losing quarter. This 2013 book, backed by more than 160
          real chart examples, is his attempt to turn that track record into
          a repeatable, teachable system rather than a story about talent.
        </p>
      </Section>

      <Section title="SEPA: the full framework, not just a chart pattern">
        <p>
          SEPA stands for{" "}
          <strong className="text-parchment">
            Specific Entry Point Analysis
          </strong>{" "}
          — Minervini&apos;s trademarked name for the whole pipeline, because
          he&apos;s explicit that no single piece of it works in isolation.
          It layers, in order: a strict{" "}
          <strong className="text-parchment">trend</strong> qualification
          (below), a{" "}
          <strong className="text-parchment">fundamentals</strong> screen
          for accelerating earnings and sales growth that overlaps heavily
          with the &quot;C&quot; and &quot;A&quot; of O&apos;Neil&apos;s CAN
          SLIM, a <strong className="text-parchment">catalyst</strong> for
          why the stock could re-rate now, and finally a precise{" "}
          <strong className="text-parchment">entry point</strong> — the
          Volatility Contraction Pattern — that exists purely to keep risk
          small and known at the moment of the trade.
        </p>
      </Section>

      <Section title="The Trend Template — 8 non-negotiable conditions">
        <p>
          Before a stock is even considered, it has to pass all eight of
          these simultaneously. Minervini treats this as a hard filter, not
          a scoring system — missing even one disqualifies the stock:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-parchment-dim">
          <li>Price is above both the 150-day and 200-day moving averages.</li>
          <li>The 150-day average is above the 200-day average.</li>
          <li>
            The 200-day average has been trending up for at least a month
            (Minervini prefers 4-5 months or more).
          </li>
          <li>
            The 50-day average is above both the 150-day and 200-day
            averages.
          </li>
          <li>Price is above the 50-day average.</li>
          <li>Price is at least 30% above its 52-week low.</li>
          <li>
            Price is within 25% of its 52-week high — the closer to a new
            high, the better.
          </li>
          <li>
            Relative Strength ranking (as published by Investor&apos;s
            Business Daily) is 70 or higher.
          </li>
        </ol>
        <TrendTemplateDiagram />
        <p className="text-xs text-parchment-faint">
          Original recreation of the required stacking order — not a
          reproduction of any chart from the book.
        </p>
        <p>
          Read as a whole, the eight conditions are really one idea stated
          eight different ways: the stock has to already be in a confirmed
          uptrend on every timeframe that matters, and already acting
          stronger than most of the market — the same underlying claim as
          Weinstein&apos;s Stage 2, just turned into eight checkable
          numbers instead of a visual judgment call.
        </p>
      </Section>

      <Section title="VCP: the entry pattern">
        <p>
          The{" "}
          <strong className="text-parchment">
            Volatility Contraction Pattern
          </strong>{" "}
          is Minervini&apos;s answer to &quot;now that the stock qualifies,
          exactly where do I buy it.&quot; A qualifying stock pulls back in
          a series of 2 to 6 waves, each one shallower than the last — a
          rough progression like 20%, then 10%, then 5% — as volume dries
          up further with each contraction. The pattern reads as sellers
          running out of supply: each new low attracts buyers a little
          sooner than the last one did. The buy signal is a breakout above
          the high of the final, tightest contraction (the{" "}
          <strong className="text-parchment">pivot</strong>), ideally on a
          volume surge.
        </p>
        <VCPDiagram />
        <p className="text-xs text-parchment-faint">
          Original recreation of the contraction/volume pattern the book
          describes — not a reproduction of any specific chart in it.
        </p>
      </Section>

      <Section title="Position sizing and risk — the math behind the returns">
        <p>
          Minervini is explicit that the returns come from risk control
          first, stock-picking second. His stated rule: risk no more than
          1.25% of total equity per trade on average, 2.5% as an absolute
          ceiling, with individual stops typically 5-8% below entry and
          never more than 10%. Position size is then solved backwards from
          that risk budget rather than picked by feel:
        </p>
        <div className="rounded-md border border-line bg-surface-alt p-4 font-mono text-xs text-parchment-dim space-y-2">
          <div>
            <span className="text-gold-bright">Position size</span> =
            (account size × risk %) ÷ (entry price − stop price)
          </div>
          <div className="text-parchment-faint">
            e.g. a 7% stop, at 1.25% account risk, allows roughly an 18%
            position — a wider stop forces a smaller position, a tighter
            stop allows a larger one, so the dollars at risk stay constant
            either way.
          </div>
        </div>
        <RiskRewardDiagram />
        <p className="text-xs text-parchment-faint">
          Original illustration of the asymmetry Minervini describes — small
          capped losses, funding a small number of large winners left to
          run — not data from any specific account.
        </p>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          The position-sizing formula here is the same risk ÷
          stop-distance logic already covered in this journal via the
          Turtles — Minervini just adds an explicit account-level ceiling
          (1.25-2.5%) on top of it. The Trend Template is a stricter,
          numeric version of the &quot;M&quot; and stage-based checks this
          journal already leans on from O&apos;Neil and Weinstein — all
          three books converge on the same requirement, that a trade thesis
          means nothing if the broader trend and relative strength
          aren&apos;t confirmed first. And the 5-8% stop discipline,
          decided before entry rather than during the trade, is exactly
          what this journal&apos;s &quot;stop not moved against the
          plan&quot; check is meant to enforce.
        </p>
      </Section>

      <p className="text-xs text-parchment-faint pt-2 border-t border-line">
        <a
          href="https://www.amazon.com/Trade-Like-Stock-Market-Wizard/dp/0071807225"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-bright hover:underline"
        >
          Trade Like a Stock Market Wizard — on Amazon
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
