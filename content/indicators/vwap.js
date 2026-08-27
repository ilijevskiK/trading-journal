import { VWAPSessionResetDiagram } from "@/components/diagrams/VWAPDiagrams";

export const meta = {
  slug: "vwap",
  name: "VWAP (Volume-Weighted Average Price)",
  developer: "Built-in",
  category: "Volume",
  summary:
    "The average price paid so far today, weighted by how much volume traded at each price — the standard intraday reference for a fair entry vs. chasing.",
};

export default function VwapContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          VWAP is a native charting calculation (<code className="font-mono text-xs">ta.vwap</code> in Pine),
          not a community-published script — there&apos;s no individual
          author to credit here the way there is for AlphaTrend or WaveTrend.
          It answers one specific question: at this moment, what&apos;s the
          average price everyone has actually paid today, once you weight
          each trade by how much size went through at that price?
        </p>
        <p>
          It plots a single line on the price chart. Institutional desks use
          it as a benchmark for execution quality — filling better than VWAP
          on a buy is a good fill. For this journal it serves a simpler,
          more personal purpose: a same-day reference for whether an entry is
          reasonable or already chased.
        </p>
      </Section>

      <Section title="How it's calculated">
        <p>For each bar, running from the start of the trading day:</p>
        <ol className="list-decimal list-inside space-y-1 text-parchment-dim font-mono text-xs">
          <li>Typical Price = (High + Low + Close) / 3</li>
          <li>Cumulative(Typical Price × Volume) ÷ Cumulative(Volume)</li>
        </ol>
        <p>
          Both sums reset to zero at the start of every new trading day — the
          calculation never looks back past today&apos;s first bar. That
          reset is what makes it a same-day fairness benchmark instead of a
          long-run moving average.
        </p>
        <VWAPSessionResetDiagram />
      </Section>

      <Section title="On daily/weekly charts, this line stops being useful">
        <p>
          The daily reset above is exactly why VWAP is fundamentally an{" "}
          <strong className="text-parchment">intraday</strong> tool. On this
          journal&apos;s 1H/4H timeframes, several bars share a session, so
          the running average actually accumulates into something meaningful.
          On the 1D/1W timeframes, each bar <em>is</em> its own entire
          session — the running sums reset every single bar, so VWAP
          mathematically reduces to that bar&apos;s own typical price. The
          math isn&apos;t wrong, it&apos;s just not telling you anything a
          plain candle wasn&apos;t already showing. Toggle it on 1H or 4H to
          get the real thing.
        </p>
      </Section>

      <Section title="How to read it">
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            <strong className="text-parchment">Price above VWAP</strong> —
            today&apos;s buyers are, on average, in profit; often read as
            intraday strength.
          </li>
          <li>
            <strong className="text-parchment">Price below VWAP</strong> —
            today&apos;s buyers are, on average, underwater; often read as
            intraday weakness.
          </li>
          <li>
            <strong className="text-parchment">
              Entering far above VWAP
            </strong>{" "}
            on a long — you&apos;re paying a premium over today&apos;s
            average fill, which isn&apos;t automatically wrong, but it&apos;s
            worth noticing rather than not noticing.
          </li>
        </ul>
        <p>
          Some feeds don&apos;t report volume for every symbol/interval
          (common on certain forex or index instruments). When that happens
          the line simply won&apos;t render for that stretch rather than
          showing a misleading flat average.
        </p>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          VWAP doesn&apos;t replace the one-sentence thesis or the stop —
          it&apos;s a same-day sanity check layered on top of a setup you
          already have a reason for. Used well, it&apos;s a second opinion on
          whether today&apos;s entry price is reasonable relative to
          everyone else who traded the name today, not a signal to size a
          position around on its own.
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
