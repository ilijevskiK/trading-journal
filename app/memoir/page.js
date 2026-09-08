"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTrades } from "@/contexts/TradesContext";
import { getMemoirStatusAction, generateNextChapterAction } from "@/contexts/memoirActions";

// Server Action timeouts are set at the page level in Next.js, not the
// action file — gatherMemoirFacts throttles Twelve Data calls to stay
// under its 8/min free-tier limit, so a full chapter generation can take a
// couple of minutes. This leaves headroom under Vercel's current Hobby
// duration ceiling (verified at 300s when this was built — worth a quick
// check in your Vercel project settings if this ever seems to be cutting
// generation off early).
export const maxDuration = 240;

export default function MemoirPage() {
  const { settings } = useTrades();
  const [chapters, setChapters] = useState([]);
  const [pendingTradeCount, setPendingTradeCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function refreshStatus() {
    return getMemoirStatusAction().then((result) => {
      setChapters(result.chapters);
      setPendingTradeCount(result.pendingTradeCount);
      setLoaded(true);
    });
  }

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      await generateNextChapterAction();
      // Re-fetch rather than append the returned chapter locally — this
      // keeps the list in the same server-truth (ascending) order and
      // also picks up the now-lower pending count in one round trip.
      await refreshStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  if (!settings.openRouterApiKeySet) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="font-display text-3xl text-parchment">Memoir</h1>
        <div className="rule-divider mt-4 mb-6" />
        <p className="text-sm text-parchment-dim">
          Add an OpenRouter API key in{" "}
          <Link href="/settings" className="text-gold-bright hover:underline">
            Settings
          </Link>{" "}
          to write your first chapter — a reflective, AI-written narrative
          built from your actual closed trades.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl text-parchment">Memoir</h1>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || (loaded && pendingTradeCount === 0)}
          title={
            loaded && pendingTradeCount === 0
              ? "No new closed trades since your last chapter yet"
              : undefined
          }
          className="bg-gold text-ink px-4 py-2 rounded-md text-sm font-medium hover:bg-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Writing…" : "Write next chapter"}
        </button>
      </div>
      <p className="text-xs text-parchment-faint mt-2 max-w-lg">
        An AI-written reflection on your closed trades — every number it
        cites is computed by this app first, never invented by the model.
        Generated on demand, not automatically.
      </p>

      {loaded && !generating && !error && (
        <p className="text-xs text-parchment-faint mt-3">
          {pendingTradeCount === 0
            ? "No new closed trades since your last chapter yet — close a trade to add material for the next one."
            : `${pendingTradeCount} new closed trade${pendingTradeCount === 1 ? "" : "s"} ready for the next chapter.`}
        </p>
      )}

      {generating && (
        <p className="text-xs text-parchment-faint mt-3 border border-line rounded-lg bg-surface px-4 py-3">
          This can take a couple of minutes — it fetches live price data one
          trade at a time to respect a rate limit. Don&apos;t close this tab.
        </p>
      )}
      {error && (
        <p className="text-xs text-loss-bright mt-3 border border-line rounded-lg bg-surface px-4 py-3">
          {error}
        </p>
      )}

      <div className="rule-divider mt-6 mb-6" />

      {loaded && chapters.length === 0 && !generating && (
        <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
          No chapters yet — click &quot;Write next chapter&quot; once you have
          at least one closed trade.
        </div>
      )}

      {chapters.length > 1 && (
        <div className="border border-line rounded-lg bg-surface px-5 py-4 mb-8">
          <p className="text-xs uppercase tracking-wide text-parchment-faint mb-2">Contents</p>
          <ul className="space-y-1.5">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <a
                  href={`#chapter-${chapter.chapterNumber}`}
                  className="text-sm text-parchment-dim hover:text-gold-bright transition-colors"
                >
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-8">
        {chapters.map((chapter) => (
          <article
            key={chapter.id}
            id={`chapter-${chapter.chapterNumber}`}
            className="border-b border-line pb-8 last:border-none scroll-mt-6"
          >
            <h2 className="font-display text-xl text-gold-bright">
              Chapter {chapter.chapterNumber}: {chapter.title}
            </h2>
            <div className="text-sm text-parchment-dim mt-3 whitespace-pre-wrap leading-relaxed">
              {chapter.content}
            </div>
          </article>
        ))}
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 w-11 h-11 flex items-center justify-center rounded-full bg-surface border border-line text-parchment-dim hover:text-gold-bright hover:border-gold-dim shadow-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M12 19 L12 5 M6 11 L12 5 L18 11" />
          </svg>
        </button>
      )}
    </div>
  );
}
