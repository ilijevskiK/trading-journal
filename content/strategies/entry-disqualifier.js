import { RelativeStrengthDiagram } from "@/components/diagrams/StageAnalysisModelDiagrams";

export const meta = {
  slug: "entry-disqualifier-noise-filter",
  title: "Entry Disqualifier — Noise Filter",
  category: "Risk Filter",
  summary:
    "A checklist, not a signal — seven specific reasons to skip a trade (wrong stage, weak market, underperformance, extension, chop, drying volume, a base that isn't tightening). A clean reading means the noise has been filtered out, not that the trade is a buy.",
};

export default function EntryDisqualifierContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          Every other strategy in this library, including the{" "}
          <em>Stage Analysis Breakout Strategy</em> already here, tells you
          when a specific setup is present. This tool does the opposite on
          purpose: it doesn&apos;t generate a buy signal at all. It checks
          seven separate, specific reasons a chart might be noise right now
          — wrong stage, a weak broad market, underperformance,
          overextension, no real trend, fading volume, a base that
          hasn&apos;t tightened up — and reports how many of them are
          currently true. A clean reading means none of the seven
          disqualifiers apply. It does not mean buy. The thesis, the
          position size, and the stop are still entirely on you.
        </p>
      </Section>

      <Section title="The seven disqualifiers">
        <ul className="list-disc list-inside space-y-2 text-parchment-dim">
          <li>
            <strong className="text-parchment">Wrong stage.</strong> Using
            the same 30-week MA and slope test as the Stage Analysis
            strategy, the stock isn&apos;t currently in a confirmed Stage 2
            (rising average, price above it).
          </li>
          <li>
            <strong className="text-parchment">Market regime weak.</strong>{" "}
            The exact same stage test, applied to a benchmark (SPY by
            default) instead of the stock itself. O&apos;Neil&apos;s
            &quot;M&quot; and Weinstein&apos;s market-timing point, both
            already covered in this library, made into one check: don&apos;t
            fight a market that isn&apos;t in Stage 2 either.
          </li>
          <li>
            <strong className="text-parchment">Underperforming the
            benchmark.</strong> The stock&apos;s price divided by the
            benchmark&apos;s price — the relative-strength line already
            described in the Stage Analysis model book write-up — sitting
            below its own moving average.
          </li>
          <li>
            <strong className="text-parchment">Extended.</strong> Price
            already too far above the 30-week average (a configurable
            percentage). A genuinely good stock can still be a bad entry if
            it&apos;s been chased too far past the point the trend was
            actually confirmed.
          </li>
          <li>
            <strong className="text-parchment">Choppy — no real
            trend.</strong> Average Directional Index (ADX) below a
            threshold. A stock can technically sit above a rising average
            while the actual trend strength underneath it is close to
            random chop.
          </li>
          <li>
            <strong className="text-parchment">Volume drying up.</strong>{" "}
            Current volume below a fraction of its own recent average — a
            direct, mechanical version of Weinstein&apos;s point that
            conviction shows up in volume, and its absence is itself
            information.
          </li>
          <li>
            <strong className="text-parchment">Base not tightening.</strong>{" "}
            The most recent trading range isn&apos;t meaningfully narrower
            than the range before it — the same volatility-contraction idea
            behind Minervini&apos;s VCP, already covered in this library,
            reduced to a single ratio.
          </li>
        </ul>
        <RelativeStrengthDiagram />
        <p className="text-xs text-parchment-faint">
          Original diagram, reused from the Stage Analysis model book
          write-up — the same relative-strength concept behind the
          underperformance check above.
        </p>
      </Section>

      <Section title="Reading it: a count, not a verdict">
        <p>
          Every one of the seven checks is independent, and the script sums
          however many are currently true into a single number. Zero active
          disqualifiers is reported as a clean, &quot;noise-free&quot;
          reading — deliberately not plotted as a bold buy arrow, just a
          small, quiet dot below the bar and a subtle background tint,
          because that&apos;s exactly what it is: the absence of known
          reasons to skip, not the presence of a reason to act. A sample
          reading looks like this:
        </p>
        <div className="rounded-lg border border-line overflow-hidden text-xs font-mono">
          <div className="grid grid-cols-[1fr_auto] bg-surface-alt text-parchment">
            <div className="px-3 py-1.5">Disqualifiers</div>
            <div className="px-3 py-1.5 border-l border-line">1 active</div>
          </div>
          <ChecklistRow label="Wrong stage (not Stage 2)" clear />
          <ChecklistRow label={"Market (SPY) not Stage 2"} clear />
          <ChecklistRow label="Underperforming benchmark" clear />
          <ChecklistRow label="Extended (chasing)" clear={false} />
          <ChecklistRow label="Choppy / no real trend (ADX)" clear />
          <ChecklistRow label="Volume drying up" clear />
          <ChecklistRow label="Base not tightening" clear />
          <div className="grid grid-cols-[1fr_auto] bg-surface-alt text-parchment">
            <div className="px-3 py-1.5">Reading</div>
            <div className="px-3 py-1.5 border-l border-line">
              1 reason(s) to skip
            </div>
          </div>
        </div>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          This tool is close to a mechanical version of this journal&apos;s
          own &quot;thesis written&quot; check — it doesn&apos;t replace
          writing the thesis, it gives the thesis something concrete to
          survive before it&apos;s trusted. In effect it&apos;s a single
          filter built from pieces of every book and strategy already in
          this library: Weinstein&apos;s stage and market-timing logic,
          O&apos;Neil&apos;s market-direction point, the relative-strength
          idea from the Stage Analysis model book, and Minervini&apos;s
          tightening-base concept from VCP — used together specifically to
          talk a trader{" "}
          <em>out</em> of a trade, which is a much harder discipline than
          finding reasons to get in.
        </p>
      </Section>
    </div>
  );
}

function ChecklistRow({ label, clear }) {
  return (
    <div className="grid grid-cols-[1fr_auto] border-t border-line">
      <div
        className={`px-3 py-1.5 ${clear ? "bg-gain/10 text-parchment-dim" : "bg-loss/15 text-parchment"}`}
      >
        {label}
      </div>
      <div
        className={`px-3 py-1.5 border-l border-line ${clear ? "bg-gain/10 text-gain-bright" : "bg-loss/15 text-loss-bright"}`}
      >
        {clear ? "clear" : "SKIP"}
      </div>
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
