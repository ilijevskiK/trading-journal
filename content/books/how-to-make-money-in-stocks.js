export const meta = {
  slug: "how-to-make-money-in-stocks-oneil",
  title: "How to Make Money in Stocks",
  author: "William J. O'Neil",
  edition: "Fourth Edition: A Winning System in Good Times and Bad",
  category: "Growth Investing",
  summary:
    "O'Neil's CAN SLIM system, built from a historical study of the biggest stock market winners — growth characteristics, chart-based buy points, and a strict sell discipline.",
  amazonUrl: "https://www.amazon.com/How-Make-Money-Stocks-Winning/dp/0071614133",
};

export default function HowToMakeMoneyInStocksContent() {
  return (
    <div className="space-y-10">
      <Section title="What it is">
        <p>
          William O&apos;Neil founded Investor&apos;s Business Daily and, at
          30, bought a seat on the New York Stock Exchange with money made
          trading his own account. This book — first published in 1988 and
          revised several times since — isn&apos;t built from theory; it
          comes out of a historical study O&apos;Neil&apos;s firm ran on the
          biggest winning stocks going back decades (this fourth edition
          extends the study through 2008–2009), looking for the traits those
          winners shared before their major moves. CAN SLIM is the acronym
          he built from those shared traits.
        </p>
      </Section>

      <Section title="The CAN SLIM system">
        <p>
          Seven characteristics, each one a letter, meant to be used
          together rather than in isolation:
        </p>
        <ul className="list-disc list-inside space-y-1 text-parchment-dim">
          <li>
            <strong className="text-parchment">C</strong> — Current
            quarterly earnings per share, up sharply versus the same
            quarter a year earlier.
          </li>
          <li>
            <strong className="text-parchment">A</strong> — Annual earnings
            growth, strong over the past several years, not just one good
            quarter.
          </li>
          <li>
            <strong className="text-parchment">N</strong> — Something{" "}
            <em>new</em>: a new product, new management, a new industry
            condition, or the stock making a new price high — O&apos;Neil&apos;s
            research found new highs are far more often followed by further
            gains than by reversals, the opposite of the common instinct to
            treat a new high as &quot;expensive.&quot;
          </li>
          <li>
            <strong className="text-parchment">S</strong> — Supply and
            demand: a reasonable share count, and ideally confirmation like
            volume surging on up days or the company buying back its own
            stock.
          </li>
          <li>
            <strong className="text-parchment">L</strong> — Leader, not
            laggard: strong relative price strength versus the rest of the
            market, not a cheap stock hoping to catch up.
          </li>
          <li>
            <strong className="text-parchment">I</strong> — Institutional
            sponsorship, increasing — funds and other large holders
            accumulating provides the sustained buying a stock needs for a
            real move.
          </li>
          <li>
            <strong className="text-parchment">M</strong> — Market
            direction: the state of the overall market indices, which
            O&apos;Neil treats as the single most important factor of all.
          </li>
        </ul>
      </Section>

      <Section title="Chart patterns and the buy point">
        <p>
          O&apos;Neil is precise about timing, not just stock selection. His
          most emphasized setup is the{" "}
          <strong className="text-parchment">cup-with-handle</strong>: a
          stock rises, corrects over several weeks or months forming a
          rounded &quot;cup,&quot; then drifts in a shorter, shallower
          pullback (the &quot;handle&quot;) before breaking out above that
          handle&apos;s high on above-average volume. That breakout level is
          the <strong className="text-parchment">pivot point</strong> — the
          specific, pre-defined price he says a stock should actually be
          bought at, not before it (chasing an extended move) and not long
          after (missing the point where institutional buying is
          confirmed).
        </p>
      </Section>

      <Section title="The sell discipline: cut losses at 7-8%, no exceptions">
        <p>
          The rule O&apos;Neil is most associated with: sell without
          hesitation if a new purchase drops 7-8% below what you paid. No
          waiting for it to come back, no rationalizing the story. He&apos;s
          explicit that this single rule, followed mechanically, is what
          keeps an inevitable string of wrong picks (even a good system is
          often wrong close to half the time) from turning into serious
          account damage — the loss stays small and survivable every time.
          On the other side, his general guidance for winners is to take at
          least some profit around a 20-25% gain in normal market
          conditions, and to let the strongest leaders run further using
          trailing methods (like a rising moving average) rather than a
          fixed target, so the wins are sized to matter against all the
          small, cut-early losses.
        </p>
      </Section>

      <Section title="Market direction dominates everything else">
        <p>
          O&apos;Neil&apos;s repeated point, reinforced with his own market
          studies: roughly three out of every four stocks will follow the
          direction of the general market, no matter how good their
          individual CAN SLIM characteristics look. A great stock in a
          market downtrend is still fighting a strong headwind, and a
          mediocre one in a strong uptrend gets carried further than it
          probably deserves. He devotes real space to reading distribution
          days (heavy-volume down days in the major indices, a sign of
          institutional selling) as an early warning that a market uptrend
          is weakening — the same signal, read in reverse, as the
          institutional-sponsorship idea in the &quot;I.&quot;
        </p>
      </Section>

      <Section title="How this fits the discipline rules in this journal">
        <p>
          This is the book the discipline checklist in this journal is most
          directly descended from — the 7-8% cut-losses-without-exception
          rule is the same principle behind &quot;stop not moved against
          the plan,&quot; and the scale-out exit model (sell into strength
          in thirds rather than picking one exit price) mirrors
          O&apos;Neil&apos;s take-partial-profits-then-let-leaders-run
          approach rather than an all-or-nothing target. The bigger lesson
          underneath both: O&apos;Neil&apos;s system accepts being wrong
          often as a normal cost of the approach, and puts all its
          engineering effort into making sure being wrong stays cheap.
        </p>
      </Section>

      <p className="text-xs text-parchment-faint pt-2 border-t border-line">
        <a
          href="https://www.amazon.com/How-Make-Money-Stocks-Winning/dp/0071614133"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-bright hover:underline"
        >
          How to Make Money in Stocks, Fourth Edition — on Amazon
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
