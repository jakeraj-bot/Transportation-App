import { NJ_KNOWLEDGE } from "./nj-knowledge";
import {
  loadCurrentNjTransportationCode,
  parseOpenAiResponseText,
  selectRelevantPassages,
} from "./nj-live-codes";

const OFFICIAL_DOMAINS = ["nj.gov", "njleg.state.nj.us", "lis.njleg.state.nj.us"] as const;

function modelList(): string[] {
  const preferred = process.env.OPENAI_ASK_MODEL?.trim();
  const models = [preferred, "gpt-4o", "gpt-4o-mini"].filter((m): m is string => Boolean(m));
  return [...new Set(models)];
}

function systemPrompt(liveCode: string): string {
  return `You are Ask NJ Transportation for Passaic County school bus contractors.

Answer from CURRENT New Jersey pupil-transportation law and official NJ government pages — not from memory of older editions.

Primary sources (use these first):
1. N.J.A.C. 6A:27 (NJ DOE current Title 6A Chapter 27 PDF / HTML)
2. N.J.S.A. 18A:39 (statute)
3. Official NJ pages: nj.gov, njleg.state.nj.us, lis.njleg.state.nj.us
   including https://www.nj.gov/education/code/current/title6a/chap27.pdf
   https://www.nj.gov/education/code/current/index.shtml
   https://www.nj.gov/education/finance/transportation/

Current 6A:27 text (and related NJ DOE pages) retrieved for this question:

---
${liveCode}
---

Office notes below are SECONDARY. They may be outdated. If they conflict with the retrieved 6A:27 text or a web search of nj.gov, follow the official code and say so.

---
${NJ_KNOWLEDGE}
---

Rules:
- Prefer citing the specific 6A:27 subchapter (for example 6A:27-11.3) when the retrieved text supports it.
- If you used web search, mention the official page or PDF you relied on.
- If the retrieved excerpt is incomplete, use web_search on nj.gov / the 6A:27 PDF rather than guessing.
- Do not invent section numbers or dollar amounts.
- If the answer is not in 6A:27 / 18A:39 / official NJ pages, say so and point the user to NJ DOE Office of Student Transportation.
- This is not legal advice. County staff should confirm against the official code PDF before a compliance decision.
- Keep answers concise and practical for a county transportation office.`;
}

async function callResponsesApi(
  apiKey: string,
  model: string,
  question: string,
  liveCode: string
): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      tools: [
        {
          type: "web_search",
          filters: { allowed_domains: [...OFFICIAL_DOMAINS] },
          user_location: { type: "approximate", country: "US", region: "New Jersey" },
        },
      ],
      include: ["web_search_call.action.sources"],
      instructions: systemPrompt(liveCode),
      input: question,
    }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = typeof data.error === "object" && data.error && "message" in data.error
      ? String((data.error as { message?: string }).message)
      : res.statusText;
    throw new Error(err || `Responses API ${res.status}`);
  }
  const parsed = parseOpenAiResponseText(data);
  if (!parsed.text) return null;
  if (parsed.urls.length) {
    return `${parsed.text}\n\nOfficial pages used: ${parsed.urls.join("; ")}`;
  }
  return parsed.text;
}

async function callChatCompletions(
  apiKey: string,
  model: string,
  question: string,
  liveCode: string
): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      messages: [
        { role: "system", content: systemPrompt(liveCode) },
        { role: "user", content: question },
      ],
    }),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Chat Completions ${res.status}`);
  }
  return data.choices?.[0]?.message?.content?.trim() || null;
}

function localFallback(question: string, liveCode: string): string {
  const q = question.toLowerCase();
  const words = q.split(/\W+/).filter((w) => w.length > 3);
  const chunks = `${liveCode}\n\n${NJ_KNOWLEDGE}`
    .split(/\n{2,}|----/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lower = chunk.toLowerCase();
      const score = words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
      return { chunk, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const excerpt = chunks
    .slice(0, 4)
    .map((row) => row.chunk)
    .join("\n\n")
    .slice(0, 2800);
  return (
    "OPENAI_API_KEY is not set (or the AI call failed), so this is a keyword match of the current NJ 6A:27 text we fetched plus office notes — not a live model answer.\n\n" +
    (excerpt ||
      "No matching excerpt. Add OPENAI_API_KEY on the server so Ask NJ can search nj.gov and the current 6A:27 PDF.")
  );
}

function withDisclaimer(answer: string, fetchedAt: string, sources: string[]): string {
  const date = new Date(fetchedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const sourceLabel = sources.length ? sources.join("; ") : "nj.gov current code";
  return `${answer.trim()}\n\n— Based on NJ DOE current 6A:27 retrieved ${date} (${sourceLabel}). Confirm against the official PDF before a compliance decision.`;
}

export async function answerNjTransportationQuestion(question: string): Promise<string> {
  const q = question.trim();
  if (!q) return "Ask a question about NJ pupil transportation rules.";

  let liveCode = "";
  let fetchedAt = new Date().toISOString();
  let sources: string[] = [];
  try {
    const bundle = await loadCurrentNjTransportationCode();
    liveCode = selectRelevantPassages(bundle.text, q);
    fetchedAt = bundle.fetchedAt;
    sources = bundle.sources;
  } catch (err) {
    liveCode = `Live fetch of nj.gov 6A:27 failed (${err instanceof Error ? err.message : "error"}). Use web search of official NJ pages.`;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return withDisclaimer(localFallback(q, liveCode), fetchedAt, sources.length ? sources : ["nj.gov (fetch may have failed)"]);
  }

  const models = modelList();
  let lastError = "";

  for (const model of models) {
    try {
      const text = await callResponsesApi(apiKey, model, q, liveCode);
      if (text) return withDisclaimer(text, fetchedAt, sources.length ? sources : ["OpenAI web search of nj.gov"]);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Responses API error";
    }
  }

  for (const model of models) {
    try {
      const text = await callChatCompletions(apiKey, model, q, liveCode);
      if (text) {
        return withDisclaimer(
          `${text}\n\n(Answered from the retrieved 6A:27 text; web search was unavailable: ${lastError || "no Responses API result"}.)`,
          fetchedAt,
          sources
        );
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Chat Completions error";
    }
  }

  return withDisclaimer(
    `${localFallback(q, liveCode)}\n\nAI error: ${lastError}`,
    fetchedAt,
    sources.length ? sources : ["keyword match"]
  );
}
