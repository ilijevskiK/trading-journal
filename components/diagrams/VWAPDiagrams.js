// Original illustrative diagram for the VWAP write-up.
// Schematic recreation of the concept, not a TradingView screenshot.

import Frame from "./DiagramFrame";

function MiniCandle({ x, wickTop, wickBottom, bodyTop, bodyBottom }) {
  return (
    <g>
      <line x1={x} y1={wickTop} x2={x} y2={wickBottom} className="stroke-parchment-faint" strokeWidth="1.5" />
      <rect
        x={x - 6}
        y={Math.min(bodyTop, bodyBottom)}
        width="12"
        height={Math.max(2, Math.abs(bodyBottom - bodyTop))}
        className="fill-parchment-faint/20 stroke-parchment-faint"
        strokeWidth="1.5"
      />
    </g>
  );
}

// VWAP's cumulative sums reset at the start of each new trading day — shown
// here as two separate intraday sessions, each with its own VWAP line
// starting fresh rather than one continuous average across both.
export function VWAPSessionResetDiagram() {
  const day1Candles = [
    { x: 25, wickTop: 30, wickBottom: 70, bodyTop: 40, bodyBottom: 55 },
    { x: 55, wickTop: 20, wickBottom: 60, bodyTop: 28, bodyBottom: 45 },
    { x: 85, wickTop: 35, wickBottom: 75, bodyTop: 42, bodyBottom: 60 },
    { x: 115, wickTop: 25, wickBottom: 65, bodyTop: 32, bodyBottom: 50 },
    { x: 145, wickTop: 15, wickBottom: 55, bodyTop: 22, bodyBottom: 40 },
  ];
  const day2Candles = [
    { x: 205, wickTop: 40, wickBottom: 85, bodyTop: 48, bodyBottom: 68 },
    { x: 235, wickTop: 30, wickBottom: 75, bodyTop: 38, bodyBottom: 58 },
    { x: 265, wickTop: 45, wickBottom: 90, bodyTop: 55, bodyBottom: 75 },
    { x: 295, wickTop: 35, wickBottom: 80, bodyTop: 44, bodyBottom: 64 },
    { x: 325, wickTop: 25, wickBottom: 70, bodyTop: 34, bodyBottom: 54 },
  ];

  const vwap1 = "M25,60 C55,52 85,58 115,50 C130,46 140,42 150,40";
  const vwap2 = "M205,66 C235,60 265,72 295,62 C310,58 320,54 330,50";

  return (
    <Frame viewBox="0 0 350 190" title="VWAP resets its running average at the start of each new trading day">
      <text x="25" y="15" className="fill-parchment-faint font-mono" fontSize="8">
        Day 1
      </text>
      <text x="205" y="15" className="fill-parchment-faint font-mono" fontSize="8">
        Day 2
      </text>

      {day1Candles.map((c) => (
        <MiniCandle key={c.x} {...c} />
      ))}
      {day2Candles.map((c) => (
        <MiniCandle key={c.x} {...c} />
      ))}

      <path d={vwap1} fill="none" style={{ stroke: "#EC4899" }} strokeWidth="2" />
      <path d={vwap2} fill="none" style={{ stroke: "#EC4899" }} strokeWidth="2" />
      <text x="335" y="175" textAnchor="end" style={{ fill: "#EC4899" }} className="font-mono" fontSize="8">
        VWAP
      </text>

      <line x1="177" y1="10" x2="177" y2="130" strokeDasharray="3 4" className="stroke-line" strokeWidth="1.5" />
      <text x="177" y="145" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="8">
        new day —
      </text>
      <text x="177" y="157" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="8">
        VWAP resets
      </text>
    </Frame>
  );
}
