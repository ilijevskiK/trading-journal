import { ATRStopDistanceDiagram } from "@/components/diagrams/ATRDiagrams";

export const meta = {
  slug: "atr",
  name: "ATR (Average True Range)",
  developer: "Built-in",
  category: "Volatility",
  summary:
    "Wilder's smoothed measure of a name's typical bar-to-bar range — a direct, objective input for sizing a stop distance instead of guessing.",
};

export default function AtrContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          ATR is another native charting calculation (
          <code className="font-mono text-xs">ta.atr</code> in Pine),
          published originally by J. Welles Wilder in{" "}
          <em>New Concepts in Technical Trading Systems</em> (1978) — not a
          third-party community script, so there&apos;s no TradingView author
          to attribute the way AlphaTrend or SMC have.
        </p>
        <p>
          It plots a single line, in the instrument&apos;s own price units,
          representing how large a &quot;typical&quot; bar has been
          recently. It doesn&apos;t care about direction — a big up bar and a
          big down bar both push it the same way. It&apos;s a volatility
          reading, not a trend or momentum signal.
        </p>
      </Section>

      <Section title="How it's calculated">
        <p>Two steps, both already used elsewhere in this app&apos;s own indicator math:</p>
        <ol className="list-decimal list-inside space-y-1 text-parchment-dim font-mono text-xs">
          <li>
            True Range = max(High−Low, |High−PrevClose|, |Low−PrevClose|)
          </li>
          <li>ATR = Wilder&apos;s RMA of True Range over 14 bars (default)</li>
        </ol>
        <p>
          True Range (step 1) matters because a plain High−Low would miss a
          gap — if a stock gaps down overnight and then trades in a tight
          range, the real range that day includes the gap, not just that
          day&apos;s candle. Wilder&apos;s RMA smoothing (step 2) is the same
          smoothing this journal&apos;s own ADX/DMI math already uses
          internally — it reacts to a volatility spike without being
          whipsawed by any single outlier bar.
        </p>
        <ATRStopDistanceDiagram />
      </Section>

      <Section title="Using it for stop distance">
        <p>
          This is the actual reason it&apos;s worth having on this chart:
          ATR gives an objective answer to &quot;how far away should my stop
          be?&quot; instead of picking a round number or a percentage that
          has nothing to do with how this specific name actually moves.
        </p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            A common starting point is <strong className="text-parchment">1–2× ATR</strong>{" "}
            away from entry — tight enough to actually mean something as an
            invalidation level, wide enough that ordinary daily noise
            doesn&apos;t stop you out of a trade that was never actually
            wrong.
          </li>
          <li>
            A stop <em>tighter</em> than roughly 1× ATR is often just
            noise-distance, not a real invalidation level — the name
            routinely moves that much without its thesis changing at all.
          </li>
          <li>
            A high-ATR name isn&apos;t automatically a bad trade — it just
            means the position should usually be sized smaller to keep the
            dollar risk the same, which is exactly what this journal&apos;s
            own position-size calculator on the New Trade form already does
            with your stop distance, whatever informed it.
          </li>
        </ul>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          ATR turns &quot;where should my stop go&quot; into a number derived
          from how the stock actually trades, rather than a guess. It still
          doesn&apos;t replace the thesis or the pre-mortem — a wide ATR
          doesn&apos;t justify skipping the stop, it just tells you how far
          away a stop has to be to represent a real change of mind instead of
          routine chop.
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
