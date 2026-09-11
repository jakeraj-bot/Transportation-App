import { inflateRawSync, inflateSync } from "zlib";

export const NJ_CODE_SOURCES = [
  {
    name: "N.J.A.C. 6A:27 (current official PDF)",
    url: "https://www.nj.gov/education/code/current/title6a/chap27.pdf",
    kind: "pdf" as const,
  },
  {
    name: "NJ DOE current rules list",
    url: "https://www.nj.gov/education/code/current/index.shtml",
    kind: "html" as const,
  },
  {
    name: "NJ DOE pupil transportation",
    url: "https://www.nj.gov/education/finance/transportation/",
    kind: "html" as const,
  },
];

const CACHE_MS = 12 * 60 * 60 * 1000;

export type NjCodeBundle = {
  at: number;
  text: string;
  fetchedAt: string;
  sources: string[];
};

let cache: NjCodeBundle | null = null;

function decodePdfLiteral(raw: string) {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodePdfHex(hex: string) {
  const clean = hex.replace(/\s+/g, "");
  if (clean.length % 2 !== 0) return "";
  const bytes = Buffer.from(clean, "hex");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return bytes.subarray(2).swap16().toString("utf16le");
  }
  return bytes.toString("latin1");
}

function decodePdfStringToken(token: string) {
  if (token.startsWith("(") && token.endsWith(")")) {
    return decodePdfLiteral(token.slice(1, -1));
  }
  if (token.startsWith("<") && token.endsWith(">")) {
    return decodePdfHex(token.slice(1, -1));
  }
  return "";
}

/** Turn a PDF content stream (Tj / TJ operators) into readable text. */
export function pdfContentToText(content: string) {
  const parts: string[] = [];
  const tj = /(?:\((?:\\.|[^\\)])*\)|<[^>]*>)\s*Tj/g;
  const tjArr = /\[([\s\S]*?)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = tj.exec(content))) {
    const token = match[0].replace(/\s*Tj$/, "");
    parts.push(decodePdfStringToken(token));
  }
  while ((match = tjArr.exec(content))) {
    const inner = match[1].matchAll(/\((?:\\.|[^\\)])*\)|<[^>]*>/g);
    for (const piece of inner) parts.push(decodePdfStringToken(piece[0]));
    parts.push("\n");
  }
  return parts.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractPdfText(buffer: Buffer) {
  const latin = buffer.toString("latin1");
  const chunks: string[] = [];
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(latin))) {
    const bytes = Buffer.from(match[1], "latin1");
    for (const decode of [
      () => inflateSync(bytes),
      () => inflateRawSync(bytes),
      () => inflateSync(bytes.subarray(2)),
    ]) {
      try {
        const inflated = decode().toString("latin1");
        if (inflated.includes("Tj") || inflated.includes("TJ") || inflated.includes("BT")) {
          const text = pdfContentToText(inflated);
          if (text.length > 20) chunks.push(text);
        }
        break;
      } catch {
        continue;
      }
    }
  }
  return chunks
    .join("\n")
    .replace(/-\n([a-z])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function selectRelevantPassages(text: string, question: string, maxChars = 14000) {
  const tokens = question
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);
  if (!text.trim()) return "";

  const windowSize = 1400;
  const step = 700;
  const windows: { start: number; block: string; score: number }[] = [];
  for (let start = 0; start < text.length; start += step) {
    const block = text.slice(start, start + windowSize);
    if (block.length < 40) continue;
    const lower = block.toLowerCase();
    const score = tokens.reduce((n, word) => n + (lower.includes(word) ? 1 : 0), 0);
    windows.push({ start, block, score });
    if (start + windowSize >= text.length) break;
  }

  const ranked = [...windows].sort((a, b) => b.score - a.score || a.start - b.start);
  const picked: { start: number; block: string }[] = [];
  let used = 0;
  const lead = text.slice(0, 800).trim();
  if (lead && text.length > maxChars) {
    picked.push({ start: 0, block: lead });
    used = lead.length;
  }
  for (const row of ranked) {
    if (row.score === 0) break;
    if (used + row.block.length > maxChars) {
      const room = maxChars - used;
      if (room > 200) {
        picked.push({ start: row.start, block: row.block.slice(0, room) });
        used = maxChars;
      }
      break;
    }
    if (picked.some((p) => Math.abs(p.start - row.start) < windowSize / 2)) continue;
    picked.push({ start: row.start, block: row.block });
    used += row.block.length;
    if (used > maxChars * 0.85) break;
  }
  if (!picked.length) return text.slice(0, maxChars);
  return picked
    .sort((a, b) => a.start - b.start)
    .map((p) => p.block.trim())
    .join("\n\n----\n\n")
    .slice(0, maxChars);
}

async function fetchSource(url: string, kind: "pdf" | "html") {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PassaicCountyTransportation/1.0)",
      Accept: kind === "pdf" ? "application/pdf,*/*" : "text/html,application/xhtml+xml,*/*",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  if (kind === "pdf") {
    const buf = Buffer.from(await res.arrayBuffer());
    return extractPdfText(buf);
  }
  return htmlToText(await res.text());
}

export async function loadCurrentNjTransportationCode() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const pieces: string[] = [];
  const sources: string[] = [];
  for (const source of NJ_CODE_SOURCES) {
    try {
      const text = await fetchSource(source.url, source.kind);
      if (text) {
        pieces.push(`SOURCE: ${source.name}\nURL: ${source.url}\n\n${text}`);
        sources.push(source.url);
      }
    } catch {
      pieces.push(`SOURCE: ${source.name}\nURL: ${source.url}\n\n(Could not fetch this page just now.)`);
    }
  }
  cache = {
    at: Date.now(),
    fetchedAt: new Date().toISOString(),
    text: pieces.join("\n\n----\n\n"),
    sources,
  };
  return cache;
}

export function parseOpenAiResponseText(json: unknown) {
  const data = json as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string; annotations?: Array<{ url?: string }> }>;
    }>;
  };
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return { text: data.output_text.trim(), urls: citationUrls(data) };
  }
  const parts: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if ((content.type === "output_text" || content.type === "text") && content.text) {
        parts.push(content.text);
      }
    }
  }
  return { text: parts.join("\n\n").trim(), urls: citationUrls(data) };
}

function citationUrls(data: {
  output?: Array<{ content?: Array<{ annotations?: Array<{ url?: string }> }> }>;
}) {
  const urls = new Set<string>();
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      for (const note of content.annotations ?? []) {
        if (note.url) urls.add(note.url);
      }
    }
  }
  return [...urls];
}
