// Original illustrative diagram for the ATR write-up.
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

// A run of narrow-range bars, then a wide-range bar, then narrowing back
// down — the smoothed ATR line below rises with the wide bar and eases back
// down after, illustrating "ATR reflects typical range, not just the last
// bar" and its direct use as a stop-distance yardstick.
export function ATRStopDistanceDiagram() {
  const candles = [
    { x: 25, wickTop: 45, wickBottom: 65, bodyTop: 50, bodyBottom: 60 },
    { x: 55, wickTop: 43, wickBottom: 67, bodyTop: 49, bodyBottom: 61 },
    { x: 85, wickTop: 47, wickBottom: 63, bodyTop: 51, bodyBottom: 59 },
    { x: 115, wickTop: 15, wickBottom: 90, bodyTop: 28, bodyBottom: 75 },
    { x: 145, wickTop: 20, wickBottom: 85, bodyTop: 30, bodyBottom: 68 },
    { x: 175, wickTop: 30, wickBottom: 75, bodyTop: 38, bodyBottom: 63 },
    { x: 205, wickTop: 40, wickBottom: 68, bodyTop: 46, bodyBottom: 60 },
    { x: 235, wickTop: 44, wickBottom: 64, bodyTop: 49, bodyBottom: 59 },
  ];

  const atrPath =
    "M25,150 C55,150 85,150 115,148 C130,140 140,128 150,120 C165,112 185,108 205,108 C220,108 230,109 235,110";

  return (
    <Frame viewBox="0 0 260 190" title="A wide-range bar lifts the smoothed ATR line; it eases back as range normalizes">
      <text x="10" y="12" className="fill-parchment-faint font-mono" fontSize="8">
        price
      </text>
      {candles.map((c) => (
        <MiniCandle key={c.x} {...c} />
      ))}

      <line x1="115" y1="10" x2="115" y2="95" strokeDasharray="2 4" className="stroke-loss/40" strokeWidth="1" />
      <text x="115" y="105" textAnchor="middle" className="fill-loss-bright font-mono" fontSize="8">
        wide-range bar
      </text>

      <line x1="5" y1="100" x2="255" y2="100" className="stroke-line" strokeWidth="1" />
      <text x="10" y="112" className="fill-parchment-faint font-mono" fontSize="8">
        ATR(14)
      </text>
      <path d={atrPath} fill="none" style={{ stroke: "#84CC16" }} strokeWidth="2" />

      <text x="130" y="172" textAnchor="middle" style={{ fill: "#84CC16" }} className="font-mono" fontSize="8">
        ATR rises with typical range —
      </text>
      <text x="130" y="184" textAnchor="middle" style={{ fill: "#84CC16" }} className="font-mono" fontSize="8">
        a wider stop is justified, not sloppy
      </text>
    </Frame>
  );
}
