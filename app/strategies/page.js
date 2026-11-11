import Tile from "@/components/Tile";
import {
  MarketStatusIcon,
  CurrentEarningsIcon,
  AnnualEarningsIcon,
  NewHighsIcon,
  SupplyDemandIcon,
  LeadershipIcon,
  InstitutionalIcon,
} from "@/components/NavIcons";

const SECTIONS = [
  {
    href: "/strategies/market-status",
    label: "Market Status",
    Icon: MarketStatusIcon,
    description: "Is the market in an uptrend? (M)",
  },
  {
    href: "/strategies/current-earnings",
    label: "Current Earnings",
    Icon: CurrentEarningsIcon,
    description: "Is quarterly earnings growth strong? (C)",
  },
  {
    href: "/strategies/annual-earnings",
    label: "Annual Earnings",
    Icon: AnnualEarningsIcon,
    description: "Has it grown every year? (A)",
  },
  {
    href: "/strategies/new-highs",
    label: "New Highs",
    Icon: NewHighsIcon,
    description: "Breaking out to a new high? (N)",
  },
  {
    href: "/strategies/supply-demand",
    label: "Supply & Demand",
    Icon: SupplyDemandIcon,
    description: "Are buyers in control? (S)",
  },
  {
    href: "/strategies/leadership",
    label: "Leadership",
    Icon: LeadershipIcon,
    description: "Leader or laggard? (L)",
  },
  {
    href: "/strategies/institutional",
    label: "Institutions",
    Icon: InstitutionalIcon,
    description: "Are funds buying it? (I)",
  },
];

const LETTERS = [
  { letter: "C", meaning: "Current quarterly earnings", covered: "Current Earnings" },
  { letter: "A", meaning: "Annual earnings growth", covered: "Annual Earnings" },
  { letter: "N", meaning: "New product, management, or price high", covered: "New Highs" },
  { letter: "S", meaning: "Supply and demand", covered: "Supply & Demand" },
  { letter: "L", meaning: "Leader or laggard", covered: "Leadership" },
  { letter: "I", meaning: "Institutional sponsorship", covered: "Institutions" },
  { letter: "M", meaning: "Market direction", covered: "Market Status" },
];

export default function StrategiesPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display text-3xl text-parchment">CAN SLIM</h1>
      <p className="text-xs text-parchment-faint mt-2 max-w-2xl">
        William O&apos;Neil&apos;s growth-stock system, from <em>How to Make Money in Stocks</em>. Seven
        traits that the biggest winning stocks shared before their big moves, plus strict buy and sell
        rules.
      </p>
      <div className="rule-divider mt-4 mb-8" />

      <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {SECTIONS.map((section) => (
          <Tile key={section.href} {...section} />
        ))}
      </nav>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-wide text-parchment-faint mb-3">The seven letters</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {LETTERS.map(({ letter, meaning, covered }) => (
            <li
              key={letter}
              className={`flex items-baseline gap-3 rounded-md border px-3 py-2 ${
                covered ? "border-gold-dim bg-surface" : "border-line"
              }`}
            >
              <span className={`font-display text-xl ${covered ? "text-gold-bright" : "text-parchment-faint"}`}>
                {letter}
              </span>
              <span className="text-xs text-parchment-dim">
                {meaning}
                {covered && <span className="block text-[10px] text-gold mt-0.5">→ {covered}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
