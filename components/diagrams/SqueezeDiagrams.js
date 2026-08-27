// Original illustrative diagrams for the Squeeze Momentum Indicator write-up.
// Schematic recreations of the concept, not TradingView screenshots.

import Frame from "./DiagramFrame";

export function SqueezeBandsDiagram() {
  const upperKC = "M20,55 C100,58 160,60 210,60 C250,60 300,56 340,48";
  const lowerKC = "M20,135 C100,132 160,130 210,130 C250,130 300,134 340,142";
  const upperBB = "M20,48 C70,68 120,80 170,82 C210,84 240,72 270,45 C295,22 315,10 340,4";
  const lowerBB = "M20,142 C70,122 120,108 170,103 C210,101 240,113 270,148 C290,168 310,180 325,186";

  return (
    <Frame viewBox="0 0 360 210" title="Squeeze: Bollinger Bands pulled inside Keltner Channels, then released">
      <path d={upperKC} fill="none" className="stroke-gold-dim" strokeWidth="2" />
      <path d={lowerKC} fill="none" className="stroke-gold-dim" strokeWidth="2" />
      <path d={upperBB} fill="none" className="stroke-parchment-dim" strokeWidth="2" strokeDasharray="4 3" />
      <path d={lowerBB} fill="none" className="stroke-parchment-dim" strokeWidth="2" strokeDasharray="4 3" />

      <text x="24" y="18" className="fill-parchment-dim font-mono" fontSize="9">
        BB (dashed)
      </text>
      <text x="24" y="202" className="fill-gold-bright font-mono" fontSize="9">
        KC (solid)
      </text>

      {/* state dots + labels, two lines each so labels never collide horizontally */}
      <circle cx="60" cy="168" r="4" className="fill-parchment-faint" />
      <text x="60" y="186" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="9">
        no squeeze
      </text>

      <circle cx="195" cy="168" r="4" className="fill-warn" />
      <text x="195" y="186" textAnchor="middle" className="fill-warn font-mono" fontSize="9">
        squeeze on
      </text>
      <text x="195" y="197" textAnchor="middle" className="fill-warn font-mono" fontSize="8">
        BB inside KC
      </text>

      <circle cx="300" cy="168" r="4" className="fill-gain-bright" />
      <text x="300" y="186" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="9">
        release
      </text>
      <text x="300" y="197" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="8">
        BB breaks out
      </text>
    </Frame>
  );
}

export function MomentumHistogramDiagram() {
  const zero = 95;
  const squeezeBars = [
    { v: 7, color: "fill-gain" },
    { v: -10, color: "fill-loss" },
    { v: 6, color: "fill-gain" },
    { v: -7, color: "fill-loss" },
    { v: 5, color: "fill-gain" },
  ];
  const breakoutBars = [16, 28, 40, 52, 62, 70, 76];

  const bars = [
    ...squeezeBars.map((b) => ({ h: b.v, color: b.color, state: "squeeze" })),
    ...breakoutBars.map((v) => ({ h: v, color: "fill-gain-bright", state: "release" })),
  ];

  return (
    <Frame viewBox="0 0 300 190" title="Momentum histogram: choppy during squeeze, then expanding lime bars on release">
      <line x1="10" y1={zero} x2="290" y2={zero} className="stroke-line" strokeWidth="1.5" />

      {bars.map((b, i) => {
        const x = 20 + i * 22;
        const y = b.h >= 0 ? zero - b.h : zero;
        const height = Math.abs(b.h);
        return (
          <rect key={i} x={x} y={y} width="16" height={Math.max(2, height)} className={b.color} />
        );
      })}

      {/* squeeze state dots beneath bars */}
      {bars.map((b, i) => {
        const x = 20 + i * 22 + 8;
        const isRelease = b.state === "release" && i === squeezeBars.length;
        return (
          <circle
            key={i}
            cx={x}
            cy="170"
            r="3.5"
            className={
              b.state === "squeeze"
                ? "fill-warn"
                : isRelease
                ? "fill-gain-bright"
                : "fill-parchment-faint"
            }
          />
        );
      })}

      <text x="20" y="20" className="fill-parchment-faint font-mono" fontSize="8">
        choppy while compressed
      </text>
      <text x="180" y="20" className="fill-gain-bright font-mono" fontSize="8">
        lime = rising positive
      </text>
    </Frame>
  );
}
