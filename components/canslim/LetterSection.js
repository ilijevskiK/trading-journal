// Shared pieces for the CAN SLIM letter pages: the verdict card and the
// formatting used in their tables.

const VERDICT_STYLES = {
  strong: { label: "Strong", className: "border-gain text-gain-bright bg-gain/10" },
  pass: { label: "Pass", className: "border-gain/50 text-gain-bright" },
  warning: { label: "Warning", className: "border-warn/60 text-warn" },
  fail: { label: "Fail", className: "border-loss/60 text-loss-bright" },
};

const REASON_MARKS = {
  pass: { mark: "✓", className: "text-gain-bright" },
  warning: { mark: "!", className: "text-warn" },
  fail: { mark: "✕", className: "text-loss-bright" },
  info: { mark: "·", className: "text-parchment-faint" },
};

export default function LetterSection({ letter, title, rule, result, children }) {
  const style = result.verdict ? VERDICT_STYLES[result.verdict] : null;
  return (
    <section className="border border-line rounded-lg bg-surface p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm text-parchment">
          <span className="font-display text-xl text-gold-bright mr-2">{letter}</span>
          {title}
        </h2>
        {style && (
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wide ${style.className}`}>
            {style.label}
          </span>
        )}
      </div>
      <p className="text-[11px] text-parchment-faint mt-1">{rule}</p>

      <ul className="mt-4 space-y-1.5 text-sm">
        {result.reasons.map((r) => (
          <li key={r.text} className="flex gap-2">
            <span className={`w-3 shrink-0 text-center font-mono ${REASON_MARKS[r.level].className}`} aria-hidden="true">
              {REASON_MARKS[r.level].mark}
            </span>
            <span className={r.level === "info" ? "text-parchment-faint text-xs" : "text-parchment-dim"}>{r.text}</span>
          </li>
        ))}
      </ul>

      {children}
    </section>
  );
}

export function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatMoney(v) {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

export function formatEps(v) {
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;
}

export function GrowthCell({ value, threshold }) {
  if (value == null) return <span className="text-parchment-faint">n/a</span>;
  const width = Math.min(100, Math.abs(value) / 2);
  const good = value >= threshold;
  return (
    <span className="inline-flex items-center gap-2 justify-end w-full">
      <span className={good ? "text-gain-bright" : value < 0 ? "text-loss-bright" : "text-parchment-dim"}>
        {value >= 0 ? "+" : ""}
        {value.toFixed(0)}%
      </span>
      <span className="hidden sm:inline-block w-16 h-1.5 rounded-sm bg-line overflow-hidden" aria-hidden="true">
        <span
          className={`block h-full rounded-sm ${good ? "bg-gain" : value < 0 ? "bg-loss" : "bg-parchment-faint"}`}
          style={{ width: `${width}%` }}
        />
      </span>
    </span>
  );
}
