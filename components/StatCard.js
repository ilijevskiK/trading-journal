export default function StatCard({ label, value, sub, tone = "neutral" }) {
  const toneClass =
    tone === "gain"
      ? "text-gain-bright"
      : tone === "loss"
      ? "text-loss-bright"
      : tone === "gold"
      ? "text-gold-bright"
      : "text-parchment";

  return (
    <div className="bg-surface border border-line rounded-lg px-5 py-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-parchment-faint">
        {label}
      </span>
      <span className={`font-mono text-2xl ${toneClass}`}>{value}</span>
      {sub ? <span className="text-xs text-parchment-faint">{sub}</span> : null}
    </div>
  );
}
