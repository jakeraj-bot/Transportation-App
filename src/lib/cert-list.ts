export type CertListRow = {
  id: string;
  statusName: string;
  statusColor?: string;
  notes: string | null;
  receivedDateLabel: string;
  contractorName: string;
  dba: string | null;
  ospCode: string | null;
  vendorCode: string | null;
  county: string | null;
};

export type CertListFilters = {
  q?: string;
  status?: string;
  county?: string;
  open?: boolean;
};

export function certSearchTokens(q?: string) {
  return String(q ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function filterCerts(rows: CertListRow[], filters: CertListFilters) {
  const tokens = certSearchTokens(filters.q);
  const status = String(filters.status ?? "").trim();
  const county = String(filters.county ?? "").trim();
  const open = Boolean(filters.open) && !status;

  return rows.filter((row) => {
    if (open && row.statusName === "Approved") return false;
    if (status && row.statusName !== status) return false;
    if (county && (row.county || "") !== county) return false;
    if (!tokens.length) return true;
    const hay = [
      row.contractorName,
      row.dba,
      row.ospCode,
      row.vendorCode,
      row.county,
      row.notes,
      row.statusName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });
}

export function sortCerts<T extends { contractorName: string; county: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const name = a.contractorName.localeCompare(b.contractorName, "en", { sensitivity: "base" });
    if (name) return name;
    return (a.county || "").localeCompare(b.county || "", "en", { sensitivity: "base" });
  });
}

export function adjacentCerts<T extends { id: string }>(rows: T[], currentId: string) {
  const index = rows.findIndex((row) => row.id === currentId);
  if (index < 0 || rows.length < 2) {
    return { prev: null as T | null, next: null as T | null, position: Math.max(index, 0) + 1, total: rows.length };
  }
  return {
    prev: rows[(index - 1 + rows.length) % rows.length],
    next: rows[(index + 1) % rows.length],
    position: index + 1,
    total: rows.length,
  };
}
