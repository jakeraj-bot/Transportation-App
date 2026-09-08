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

function cell(row: SpreadsheetRow, ...keys: string[]) {
  const wanted = new Set(keys.map(normalizeHeader));
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(normalizeHeader(key)) && String(value ?? "").trim()) {
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
  return tabs > commas ? "\t" : ",";
}

export function parseCsvText(text: string): SpreadsheetRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter);
    const row: SpreadsheetRow = {};
    headers.forEach((header, i) => {
      row[header] = (cells[i] || "").trim();
    });
    return row;
  });
}

function sheetRowsToObjects(matrix: Array<Array<string | number | Date | null | undefined>>): SpreadsheetRow[] {
  const headerRow = matrix.find((row) => row.some((value) => String(value ?? "").trim()));
  if (!headerRow) return [];
  const headers = headerRow.map((value) => String(value ?? "").trim());
  const start = matrix.indexOf(headerRow) + 1;
  return matrix.slice(start).flatMap((line) => {
    const row: SpreadsheetRow = {};
    let any = false;
    headers.forEach((header, i) => {
      if (!header) return;
      const raw = line[i];
      let value = "";
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        value = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")}`;
      } else if (raw != null && String(raw).trim()) {
        value = String(raw).trim();
      }
      row[header] = value;
      if (value) any = true;
    });
    return any ? [row] : [];
  });
}

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetRow[]> {
  const name = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || bytes.subarray(0, 2).toString() === "PK") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    return sheetRowsToObjects(matrix);
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
  const legalName = cell(
    row,
    "legalName",
    "name",
    "contractor",
    "busCompany",
    "contractorName",
    "company"
  );
  if (!legalName) return null;

  const compliance = cell(row, "complianceStatus", "certStatus", "annualCertStatus");
  const statusNotes = cell(row, "status", "comments", "statusNotes");
  const plainNotes = cell(row, "notes");
  const statusName = mapCertStatus(compliance);
  const reviewedDate = parseFlexibleDate(
    cell(row, "dateReviewed", "reviewedDate", "reviewed", "dateReview")
  );
  const receivedDate = parseFlexibleDate(cell(row, "dateReceived", "receivedDate", "received"));
  const letterDate = statusName === "Approved" ? parseFlexibleDate(statusNotes) || reviewedDate : null;
  const noteParts = [statusNotes || plainNotes || null].filter(Boolean);
  const hasCertInfo = Boolean(compliance || statusNotes || receivedDate || reviewedDate);

  return {
    legalName,
    ospCode:
      cell(row, "ospCode", "osp", "contractorCode", "code", "officeOfStudentProtectionCode") || null,
    county: matchNjCounty(cell(row, "county", "countyName") || null),
    receivedDate,
    reviewedDate,
    statusName,
    notes: noteParts.length ? noteParts.join("\n") : null,
    letterDate,
    hasCertInfo,
    dba: cell(row, "dba") || null,
    vendorCode: cell(row, "vendorCode", "vendor") || null,
    busLocation: cell(row, "busLocation", "location") || null,
    contactName: cell(row, "contactName", "contact") || null,
    phone: cell(row, "phone") || null,
    email: cell(row, "email") || null,
    brcNumber: cell(row, "brcNumber", "certificateNumber") || null,
  };
}
