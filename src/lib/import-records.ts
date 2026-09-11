import { matchNjCounty } from "./nj-counties";
import { CONTRACT_TYPES } from "./utils";

export type SpreadsheetRow = Record<string, string>;

export type ParsedContractorImport = {
  legalName: string;
  ospCode: string | null;
  county: string | null;
  receivedDate: Date | null;
  reviewedDate: Date | null;
  statusName: string;
  notes: string | null;
  letterDate: Date | null;
  hasCertInfo: boolean;
  dba: string | null;
  vendorCode: string | null;
  busLocation: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  brcNumber: string | null;
};

type ColumnKey =
  | "legalName"
  | "ospCode"
  | "county"
  | "receivedDate"
  | "reviewedDate"
  | "compliance"
  | "notes"
  | "dba"
  | "vendorCode"
  | "busLocation"
  | "contactName"
  | "phone"
  | "email"
  | "brcNumber";

export function parseFlexibleDate(value?: string | Date | null) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
  }
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);

  const us = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3]);
    return new Date(year, Number(us[1]) - 1, Number(us[2]), 12);
  }

  const serial = Number(trimmed);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000 && !trimmed.includes("/")) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(serial));
    return new Date(epoch.getUTCFullYear(), epoch.getUTCMonth(), epoch.getUTCDate(), 12);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12);
}

export function normalizeHeader(header: string) {
  return header.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function classifyHeader(header: string): ColumnKey | null {
  const h = normalizeHeader(header);
  if (!h) return null;
  if (h.includes("county")) return "county";
  if (
    (h.includes("contractor") && h.includes("code")) ||
    h.includes("osp") ||
    (h.includes("protection") && h.includes("code")) ||
    h === "code"
  ) {
    return "ospCode";
  }
  if (h.includes("compliance")) return "compliance";
  if (h.includes("received")) return "receivedDate";
  if (h.includes("review")) return "reviewedDate";
  if (h.includes("vendor")) return "vendorCode";
  if (h.includes("location") || h.includes("busyard") || h.includes("garage")) return "busLocation";
  if (h.includes("contact")) return "contactName";
  if (h.includes("phone") || h.includes("tel")) return "phone";
  if (h.includes("email") || h.includes("mail")) return "email";
  if (h.includes("brc") || h.includes("certificate")) return "brcNumber";
  if (h === "dba" || h.includes("doingbusiness")) return "dba";
  if (
    h.includes("legalname") ||
    h.includes("buscompany") ||
    h.includes("companyname") ||
    h.includes("contractorname") ||
    (h.includes("bus") && h.includes("company")) ||
    h === "contractor" ||
    h === "company" ||
    h === "name" ||
    h === "bus"
  ) {
    return "legalName";
  }
  if (h === "status" || h.includes("comment") || h.includes("note") || h.includes("remark")) return "notes";
  return null;
}

function cellByClass(row: SpreadsheetRow, key: ColumnKey) {
  for (const [header, value] of Object.entries(row)) {
    if (classifyHeader(header) === key && String(value ?? "").trim()) {
      return String(value).trim();
    }
  }
  return "";
}

export function splitCsvLine(line: string, delimiter = ",") {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.map((value) => value.trim());
}

function detectDelimiter(headerLine: string) {
  const commas = splitCsvLine(headerLine, ",").length;
  const tabs = splitCsvLine(headerLine, "\t").length;
  const semis = splitCsvLine(headerLine, ";").length;
  if (tabs >= commas && tabs >= semis && tabs > 1) return "\t";
  if (semis > commas && semis > 1) return ";";
  return ",";
}

function formatCell(raw: string | number | Date | null | undefined) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")}`;
  }
  if (raw == null) return "";
  return String(raw).trim();
}

function headerScore(cells: Array<string | number | Date | null | undefined>) {
  const keys = new Set(
    cells.map((value) => classifyHeader(formatCell(value))).filter((key): key is ColumnKey => Boolean(key))
  );
  return keys.size;
}

function notesHeaderIndex(cells: Array<string | number | Date | null | undefined>) {
  return cells.findIndex((value) => {
    const raw = formatCell(value);
    const key = classifyHeader(raw);
    const name = normalizeHeader(raw);
    return key === "notes" && (name === "status" || name.includes("note") || name.includes("comment"));
  });
}

function lineToRow(
  headers: string[],
  line: Array<string | number | Date | null | undefined>
): SpreadsheetRow | null {
  const row: SpreadsheetRow = {};
  let any = false;
  headers.forEach((header, i) => {
    if (!header) return;
    const value = formatCell(line[i]);
    row[header] = value;
    if (value) any = true;
  });
  return any ? row : null;
}

function matrixToRows(matrix: Array<Array<string | number | Date | null | undefined>>): SpreadsheetRow[] {
  if (!matrix.length) return [];
  let bestIndex = 0;
  let bestScore = 0;
  const scan = Math.min(matrix.length, 20);
  for (let i = 0; i < scan; i += 1) {
    const score = headerScore(matrix[i] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestScore < 1) return [];
  const headerLine = [...(matrix[bestIndex] ?? [])];
  const notesAt = notesHeaderIndex(headerLine);
  let extraOnHeader: Array<string | number | Date | null | undefined> = [];
  if (notesAt >= 0 && headerLine.length > notesAt + 1) {
    extraOnHeader = headerLine.slice(notesAt + 1);
    headerLine.length = notesAt + 1;
  }
  const headers = headerLine.map((value) => formatCell(value));
  const dataLines = matrix.slice(bestIndex + 1);
  if (extraOnHeader.some((value) => formatCell(value))) dataLines.unshift(extraOnHeader);
  return dataLines.flatMap((line) => {
    const row = lineToRow(headers, line);
    return row ? [row] : [];
  });
}

export function parseCsvText(text: string): SpreadsheetRow[] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const delimiter = detectDelimiter(lines[0]);
  const matrix = lines.map((line) => splitCsvLine(line, delimiter));
  return matrixToRows(matrix);
}

function loadXlsx(mod: Record<string, unknown>) {
  const candidate = (mod.default ?? mod) as typeof import("xlsx");
  if (typeof candidate.read !== "function") {
    throw new Error("Excel support did not load.");
  }
  return candidate;
}

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetRow[]> {
  const name = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  const looksZip = bytes.subarray(0, 2).toString() === "PK";
  const looksExcel =
    name.endsWith(".xlsx") ||
    name.endsWith(".xlsm") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsb") ||
    looksZip;

  if (looksExcel) {
    try {
      const XLSX = loadXlsx((await import("xlsx")) as unknown as Record<string, unknown>);
      const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
      let best: SpreadsheetRow[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
          header: 1,
          defval: "",
          raw: true,
        });
        const rows = matrixToRows(matrix);
        if (rows.length > best.length) best = rows;
      }
      if (best.length) return best;
    } catch (error) {
      const asText = bytes.toString("utf8");
      const csvRows = parseCsvText(asText);
      if (csvRows.length) return csvRows;
      throw error instanceof Error ? error : new Error("That Excel file could not be read.");
    }
  }
  return parseCsvText(bytes.toString("utf8"));
}

export function mapCertStatus(raw?: string | null) {
  const value = String(raw ?? "").trim();
  if (!value) return "Not received";
  const n = value.toLowerCase();
  const known = [
    "Not received",
    "Need review",
    "Pending documents or changes",
    "Approved",
    "Disapproved",
  ];
  const exact = known.find((status) => status.toLowerCase() === n);
  if (exact) return exact;
  if (/(disapproved|denied|rejected)/.test(n)) return "Disapproved";
  if (/\bapproved\b/.test(n)) return "Approved";
  if (/(pending|missing|document|incomplete)/.test(n)) return "Pending documents or changes";
  if (/(not received|outstanding|none)/.test(n)) return "Not received";
  if (n.includes("review")) return "Need review";
  return "Need review";
}

export function mapContractType(raw?: string | null) {
  const n = String(raw ?? "").trim().toLowerCase();
  if (n.startsWith("renew")) return "renewal";
  if (n.startsWith("parent")) return "parental";
  if (n.startsWith("quote") || n.includes("quoted") || n.includes("emergency")) return "quote";
  if (n.startsWith("addend")) return "addendum";
  if (n.startsWith("joint")) return "joint";
  if (n.startsWith("orig") || n.includes("bid")) return "original";
  const hit = CONTRACT_TYPES.find((type) => type.value === n || type.label.toLowerCase() === n);
  return hit?.value ?? "original";
}

export function parseContractorImportRow(row: SpreadsheetRow): ParsedContractorImport | null {
  const legalName = cellByClass(row, "legalName");
  if (!legalName) return null;

  const compliance = cellByClass(row, "compliance");
  const statusNotes = cellByClass(row, "notes");
  const statusName = mapCertStatus(compliance);
  const reviewedDate = parseFlexibleDate(cellByClass(row, "reviewedDate"));
  const receivedDate = parseFlexibleDate(cellByClass(row, "receivedDate"));
  const letterDate = statusName === "Approved" ? parseFlexibleDate(statusNotes) || reviewedDate : null;
  const hasCertInfo = Boolean(compliance || statusNotes || receivedDate || reviewedDate);

  return {
    legalName,
    ospCode: cellByClass(row, "ospCode") || null,
    county: matchNjCounty(cellByClass(row, "county") || null),
    receivedDate,
    reviewedDate,
    statusName,
    notes: statusNotes || null,
    letterDate,
    hasCertInfo,
    dba: cellByClass(row, "dba") || null,
    vendorCode: cellByClass(row, "vendorCode") || null,
    busLocation: cellByClass(row, "busLocation") || null,
    contactName: cellByClass(row, "contactName") || null,
    phone: cellByClass(row, "phone") || null,
    email: cellByClass(row, "email") || null,
    brcNumber: cellByClass(row, "brcNumber") || null,
  };
}

export function describeSpreadsheet(rows: SpreadsheetRow[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const parsed = rows.map(parseContractorImportRow).filter((row): row is ParsedContractorImport => Boolean(row));
  return { headers, parsed };
}
