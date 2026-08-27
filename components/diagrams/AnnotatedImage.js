// Renders a real screenshot with numbered callout badges positioned by
// percentage coordinates, plus a matching legend below — single source of
// truth so the on-image numbers and the explanation list can't drift apart.

export default function AnnotatedImage({ src, alt, callouts, caption }) {
  return (
    <figure className="space-y-3">
      <div className="relative rounded-md overflow-hidden border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-auto block" />
        {callouts.map((c, i) => (
          <div
            key={i}
            className="absolute w-5 h-5 rounded-full bg-gold-bright text-ink font-mono text-xs font-bold flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <ol className="space-y-1.5 text-sm text-parchment-dim leading-relaxed">
        {callouts.map((c, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-gold-bright text-ink font-mono text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span>{c.label}</span>
          </li>
        ))}
      </ol>
      {caption && <figcaption className="text-xs text-parchment-faint">{caption}</figcaption>}
    </figure>
  );
}
