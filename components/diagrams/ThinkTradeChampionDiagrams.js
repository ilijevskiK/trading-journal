// Original illustrative diagrams for the "Think & Trade Like a Champion"
// write-up. Schematic recreations of the Power Play and Cheat entry
// patterns — not reproductions of any chart from the book.

import Frame from "./DiagramFrame";

export function PowerPlayDiagram() {
  const surge = "M20,150 C40,120 55,80 70,50 C80,30 90,16 100,10";
  const flag = "M100,10 C115,18 130,28 140,32 C150,36 160,30 170,24 C178,20 185,22 190,20";
  const breakout = "M190,20 C210,12 230,4 250,2";

  return (
    <Frame
      viewBox="0 0 270 170"
      title="Power Play (High Tight Flag): 100%+ surge in weeks, then a tight flag under 20-25%, then continuation"
    >
      <path d={surge} fill="none" className="stroke-gain-bright" strokeWidth="2.5" />
      <path d={flag} fill="none" className="stroke-parchment" strokeWidth="2.5" />
      <path d={breakout} fill="none" className="stroke-gain-bright" strokeWidth="2.5" strokeDasharray="5 3" />

      <text x="30" y="90" className="fill-gain-bright font-mono" fontSize="8">
        +100% or more
      </text>
      <text x="30" y="100" className="fill-gain-bright font-mono" fontSize="8">
        in ≤ 8 weeks
      </text>

      <text x="118" y="55" className="fill-parchment-dim font-mono" fontSize="8">
        flag: ≤ 20-25%
      </text>
      <text x="118" y="65" className="fill-parchment-dim font-mono" fontSize="8">
        pullback, 2-6 wks
      </text>

      <text x="200" y="10" className="fill-gain-bright font-mono" fontSize="8">
        breakout
      </text>
    </Frame>
  );
}

export function CheatEntryDiagram() {
  const base = "M20,110 C50,120 80,130 110,124 C130,120 145,112 160,100";
  const cheatPlateau = "M160,100 C172,96 184,96 195,100";
  const secondHandle = "M195,100 C205,108 215,116 222,110 C230,104 238,96 248,88";
  const breakout = "M248,88 C260,78 275,68 290,60";

  return (
    <Frame
      viewBox="0 0 310 150"
      title="Cheat (3C) entry: an earlier, smaller-risk entry at the first mini-handle, before the full base resolves"
    >
      <path d={base} fill="none" className="stroke-parchment" strokeWidth="2.5" />
      <path d={cheatPlateau} fill="none" className="stroke-gold-bright" strokeWidth="2.5" />
      <path d={secondHandle} fill="none" className="stroke-parchment" strokeWidth="2.5" />
      <path d={breakout} fill="none" className="stroke-gain-bright" strokeWidth="2.5" strokeDasharray="5 3" />

      <circle cx="178" cy="98" r="4" className="fill-gold-bright" />
      <text x="178" y="82" textAnchor="middle" className="fill-gold-bright font-mono" fontSize="8">
        the &quot;cheat&quot;
      </text>
      <text x="178" y="120" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="8">
        first mini-handle
      </text>

      <text x="248" y="72" textAnchor="middle" className="fill-parchment-dim font-mono" fontSize="8">
        confirmed 2nd handle
      </text>
      <text x="248" y="132" textAnchor="middle" className="fill-parchment-faint font-mono" fontSize="8">
        (the standard, later entry)
      </text>
    </Frame>
  );
}
