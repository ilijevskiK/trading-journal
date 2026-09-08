// Pure prompt construction for the Memoir feature — no network, no DB, so
// it's fully unit-testable on its own. The one rule that matters most:
// the model must only narrate numbers it's handed here, never invent or
// estimate its own. That's stated explicitly in the system prompt below,
// not left implicit.

const SYSTEM_PROMPT = `You are writing the next chapter of a trader's personal, first-person memoir — reflective, literary prose about their own trading history, not a report or a dashboard.

You will be given specific closed trades with hard numbers already computed (entry/exit prices, dates, percent gains, hold days). You must:
- Write only in the first person, as the trader looking back.
- Use ONLY the numbers given to you. Never invent, estimate, or round differently than what's provided. If a number isn't given for a trade, don't mention that dimension for it.
- Weave the trades into a narrative about two personal patterns: (1) early on, giving back gains by holding winners with no profit-taking discipline; (2) more recently, selling winners too early and watching them keep running afterward.
- Do not give investment advice or predictions about future price moves.
- Length: roughly 400-700 words.
- Output format exactly: first line "TITLE: <short evocative chapter title>", then a blank line, then the chapter body as plain prose — no headers, no bullet points.`;

function describeTrade(fact) {
  const lines = [
    `- ${fact.ticker}, entered ${fact.entryDate} at $${fact.entryPrice}, exited ${fact.exitDate}. Realized P&L: $${Math.round(fact.realizedPnl)} (${fact.rMultiple}R), held ${fact.holdDays} days.`,
  ];

  if (fact.peak) {
    lines.push(
      `  While held, price peaked at $${fact.peak.peakPrice} (+${fact.peak.peakGainPercent}% from entry); actual exit was +${fact.peak.realizedGainPercent}% — gave back ${fact.peak.giveBackPoints} percentage points from the peak.`
    );
  }

  if (fact.soldEarly) {
    const direction = fact.soldEarly.runSincePercent >= 0 ? "up" : "down";
    lines.push(
      `  Current price is $${fact.soldEarly.currentPrice}, ${direction} ${Math.abs(fact.soldEarly.runSincePercent)}% since exit.`
    );
  }

  if (fact.thesis) {
    lines.push(`  Original thesis: "${fact.thesis}"`);
  }

  return lines.join("\n");
}

export function buildMemoirPrompt({ facts, chapterNumber, previousTitles = [] }) {
  const tradesBlock = facts.map(describeTrade).join("\n\n");
  const continuity = previousTitles.length
    ? `Previous chapter titles, for tone/continuity — don't repeat them: ${previousTitles.join(", ")}.`
    : "This is the first chapter.";

  const userPrompt = `Chapter ${chapterNumber}. ${continuity}

Trades to cover in this chapter:

${tradesBlock}

Write the chapter now, following the format and rules given.`;

  return { system: SYSTEM_PROMPT, userPrompt };
}
