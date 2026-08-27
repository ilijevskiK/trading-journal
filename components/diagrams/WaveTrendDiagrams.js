// Original illustrative diagrams for the WaveTrend Oscillator [WT] write-up.
// Schematic recreations of the concept, not TradingView screenshots.

import Frame from "./DiagramFrame";

export function WaveTrendSignalDiagram() {
  // WT1 (fast) and WT2 (slow) oscillating between overbought/oversold bands.
  const wt1 = "M10,90 C40,20 60,10 90,35 C120,60 130,95 150,120 C170,145 190,155 210,140 C235,120 250,60 270,35 C290,10 300,5 320,20";
  const wt2 = "M10,95 C40,55 60,25 90,40 C120,58 135,90 150,115 C168,138 188,150 210,148 C232,130 252,80 270,45 C288,15 300,10 320,18";

  return (
    <Frame viewBox="0 0 330 190" title="WaveTrend: WT1/WT2 crossovers against overbought/oversold bands">
      {/* zero line */}
      <line x1="5" y1="95" x2="325" y2="95" className="stroke-line" strokeWidth="1.5" />
      {/* overbought bands */}
      <line x1="5" y1="35" x2="325" y2="35" strokeDasharray="4 4" className="stroke-loss/50" strokeWidth="1.5" />
      <line x1="5" y1="48" x2="325" y2="48" strokeDasharray="2 5" className="stroke-loss/30" strokeWidth="1" />
      {/* oversold bands */}
      <line x1="5" y1="150" x2="325" y2="150" strokeDasharray="4 4" className="stroke-gain/50" strokeWidth="1.5" />
      <line x1="5" y1="140" x2="325" y2="140" strokeDasharray="2 5" className="stroke-gain/30" strokeWidth="1" />

      <text x="10" y="28" className="fill-loss-bright font-mono" fontSize="9">
        overbought (60 / 53)
      </text>
      <text x="10" y="168" className="fill-gain-bright font-mono" fontSize="9">
        oversold (-60 / -53)
      </text>

      <path d={wt1} fill="none" className="stroke-gold-bright" strokeWidth="2" />
      <path d={wt2} fill="none" className="stroke-parchment-faint" strokeWidth="1.5" strokeDasharray="3 3" />

      <circle cx="150" cy="118" r="3.5" className="fill-gain-bright" />
      <text x="150" y="105" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="9">
        BUY
      </text>

      <circle cx="270" cy="38" r="3.5" className="fill-loss-bright" />
      <text x="270" y="55" textAnchor="middle" className="fill-loss-bright font-mono" fontSize="9">
        SELL
      </text>

      <text x="320" y="102" textAnchor="end" className="fill-parchment-faint font-mono" fontSize="8">
        WT1 (solid) / WT2 (dashed)
      </text>
    </Frame>
  );
}

export function WaveTrendDivergenceDiagram() {
  const pricePath = "M15,20 L55,45 L95,30 L145,75 L195,55 L235,40";
  const wtPath = "M15,110 L55,120 L95,105 L145,100 L195,70 L235,55";

  return (
    <Frame viewBox="0 0 250 190" title="Bullish divergence: price makes a lower low while WT1 makes a higher low">
      <text x="125" y="12" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="8">
        price
      </text>
      <path d={pricePath} fill="none" className="stroke-parchment-dim" strokeWidth="2" />
      <circle cx="95" cy="30" r="3" className="fill-parchment" />
      <circle cx="145" cy="75" r="3" className="fill-loss-bright" />
      <line x1="95" y1="30" x2="145" y2="75" strokeDasharray="3 3" className="stroke-loss/50" strokeWidth="1" />
      <text x="145" y="90" textAnchor="middle" className="fill-loss-bright font-mono" fontSize="8">
        lower low
      </text>

      <line x1="5" y1="97" x2="245" y2="97" className="stroke-line" strokeWidth="1" />
      <text x="15" y="106" className="fill-parchment-faint font-mono" fontSize="8">
        WT1
      </text>
      <path d={wtPath} fill="none" className="stroke-gold-bright" strokeWidth="2" />
      <circle cx="95" cy="105" r="3" className="fill-parchment" />
      <circle cx="145" cy="100" r="3" className="fill-gain-bright" />
      <line x1="95" y1="105" x2="145" y2="100" strokeDasharray="3 3" className="stroke-gain/50" strokeWidth="1" />
      <text x="125" y="140" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="9">
        higher low —
      </text>
      <text x="125" y="153" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="9">
        bullish divergence
      </text>
    </Frame>
  );
}

// A plain candle — a wick line plus a body rect, no up/down coloring of its
// own (this diagram isn't about that). `highlight` optionally overrides it
// with a translucent fill/wick/border, matching what this journal's chart
// actually does to a bar when a WT1/WT2 cross lands on it.
function MiniCandle({ x, wickTop, wickBottom, bodyTop, bodyBottom, highlight }) {
  const fillClass =
    highlight === "bull" ? "fill-gain/50" : highlight === "bear" ? "fill-loss/50" : "fill-parchment-faint/25";
  const strokeClass =
    highlight === "bull" ? "stroke-gain" : highlight === "bear" ? "stroke-loss" : "stroke-parchment-faint";
  return (
    <g>
      <line x1={x} y1={wickTop} x2={x} y2={wickBottom} className={strokeClass} strokeWidth="1.5" />
      <rect
        x={x - 6}
        y={Math.min(bodyTop, bodyBottom)}
        width="12"
        height={Math.max(2, Math.abs(bodyBottom - bodyTop))}
        className={`${fillClass} ${strokeClass}`}
        strokeWidth="1.5"
      />
    </g>
  );
}

// Illustrates this journal's own addition on top of LazyBear's original
// script: a WT1/WT2 cross is marked with a colored circle right on the
// WaveTrend pane, and the candle at that same bar is tinted (50%-opacity
// gain/loss) on the price chart above it — so the cross is visible in both
// places at once, not just down in the oscillator.
export function WaveTrendCrossHighlightDiagram() {
  const candles = [
    { x: 20, wickTop: 30, wickBottom: 60, bodyTop: 38, bodyBottom: 52 },
    { x: 50, wickTop: 25, wickBottom: 55, bodyTop: 30, bodyBottom: 46 },
    { x: 80, wickTop: 35, wickBottom: 65, bodyTop: 42, bodyBottom: 58 },
    { x: 110, wickTop: 20, wickBottom: 58, bodyTop: 26, bodyBottom: 50, highlight: "bull" },
    { x: 140, wickTop: 15, wickBottom: 45, bodyTop: 18, bodyBottom: 34 },
    { x: 170, wickTop: 12, wickBottom: 40, bodyTop: 16, bodyBottom: 28 },
    { x: 200, wickTop: 18, wickBottom: 48, bodyTop: 22, bodyBottom: 38 },
    { x: 230, wickTop: 22, wickBottom: 62, bodyTop: 28, bodyBottom: 56, highlight: "bear" },
    { x: 260, wickTop: 30, wickBottom: 68, bodyTop: 38, bodyBottom: 60 },
    { x: 290, wickTop: 34, wickBottom: 66, bodyTop: 40, bodyBottom: 56 },
    { x: 320, wickTop: 28, wickBottom: 58, bodyTop: 34, bodyBottom: 50 },
  ];

  const wt1 = "M10,170 C40,140 60,115 90,122 C105,126 112,134 118,142 C135,164 155,182 175,175 C195,168 205,148 215,138 C222,131 226,126 232,124 C255,116 275,100 300,96 C310,94 320,92 330,90";
  const wt2 = "M10,175 C40,158 60,132 90,132 C105,133 114,136 120,140 C138,152 158,172 175,180 C195,188 208,166 216,150 C222,138 228,130 232,128 C255,118 275,104 300,100 C310,98 320,95 330,92";

  return (
    <Frame
      viewBox="0 0 340 230"
      title="A WT1/WT2 cross marks the WaveTrend pane and tints the same candle on the price chart"
    >
      <text x="10" y="12" className="fill-parchment-faint font-mono" fontSize="8">
        price
      </text>
      {candles.map((c) => (
        <MiniCandle key={c.x} {...c} />
      ))}

      <line x1="5" y1="150" x2="335" y2="150" className="stroke-line" strokeWidth="1" />
      <text x="10" y="147" className="fill-parchment-faint font-mono" fontSize="8">
        WaveTrend (WT1 solid / WT2 dashed)
      </text>
      <path d={wt1} fill="none" className="stroke-gold-bright" strokeWidth="2" />
      <path d={wt2} fill="none" className="stroke-parchment-faint" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Bullish cross: candle #4 tinted green above, green cross marker below,
          dashed guide tying the two together. */}
      <line x1="110" y1="76" x2="110" y2="138" strokeDasharray="2 4" className="stroke-gain/40" strokeWidth="1" />
      <circle cx="110" cy="138" r="4" className="fill-gain-bright" />
      <text x="110" y="200" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="8">
        bullish cross
      </text>

      {/* Bearish cross: candle #8 tinted red above, red cross marker below. */}
      <line x1="230" y1="76" x2="230" y2="129" strokeDasharray="2 4" className="stroke-loss/40" strokeWidth="1" />
      <circle cx="230" cy="129" r="4" className="fill-loss-bright" />
      <text x="230" y="200" textAnchor="middle" className="fill-loss-bright font-mono" fontSize="8">
        bearish cross
      </text>
    </Frame>
  );
}
