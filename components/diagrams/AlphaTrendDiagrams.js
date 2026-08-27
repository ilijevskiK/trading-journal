// Original illustrative diagrams for the AlphaTrend write-up.
// Schematic recreations of the concept, not TradingView screenshots
// (the real chart example lives in a separate captured screenshot).

import Frame from "./DiagramFrame";

export function AlphaTrendLineDiagram() {
  const price = "M10,150 L45,120 L70,135 L100,90 L130,105 L160,60 L195,80 L230,40 L260,65 L300,95 L330,140 L340,150";
  // Ratcheting trailing line: rises step-wise under price during the uptrend,
  // then flips above and steps down once momentum turns.
  const trail =
    "M10,175 L100,175 L100,150 L160,150 L160,110 L230,110 L230,90 " +
    "L260,90 L260,120 L300,120 L300,160 L330,160 L340,178";

  return (
    <Frame viewBox="0 0 350 195" title="AlphaTrend: ATR trailing line ratchets under price in an uptrend, then flips above on a downtrend">
      <path d={price} fill="none" className="stroke-parchment-dim" strokeWidth="2" />
      <path d={trail} fill="none" className="stroke-gold-bright" strokeWidth="3" />

      <text x="60" y="20" className="fill-parchment-dim font-mono" fontSize="9">
        price
      </text>
      <text x="15" y="192" className="fill-gold-bright font-mono" fontSize="9">
        AlphaTrend — trails as support in the uptrend
      </text>
      <text x="255" y="80" textAnchor="middle" className="fill-loss-bright font-mono" fontSize="9">
        flips to resistance
      </text>
    </Frame>
  );
}

export function AlphaTrendCrossDiagram() {
  // main line vs the 2-bar offset copy of itself
  const main = "M10,120 L60,60 L110,90 L160,40 L210,95 L260,60 L310,130";
  const offset = "M10,135 L60,90 L110,60 L160,90 L210,45 L260,95 L310,105";

  return (
    <Frame viewBox="0 0 320 160" title="AlphaTrend signal: main line crossing its own 2-bar offset copy">
      <path d="M60,60 L110,90 L110,60 L60,90 Z" className="fill-gain/20" />
      <path d="M210,95 L260,60 L260,95 L210,45 Z" className="fill-loss/20" />

      <path d={main} fill="none" className="stroke-gold-bright" strokeWidth="2.5" />
      <path d={offset} fill="none" className="stroke-parchment-faint" strokeWidth="2" strokeDasharray="3 3" />

      <circle cx="85" cy="75" r="3.5" className="fill-gain-bright" />
      <text x="85" y="120" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="9">
        BUY (green fill)
      </text>

      <circle cx="235" cy="70" r="3.5" className="fill-loss-bright" />
      <text x="235" y="30" textAnchor="middle" className="fill-loss-bright font-mono" fontSize="9">
        SELL (red fill)
      </text>

      <text x="10" y="150" className="fill-parchment-faint font-mono" fontSize="8">
        solid = AlphaTrend · dashed = 2-bar offset copy
      </text>
    </Frame>
  );
}
