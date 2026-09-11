import { fileToText } from "./extract-bid-spec";
import { mapContractType, parseFlexibleDate } from "./import-records";
import { matchNjCounty } from "./nj-counties";
import { CONTRACT_STATUSES } from "./roles";

export type ExtractedCurrentContract = {
  dateReceived: string | null;
  districtName: string;
  busCompany: string;
  type: string;
  multiContractNumber: string;
  routeNumbers: string;
  bidNumber: string | null;
  status: string | null;
  firstReviewer: string | null;
  secondReviewer: string | null;
  dateSentToDistrict: string | null;
  insuranceExpiration: string | null;
  county: string | null;
};

export function normalizeMatchName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(board of education|school district|public schools?|township|borough|city of|boe)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchByName<T>(name: string, rows: T[], getName: (row: T) => string | null | undefined): T | undefined {
  const n = normalizeMatchName(name);
  if (!n) return undefined;
  const scored = rows
    .map((row) => {
      const m = normalizeMatchName(getName(row) || "");
      let score = 0;
      if (!m) score = 0;
      else if (m === n) score = 3;
      else if (m.startsWith(n) || n.startsWith(m)) score = 2;
      else if (m.includes(n) || n.includes(m)) score = 1;
      return { row, score, m };
    })
    .filter((row) => row.score > 0);
  scored.sort((a, b) => b.score - a.score || a.m.length - b.m.length);
  if (!scored.length) return undefined;
  if (scored[0].score === 3) return scored[0].row;
  const top = scored.filter((row) => row.score === scored[0].score);
  if (top.length === 1) return top[0].row;
  return undefined;
}

export function mapImportedContractStatus(raw?: string | null) {
  const value = String(raw ?? "").trim();
  if (!value) return "Need Review";
  const n = value.toLowerCase();
  const exact = CONTRACT_STATUSES.find((status) => status.name.toLowerCase() === n);
  if (exact) return exact.name;
  if (/final\s*dis/.test(n)) return "Final Disapproval";
  if (/disapprov/.test(n)) return "Disapproved";
  if (/final\s*approv/.test(n)) return "Final Approval";
  if (/\bapproved\b/.test(n)) return "Approved";
  if (/trenton/.test(n)) return "Trenton Log";
  if (/sent back/.test(n)) return "Sent Back to District";
  if (/2nd|second/.test(n)) return "2nd review";
  if (/missing|pending|1st/.test(n)) return "1st review missing items";
  if (/cancel/.test(n)) return "Cancelled";
  return "Need Review";
}

function labeledValue(text: string, labels: string[], nextLabels: string[]) {
  const label = labels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const stop = nextLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const guard = labels.includes("district") ? "(?<!to )" : "";
  const re = new RegExp(`${guard}(?:${label})\\s*[:#]\\s*(.+?)(?=\\s+(?:${stop})\\s*[:#]|$)`, "i");
  const match = text.match(re);
  return match?.[1]?.trim().replace(/[.;,]+$/, "") || "";
}

const CONTRACT_LABELS = [
  "date received",
  "district",
  "bus company",
  "contractor",
  "type",
  "multi-contract number",
  "multi contract number",
  "multi-contract",
  "route number(s)",
  "route numbers",
  "route number",
  "routes",
  "bid number",
  "bid #",
  "status",
  "1st reviewer",
  "first reviewer",
  "2nd reviewer",
  "second reviewer",
  "date sent to district",
  "date sent",
  "insurance expiration date",
  "insurance expiration",
  "insurance expires",
  "county",
];

function parseContractChunk(chunk: string): ExtractedCurrentContract | null {
  const text = chunk.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const districtName = labeledValue(text, ["district"], CONTRACT_LABELS.filter((label) => label !== "district"));
  const busCompany = labeledValue(
    text,
    ["bus company", "contractor"],
    CONTRACT_LABELS.filter((label) => label !== "bus company" && label !== "contractor")
  );
  const multiContractNumber = labeledValue(
    text,
    ["multi-contract number", "multi contract number", "multi-contract"],
    CONTRACT_LABELS.filter((label) => !label.startsWith("multi"))
  );
  if (!districtName && !busCompany && !multiContractNumber) return null;
  const dateReceived = labeledValue(text, ["date received"], CONTRACT_LABELS.filter((label) => label !== "date received"));
  const type = labeledValue(text, ["type"], CONTRACT_LABELS.filter((label) => label !== "type"));
  const routeNumbers = labeledValue(
    text,
    ["route number(s)", "route numbers", "route number", "routes"],
    CONTRACT_LABELS.filter((label) => !label.startsWith("route"))
  );
  const bidNumber = labeledValue(text, ["bid number", "bid #"], CONTRACT_LABELS.filter((label) => !label.startsWith("bid")));
  const status = labeledValue(text, ["status"], CONTRACT_LABELS.filter((label) => label !== "status"));
  const firstReviewer = labeledValue(
    text,
    ["1st reviewer", "first reviewer"],
    CONTRACT_LABELS.filter((label) => label !== "1st reviewer" && label !== "first reviewer")
  );
  const secondReviewer = labeledValue(
    text,
    ["2nd reviewer", "second reviewer"],
    CONTRACT_LABELS.filter((label) => label !== "2nd reviewer" && label !== "second reviewer")
  );
  const dateSentToDistrict = labeledValue(
    text,
    ["date sent to district", "date sent"],
    CONTRACT_LABELS.filter((label) => !label.startsWith("date sent"))
  );
  const insuranceExpiration = labeledValue(
    text,
    ["insurance expiration date", "insurance expiration", "insurance expires"],
    CONTRACT_LABELS.filter((label) => !label.startsWith("insurance"))
  );
  const county = labeledValue(text, ["county"], CONTRACT_LABELS.filter((label) => label !== "county"));
  return {
    dateReceived: toIsoDate(dateReceived),
    districtName,
    busCompany,
    type: mapContractType(type),
    multiContractNumber,
    routeNumbers,
    bidNumber: bidNumber || null,
    status: status || null,
    firstReviewer: firstReviewer || null,
    secondReviewer: secondReviewer || null,
    dateSentToDistrict: toIsoDate(dateSentToDistrict),
    insuranceExpiration: toIsoDate(insuranceExpiration),
    county: matchNjCounty(county || null),
  };
}

function toIsoDate(value: string) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return value.trim() || null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function splitContractChunks(text: string) {
  const cleaned = text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").trim();
  if (!cleaned) return [];
  const delimiters = [
    /(?=---\s*CONTRACT\s*---)/i,
    /(?=CONTRACT RECORD\b)/i,
    /(?=Date received\s*:)/i,
    /(?=DATE RECEIVED\s*:)/i,
  ];
  for (const delimiter of delimiters) {
    const parts = cleaned
      .split(delimiter)
      .map((part) => part.trim())
      .filter((part) => part && !/^---\s*CONTRACT\s*---$/i.test(part));
    if (parts.length > 1) return parts;
  }
  return [cleaned];
}

export function parseContractsFromText(text: string): ExtractedCurrentContract[] {
  const chunks = splitContractChunks(text);
  const rows = chunks
    .map(parseContractChunk)
    .filter((row): row is ExtractedCurrentContract => Boolean(row && (row.districtName || row.busCompany)));
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      row.multiContractNumber,
      row.districtName,
      row.busCompany,
      row.routeNumbers,
      row.dateReceived,
    ]
      .join("|")
      .toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeExtracted(row: Partial<ExtractedCurrentContract>): ExtractedCurrentContract | null {
  const districtName = String(row.districtName ?? "").trim();
  const busCompany = String(row.busCompany ?? "").trim();
  if (!districtName && !busCompany) return null;
  return {
    dateReceived: toIsoDate(String(row.dateReceived ?? "")) || null,
    districtName,
    busCompany,
    type: mapContractType(row.type),
    multiContractNumber: String(row.multiContractNumber ?? "").trim(),
    routeNumbers: String(row.routeNumbers ?? "").trim(),
    bidNumber: String(row.bidNumber ?? "").trim() || null,
    status: String(row.status ?? "").trim() || null,
    firstReviewer: String(row.firstReviewer ?? "").trim() || null,
    secondReviewer: String(row.secondReviewer ?? "").trim() || null,
    dateSentToDistrict: toIsoDate(String(row.dateSentToDistrict ?? "")) || null,
    insuranceExpiration: toIsoDate(String(row.insuranceExpiration ?? "")) || null,
    county: matchNjCounty(row.county || null),
  };
}

async function extractWithOpenAi(text: string, key: string): Promise<ExtractedCurrentContract[]> {
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
            "Extract every school transportation contract from this office PDF. Return JSON only: {\"contracts\":[{dateReceived,districtName,busCompany,type,multiContractNumber,routeNumbers,bidNumber,status,firstReviewer,secondReviewer,dateSentToDistrict,insuranceExpiration,county}]}. type must be original, renewal, parental, quote, addendum, or joint. Use YYYY-MM-DD dates when you can. routeNumbers can be a comma-separated string. Omit nothing you can read; leave unknown fields empty.",
        },
        { role: "user", content: text.slice(0, 20000) },
      ],
    }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
    contracts?: Array<Partial<ExtractedCurrentContract>>;
  };
  return (parsed.contracts || [])
    .map(normalizeExtracted)
    .filter((row): row is ExtractedCurrentContract => Boolean(row));
}

export async function extractCurrentContracts(text: string): Promise<ExtractedCurrentContract[]> {
  const local = parseContractsFromText(text);
  const key = process.env.OPENAI_API_KEY;
  if (!key || !text.trim()) return local;
  try {
    const ai = await extractWithOpenAi(text, key);
    return ai.length ? ai : local;
  } catch {
    return local;
  }
}

export async function extractCurrentContractsFromFile(file: File): Promise<ExtractedCurrentContract[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = fileToText(buffer, file.name);
  return extractCurrentContracts(text);
}
