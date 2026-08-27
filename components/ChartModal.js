"use client";

import { useEffect } from "react";

// True full-viewport chart view: fills 100vw/100vh with a floating close
// button in the top-right corner. The padding below is the empty margin the
// content (chart + indicator rails) sits inside of on every side.
export default function ChartModal({ title, onClose, children }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-surface overflow-hidden">
      {title && (
        <div className="absolute top-4 left-4 z-20 font-mono text-sm text-parchment bg-ink/70 px-3 py-1.5 rounded pointer-events-none">
          {title}
        </div>
      )}
      <button
        onClick={onClose}
        title="Close"
        aria-label="Close"
        className="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-ink/70 text-parchment hover:bg-ink/90 text-base"
      >
        ✕
      </button>
      <div className="w-full h-full pt-16 px-6 pb-6">{children}</div>
    </div>
  );
}
