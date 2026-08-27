// Original illustrative diagrams for the Smart Money Concepts write-up.
// Not TradingView/LuxAlgo screenshots — schematic recreations of the concepts,
// drawn with the app's own palette.

import Frame from "./DiagramFrame";

export function MarketStructureDiagram() {
  const path = "M20,160 L90,60 L140,110 L210,30 L270,140 L340,95 L400,155";
  return (
    <Frame viewBox="0 0 420 200" title="Market structure: BOS vs CHoCH">
      <path d={path} fill="none" className="stroke-parchment-dim" strokeWidth="2" />

      {/* reference levels being broken */}
      <line x1="90" y1="60" x2="230" y2="60" strokeDasharray="4 4" className="stroke-gain/50" strokeWidth="1.5" />
      <line x1="140" y1="110" x2="290" y2="110" strokeDasharray="4 4" className="stroke-loss/50" strokeWidth="1.5" />

      {[
        { x: 20, y: 160, label: "HL", dy: 18 },
        { x: 90, y: 60, label: "HH", dy: -10 },
        { x: 140, y: 110, label: "HL", dy: 18 },
        { x: 210, y: 30, label: "HH", dy: -10 },
        { x: 270, y: 140, label: "LH", dy: 18 },
        { x: 340, y: 95, label: "LH", dy: -10 },
        { x: 400, y: 155, label: "LL", dy: 18 },
      ].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" className="fill-parchment" />
          <text x={p.x} y={p.y + p.dy} textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="9">
            {p.label}
          </text>
        </g>
      ))}

      <text x="205" y="22" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="10">
        BOS
      </text>
      <text x="245" y="128" textAnchor="middle" className="fill-loss-bright font-mono" fontSize="10">
        CHoCH
      </text>
    </Frame>
  );
}

export function OrderBlockDiagram() {
  const candles = [
    { x: 20, o: 90, c: 100, h: 85, l: 105, bull: false },
    { x: 50, o: 100, c: 112, h: 96, l: 118, bull: false },
    { x: 80, o: 112, c: 128, h: 108, l: 134, bull: false }, // last down candle = order block
    { x: 110, o: 128, c: 90, h: 84, l: 132, bull: true },
    { x: 140, o: 90, c: 55, h: 50, l: 94, bull: true },
    { x: 170, o: 55, c: 35, h: 30, l: 58, bull: true },
    { x: 230, o: 60, c: 100, h: 55, l: 128, bull: false }, // pullback into OB zone
    { x: 260, o: 100, c: 45, h: 40, l: 104, bull: true },
    { x: 290, o: 45, c: 25, h: 20, l: 48, bull: true },
  ];
  return (
    <Frame viewBox="0 0 320 168" title="Bullish order block: last down candle before an impulse, revisited later">
      <rect x="72" y="106" width="240" height="30" className="fill-gold/15 stroke-gold-dim" strokeDasharray="3 3" strokeWidth="1" />
      <text x="192" y="122" textAnchor="middle" className="fill-gold-bright font-mono" fontSize="9">
        Bullish Order Block
      </text>

      {candles.map((c, i) => (
        <g key={i}>
          <line x1={c.x + 8} y1={c.h} x2={c.x + 8} y2={c.l} className={c.bull ? "stroke-gain" : "stroke-loss"} strokeWidth="1.5" />
          <rect
            x={c.x}
            y={Math.min(c.o, c.c)}
            width="16"
            height={Math.max(2, Math.abs(c.o - c.c))}
            className={c.bull ? "fill-gain-bright" : "fill-loss-bright"}
          />
        </g>
      ))}

      <text x="192" y="158" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="9">
        price returns to mitigate, then continues
      </text>
    </Frame>
  );
}

export function FairValueGapDiagram() {
  return (
    <Frame viewBox="0 0 300 190" title="Fair value gap: three-candle imbalance">
      <text x="150" y="24" textAnchor="middle" className="fill-gold-bright font-mono" fontSize="10">
        FVG (imbalance)
      </text>

      <rect x="70" y="80" width="160" height="35" className="fill-gold/15 stroke-gold-dim" strokeDasharray="3 3" strokeWidth="1" />

      {/* candle 1 */}
      <line x1="48" y1="95" x2="48" y2="135" className="stroke-gain" strokeWidth="1.5" />
      <rect x="40" y="103" width="16" height="24" className="fill-gain-bright" />
      {/* candle 2 - the impulse */}
      <line x1="148" y1="35" x2="148" y2="120" className="stroke-gain" strokeWidth="1.5" />
      <rect x="140" y="40" width="16" height="60" className="fill-gain-bright" />
      {/* candle 3 */}
      <line x1="248" y1="55" x2="248" y2="90" className="stroke-gain" strokeWidth="1.5" />
      <rect x="240" y="60" width="16" height="20" className="fill-gain-bright" />

      <text x="150" y="160" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="9">
        candle 1 high to candle 3 low never traded —
      </text>
      <text x="150" y="174" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="9">
        often revisited before continuing
      </text>
    </Frame>
  );
}

export function EqualHighsLowsDiagram() {
  const path = "M15,120 L70,45 L110,80 L165,45 L210,130";
  return (
    <Frame viewBox="0 0 230 150" title="Equal highs: resting liquidity swept before reversal">
      <line x1="55" y1="45" x2="180" y2="45" strokeDasharray="4 4" className="stroke-warn" strokeWidth="1.5" />
      <text x="118" y="35" textAnchor="middle" className="fill-warn font-mono" fontSize="9">
        EQH — liquidity resting above
      </text>

      <path d={path} fill="none" className="stroke-parchment-dim" strokeWidth="2" />
      <circle cx="70" cy="45" r="3.5" className="fill-parchment" />
      <circle cx="165" cy="45" r="3.5" className="fill-parchment" />

      <text x="118" y="145" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="8">
        second touch sweeps stops, then reverses down
      </text>
    </Frame>
  );
}

export function PremiumDiscountDiagram() {
  return (
    <Frame viewBox="0 0 220 160" title="Premium, equilibrium, and discount zones within a swing range">
      <rect x="60" y="15" width="100" height="60" className="fill-loss/15 stroke-loss/40" strokeWidth="1" />
      <rect x="60" y="75" width="100" height="60" className="fill-gain/15 stroke-gain/40" strokeWidth="1" />
      <line x1="55" y1="75" x2="165" y2="75" className="stroke-gold-bright" strokeWidth="1.5" />

      <text x="110" y="40" textAnchor="middle" className="fill-loss-bright font-mono" fontSize="9">
        Premium
      </text>
      <text x="110" y="53" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="7">
        sell / short zone
      </text>

      <text x="185" y="78" textAnchor="middle" className="fill-gold-bright font-mono" fontSize="8">
        50%
      </text>

      <text x="110" y="100" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="9">
        Discount
      </text>
      <text x="110" y="113" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="7">
        buy / long zone
      </text>
    </Frame>
  );
}
