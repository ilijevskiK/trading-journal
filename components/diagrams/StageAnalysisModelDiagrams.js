// Original illustrative diagrams for the "2024 Stage Analysis Model Book"
// write-up. These are schematic recreations of the mechanics the book
// annotates on real 2024 charts — not reproductions of the book's own
// (copyrighted, paywalled) chart pages.

import Frame from "./DiagramFrame";

export function AnnotatedBreakoutDiagram() {
  const priceBase =
    "M20,158 C40,150 55,168 70,160 C90,150 105,166 120,158 C135,150 148,162 160,155";
  const priceBreakout =
    "M160,155 C175,132 190,116 205,108 C218,102 232,112 248,120 C262,127 278,112 300,92 C320,74 345,64 380,55";
  const maFlat = "M20,163 C60,164 100,163 160,161";
  const maRising = "M160,161 C200,150 240,120 280,95 C310,76 345,66 380,58";

  const volBase = [7, 10, 6, 9, 7, 8, 6];
  const volBreakout = [34, 26, 14, 18, 22, 17, 14];

  return (
    <Frame
      viewBox="0 0 400 250"
      title="Worked Stage 2 breakout: base, rising 30-week average, entry, and initial stop"
    >
      {/* stop line */}
      <line x1="20" y1="178" x2="380" y2="178" className="stroke-loss" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x="24" y="190" className="fill-loss font-mono" fontSize="9">
        initial stop — below base low
      </text>

      {/* 30-week MA */}
      <path d={maFlat} fill="none" className="stroke-gold-dim" strokeWidth="2" />
      <path d={maRising} fill="none" className="stroke-gold-dim" strokeWidth="2" />
      <text x="300" y="70" className="fill-gold-dim font-mono" fontSize="9">
        30-wk MA
      </text>

      {/* price */}
      <path d={priceBase} fill="none" className="stroke-parchment" strokeWidth="2" />
      <path d={priceBreakout} fill="none" className="stroke-parchment" strokeWidth="2" />

      {/* volume bars along the bottom */}
      {volBase.map((h, i) => (
        <rect
          key={`vb-${i}`}
          x={24 + i * 20}
          y={228 - h}
          width="12"
          height={h}
          className="fill-parchment-faint"
        />
      ))}
      {volBreakout.map((h, i) => (
        <rect
          key={`vo-${i}`}
          x={164 + i * 20}
          y={228 - h}
          width="12"
          height={h}
          className={i === 0 ? "fill-gain-bright" : "fill-gain"}
        />
      ))}

      {/* callouts */}
      <circle cx="90" cy="158" r="9" className="fill-surface stroke-parchment-dim" strokeWidth="1.5" />
      <text x="90" y="162" textAnchor="middle" className="fill-parchment font-mono" fontSize="9">1</text>
      <text x="90" y="140" textAnchor="middle" className="fill-parchment-dim font-mono" fontSize="8">
        Stage 1 base
      </text>

      <circle cx="168" cy="128" r="9" className="fill-surface stroke-parchment-dim" strokeWidth="1.5" />
      <text x="168" y="132" textAnchor="middle" className="fill-parchment font-mono" fontSize="9">2</text>
      <text x="168" y="108" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="8">
        breakout, MA turns up,
      </text>
      <text x="168" y="118" textAnchor="middle" className="fill-gain-bright font-mono" fontSize="8">
        volume expands
      </text>

      <circle cx="248" cy="120" r="9" className="fill-surface stroke-parchment-dim" strokeWidth="1.5" />
      <text x="248" y="124" textAnchor="middle" className="fill-parchment font-mono" fontSize="9">3</text>
      <text x="248" y="140" textAnchor="middle" className="fill-parchment-dim font-mono" fontSize="8">
        entry near pivot
      </text>
    </Frame>
  );
}

export function RelativeStrengthDiagram() {
  const stockLine =
    "M20,60 C50,55 80,50 110,44 C150,36 190,20 230,14 C260,10 290,8 320,6";
  const indexLine =
    "M20,62 C60,60 100,58 140,55 C190,50 240,44 320,38";
  const rsLine =
    "M20,150 C60,148 100,142 140,130 C190,112 240,90 320,66";
  const rsFlat = "M20,150 L320,150";

  return (
    <Frame
      viewBox="0 0 340 190"
      title="Relative strength: stock vs. index price, and the resulting RS ratio line"
    >
      <text x="20" y="18" className="fill-parchment-dim font-mono" fontSize="9">
        price
      </text>
      <path d={stockLine} fill="none" className="stroke-parchment" strokeWidth="2" />
      <path d={indexLine} fill="none" className="stroke-parchment-faint" strokeWidth="2" strokeDasharray="4 3" />
      <text x="322" y="8" className="fill-parchment font-mono" fontSize="8">stock</text>
      <text x="322" y="42" className="fill-parchment-faint font-mono" fontSize="8">index</text>

      <line x1="20" y1="95" x2="320" y2="95" className="stroke-line" strokeWidth="1" />

      <text x="20" y="112" className="fill-gold-bright font-mono" fontSize="9">
        RS = stock price ÷ index price
      </text>
      <path d={rsFlat} fill="none" className="stroke-line" strokeWidth="1" strokeDasharray="3 3" />
      <path d={rsLine} fill="none" className="stroke-gold-bright" strokeWidth="2.5" />
      <text x="240" y="80" className="fill-gold-bright font-mono" fontSize="8">
        rising RS = leader
      </text>
    </Frame>
  );
}
