"use server";

import { auth } from "@/auth";
import pool from "@/lib/db";
import * as db from "@/lib/tradesDb";
import * as memoirDb from "@/lib/memoirDb";
import {
  selectTradesForChapter,
  countUncoveredTrades,
  gatherMemoirFacts,
  classifyTradePattern,
} from "@/lib/memoirData";
import { buildMemoirPrompt } from "@/lib/memoirPrompt";
import { generateMemoirChapter } from "@/lib/openRouterClient";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");
  return session.user.id;
}

// Chapters plus whether there's anything new to write about yet — bundled
// into one round trip so the UI can disable/explain the "Write next
// chapter" button upfront, instead of the user only finding out by
// clicking it and getting an error back.
export async function getMemoirStatusAction() {
  const userId = await requireUserId();
  const [chapters, { trades }] = await Promise.all([
    memoirDb.listChapters(pool, userId),
    db.getInitialData(pool, userId),
  ]);
  const alreadyCovered = chapters.flatMap((c) => c.tradeIds);
  const pendingTradeCount = countUncoveredTrades(trades, alreadyCovered);
  return { chapters, pendingTradeCount };
}

// TITLE: <title>\n\n<body> -> { title, body }. Falls back to an untitled
// chapter rather than throwing if the model doesn't follow the format —
// losing the title is a minor UI wrinkle, not worth failing the whole
// generation over after a real Twelve Data + LLM round trip already
// completed.
function parseChapter(text) {
  const match = text.match(/^TITLE:\s*(.+)\n+([\s\S]+)$/);
  if (!match) return { title: "Untitled chapter", body: text.trim() };
  return { title: match[1].trim(), body: match[2].trim() };
}

export async function generateNextChapterAction() {
  const userId = await requireUserId();

  const openRouterApiKey = await db.getOpenRouterApiKey(pool, userId);
  if (!openRouterApiKey) {
    throw new Error("No OpenRouter API key set — add one in Settings first.");
  }

  const { trades, settings } = await db.getInitialData(pool, userId);
  if (!settings?.twelveDataApiKey) {
    throw new Error("No Twelve Data API key set — add one in Settings first.");
  }

  const previousChapters = await memoirDb.listChapters(pool, userId);
  const alreadyCovered = previousChapters.flatMap((c) => c.tradeIds);
  const selected = selectTradesForChapter(trades, alreadyCovered);
  if (selected.length === 0) {
    throw new Error("No new closed trades since your last chapter yet.");
  }

  const facts = await gatherMemoirFacts(selected, settings.twelveDataApiKey);
  const chapterNumber = previousChapters.length + 1;
  const { system, userPrompt } = buildMemoirPrompt({
    facts,
    chapterNumber,
    previousTitles: previousChapters.map((c) => c.title),
  });

  const result = await generateMemoirChapter({ apiKey: openRouterApiKey, system, userPrompt });
  const { title, body } = parseChapter(result.text);

  return memoirDb.insertChapter(pool, userId, {
    chapterNumber,
    title,
    content: body,
    tradeIds: selected.map((t) => t.id),
    patternsDetected: facts.map((f) => ({
      tradeId: f.tradeId,
      ticker: f.ticker,
      pattern: classifyTradePattern(f),
    })),
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
}
