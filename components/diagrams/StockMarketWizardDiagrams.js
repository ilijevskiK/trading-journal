// Original illustrative diagrams for the "Trade Like a Stock Market Wizard"
// write-up. Schematic recreations of Minervini's Trend Template, VCP, and
// risk asymmetry concepts — not reproductions of any chart from the book.

import Frame from "./DiagramFrame";

export function TrendTemplateDiagram() {
  const price = "M20,55 C60,50 100,42 140,34 C190,25 240,18 320,10";
  const ma50 = "M20,80 C60,74 100,66 140,56 C190,46 240,36 320,24";
  const ma150 = "M20,105 C60,102 100,96 140,88 C190,76 240,62 320,44";
  const ma200 = "M20,125 C60,124 100,120 140,114 C190,104 240,90 320,68";

  return (
    <Frame
      viewBox="0 0 340 150"
      title="Trend Template: price above rising 50-day, above rising 150-day, above rising 200-day"
    >
      <path d={ma200} fill="none" className="stroke-parchment-faint" strokeWidth="2" />
      <path d={ma150} fill="none" className="stroke-gold-dim" strokeWidth="2" />
      <path d={ma50} fill="none" className="stroke-gold-bright" strokeWidth="2" />
      <path d={price} fill="none" className="stroke-parchment" strokeWidth="2.5" />

      <text x="322" y="8" className="fill-parchment font-mono" fontSize="8">price</text>
      <text x="322" y="26" className="fill-gold-bright font-mono" fontSize="8">50-day</text>
      <text x="322" y="46" className="fill-gold-dim font-mono" fontSize="8">150-day</text>
      <text x="322" y="70" className="fill-parchment-faint font-mono" fontSize="8">200-day</text>

      <text x="20" y="144" className="fill-parchment-dim font-mono" fontSize="8">
        correct stacking order, all three averages sloping up
      </text>
    </Frame>
  );
}

export function VCPDiagram() {
  const price =
    "M20,40 C40,70 55,95 70,80 C85,68 95,88 105,78 C115,70 122,82 130,76 C138,71 143,80 150,76 C158,71 165,60 180,45 C195,30 210,20 230,14";
  const contractions = [
    { x: 30, w: 40, label: "-20%" },
    { x: 90, w: 24, label: "-10%" },
    { x: 128, w: 14, label: "-5%" },
  ];
  const volumes = [30, 24, 18, 15, 12, 10, 9, 8, 32, 26, 22, 20];

  return (
    <Frame viewBox="0 0 250 190" title="Volatility Contraction Pattern: each pullback smaller than the last, then breakout on volume">
      <path d={price} fill="none" className="stroke-parchment" strokeWidth="2.5" />

      {contractions.map((c, i) => (
        <text key={i} x={c.x + c.w / 2} y="18" textAnchor="middle" className="fill-loss font-mono" fontSize="8">
          {c.label}
        </text>
      ))}

      {volumes.map((h, i) => (
        <rect
          key={i}
          x={22 + i * 18}
          y={168 - h}
          width="12"
          height={h}
          className={i >= 8 ? "fill-gain-bright" : "fill-parchment-faint"}
        />
      ))}

      <text x="22" y="182" className="fill-parchment-dim font-mono" fontSize="8">
        volume dries up through each contraction, then expands on breakout
      </text>
    </Frame>
  );
}

export function RiskRewardDiagram() {
  const losses = [-6, -5, -7, -4, -6, -5];
  const wins = [45, 78, 32, 110];

  return (
    <Frame viewBox="0 0 320 170" title="Small, capped losses funding a few large winners">
      <line x1="10" y1="70" x2="310" y2="70" className="stroke-line" strokeWidth="1.5" />

      {losses.map((v, i) => (
        <rect
          key={`l-${i}`}
          x={20 + i * 18}
          y={70}
          width="12"
          height={Math.abs(v) * 2.4}
          className="fill-loss"
        />
      ))}
      {wins.map((v, i) => (
        <rect
          key={`w-${i}`}
          x={140 + i * 34}
          y={70 - v * 0.9}
          width="24"
          height={v * 0.9}
          className="fill-gain-bright"
        />
      ))}

      <text x="20" y="150" className="fill-loss font-mono" fontSize="8">
        losses capped ~5-8%
      </text>
      <text x="140" y="20" className="fill-gain-bright font-mono" fontSize="8">
        winners left to run
      </text>
    </Frame>
  );
}
