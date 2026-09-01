import { NJ_KNOWLEDGE } from "./nj-knowledge";

export type BidExtract = {
  insuranceAmount: number | null;
  bondType: string | null;
  highlights: Array<{ label: string; value: string }>;
  extractedText: string;
};

function scanText(text: string): BidExtract {
  const highlights: Array<{ label: string; value: string }> = [];
  const money =
    text.match(/\$[\s]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g) ||
    text.match(/([0-9]{1,3}(?:,[0-9]{3})+)\s*(?:combined single|liability|insurance)/i);
  const insuranceLine = text.match(
    /(?:liability|insurance)[^\n.]{0,80}\$?\s*([0-9,]{3,}(?:\.[0-9]{2})?)/i
  );
  const million = text.match(/\$?\s*(1,000,000|1000000|1 million)/i);
  let insuranceAmount: number | null = null;
  if (insuranceLine) insuranceAmount = Number(insuranceLine[1].replace(/,/g, ""));
  else if (million) insuranceAmount = 1000000;
  else if (money?.[0]) insuranceAmount = Number(money[0].replace(/[^0-9.]/g, ""));

  if (insuranceAmount) {
    highlights.push({
      label: "Insurance amount",
      value: `$${insuranceAmount.toLocaleString()}`,
    });
  }

  let bondType: string | null = null;
  if (/corporate\s+(surety\s+)?bond/i.test(text)) bondType = "corporate";
  else if (/personal\s+(surety\s+)?bond/i.test(text)) bondType = "personal";
  else if (/performance\s+(surety\s+)?bond/i.test(text)) bondType = "corporate";
  if (bondType) {
    highlights.push({ label: "Bond type the district requires", value: bondType });
  }

  const checks = [
    ["Business registration certificate", /business registration/i],
    ["Performance surety bond", /performance\s+(surety\s+)?bond/i],
    ["Non-collusion affidavit", /non[-\s]?collusion/i],
    ["Affirmative action", /affirmative action/i],
    ["Stockholder disclosure", /stockholder|ownership disclosure/i],
    ["Adjustment / increase-decrease clause", /increase\/decrease|per mile|adjustment/i],
    ["Route description", /route description|bus stop/i],
  ] as const;

  for (const [label, re] of checks) {
    highlights.push({
      label,
      value: re.test(text) ? "Found in the scan" : "Not clearly found — please check",
    });
  }

  return { insuranceAmount, bondType, highlights, extractedText: text.slice(0, 20000) };
}

export async function extractBidSpec(text: string): Promise<BidExtract> {
  const local = scanText(text);
  const key = process.env.OPENAI_API_KEY;
  if (!key || !text.trim()) return local;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Extract school transportation bid specification fields for a New Jersey county office. Return JSON only: {insuranceAmount:number|null, bondType:\"corporate\"|\"personal\"|\"none\"|null, highlights:[{label,value}]}. " +
              NJ_KNOWLEDGE.slice(0, 1500),
          },
          { role: "user", content: text.slice(0, 12000) },
        ],
      }),
    });
    if (!res.ok) return local;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as BidExtract;
    return {
      insuranceAmount: parsed.insuranceAmount ?? local.insuranceAmount,
      bondType: parsed.bondType ?? local.bondType,
      highlights: parsed.highlights?.length ? parsed.highlights : local.highlights,
      extractedText: text.slice(0, 20000),
    };
  } catch {
    return local;
  }
}

export function fileToText(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return buffer.toString("utf8");
  if (lower.endsWith(".pdf")) {
    const raw = buffer.toString("latin1");
    const bits: string[] = [];
    for (const match of raw.matchAll(/\((?:\\.|[^\\)])+\)/g)) {
      const text = match[0]
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\(.)/g, "$1")
        .trim();
      if (/[A-Za-z0-9]/.test(text)) bits.push(text);
    }
    if (bits.length) return bits.join(" ");
  }
  const asString = buffer.toString("utf8");
  const readable = asString.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ");
  return readable.length > 80 ? readable : asString;
}
