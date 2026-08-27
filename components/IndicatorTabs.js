"use client";

import { useState } from "react";

// Toggle between the written explanation and the indicator's actual
// published Pine Script source, where we have one on file. `children` is
// the already-rendered explanation content (a Server Component result
// can't be passed down as a bare component reference, only as an element).
export default function IndicatorTabs({ children, pineScript, pineLicense }) {
  const [tab, setTab] = useState("explanation");

  if (!pineScript) return children;

  return (
    <div>
      <div className="flex gap-2 mb-8">
        <TabButton active={tab === "explanation"} onClick={() => setTab("explanation")}>
          Explanation
        </TabButton>
        <TabButton active={tab === "pine"} onClick={() => setTab("pine")}>
          Pine Script
        </TabButton>
      </div>

      {tab === "explanation" ? (
        children
      ) : (
        <PineScriptView pineScript={pineScript} pineLicense={pineLicense} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs uppercase tracking-wide px-3 py-1.5 rounded-md border transition-colors ${
        active
          ? "border-gold-dim text-gold-bright bg-surface-alt"
          : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
      }`}
    >
      {children}
    </button>
  );
}

function PineScriptView({ pineScript, pineLicense }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pineScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access can fail (permissions, non-secure context) — not worth surfacing an error for
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] text-parchment-faint">
          {pineLicense?.author && <>© {pineLicense.author}</>}
          {pineLicense?.name && (
            <>
              {" — "}
              {pineLicense.url ? (
                <a
                  href={pineLicense.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-bright hover:underline"
                >
                  {pineLicense.name}
                </a>
              ) : (
                pineLicense.name
              )}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] uppercase tracking-wide px-2.5 py-1 rounded border border-line text-parchment-faint hover:text-parchment hover:border-gold-dim transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-lg border border-line bg-surface-alt p-4 text-xs leading-relaxed text-parchment-dim font-mono">
        <code>{pineScript}</code>
      </pre>
    </div>
  );
}
