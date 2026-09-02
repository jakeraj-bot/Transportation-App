export function currentSchoolYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = month >= 6 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toInputDate(value?: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseMoney(value?: string | null) {
  if (!value) return null;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

export function parsePercent(value?: string | null) {
  if (!value) return "";
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? "" : String(n);
}

export function formatCurrency(value?: string | number | null) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (value === "" || value == null || Number.isNaN(n)) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value?: string | number | null) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (value === "" || value == null || Number.isNaN(n)) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function daysBetween(later: Date, earlier: Date) {
  const ms = later.getTime() - earlier.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const CONTRACT_TYPES = [
  { value: "original", label: "Original / bid" },
  { value: "renewal", label: "Renewal" },
  { value: "quote", label: "Quote" },
  { value: "parental", label: "Parental" },
  { value: "addendum", label: "Addendum" },
  { value: "joint", label: "Joint agreement" },
] as const;

export function contractTypeLabel(type: string) {
  return CONTRACT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function contractLetterTemplateKey(kind: "approved" | "disapproved", contractType?: string | null) {
  const type = CONTRACT_TYPES.find((t) => t.value === contractType)?.value;
  return type ? `contract_${kind}_${type}` : `contract_${kind}`;
}

export function brcSearchUrl() {
  return "https://www1.state.nj.us/TYTR_BRC/jsp/BRCLoginJsp.jsp";
}

export function nameControlFrom(name: string) {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();
}

export function schoolYearDates(schoolYear: string) {
  const startYear = Number(String(schoolYear).slice(0, 4));
  if (!startYear) return { start: null as Date | null, end: null as Date | null };
  return {
    start: new Date(`${startYear}-09-01T12:00:00`),
    end: new Date(`${startYear + 1}-06-30T12:00:00`),
  };
}

export function debarmentUrl() {
  return "https://www.nj.gov/education/compliance/bussafety/debarment.shtml";
}

export function splitRoutes(raw: string) {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
