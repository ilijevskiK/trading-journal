// The only place in this app that talks to an LLM. Server-only — never
// import this from a "use client" file; the OpenRouter API key is never
// sent to the browser (see lib/tradesDb.js's mapSettingsRow /
// getOpenRouterApiKey). OpenRouter's chat completions endpoint is a plain
// OpenAI-compatible REST API, so a raw `fetch` is used rather than pulling
// in a whole SDK dependency for one call. Non-streaming: a ~500-700 word
// chapter finishes well inside a single request.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// A real, free ("*:free") model listed on openrouter.ai/models as of this
// writing — a large foundation model, not a distilled/toy one. Switched
// from google/gemma-4-31b-it:free after that model's shared free-tier
// pool started returning "temporarily rate-limited upstream" errors (a
// real, observed OpenRouter response, not a guess) — free-model
// congestion varies by model/provider and changes over time, so if this
// one also gets rate-limited, it's a one-line swap again, not a redesign.
const DEFAULT_MODEL = "minimax/minimax-m3:free";

export async function generateMemoirChapter({ apiKey, system, userPrompt, model = DEFAULT_MODEL }) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/ilijevskiK/trading-journal",
      "X-OpenRouter-Title": "Ledger - Trading Journal",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2000,
      stream: false,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    // OpenRouter's own error body is intentionally logged in full here
    // (server-side only, never sent to the client) — its `message` alone
    // is often a generic wrapper like "Provider returned error" with the
    // actually-useful detail nested in `error.metadata` (the raw upstream
    // provider response). See openrouter.ai/activity for the same detail,
    // logged per-request, if this ever needs diagnosing again.
    console.error("OpenRouter error response:", JSON.stringify(json, null, 2));
    const detail = json?.error?.metadata?.raw || json?.error?.metadata?.provider_name;
    const message = [json?.error?.message, detail].filter(Boolean).join(" — ");
    throw new Error(message || "OpenRouter returned an error.");
  }

  const choice = json.choices?.[0];

  return {
    text: choice?.message?.content || "",
    model: json.model,
    stopReason: choice?.finish_reason,
    inputTokens: json.usage?.prompt_tokens,
    outputTokens: json.usage?.completion_tokens,
  };
}
