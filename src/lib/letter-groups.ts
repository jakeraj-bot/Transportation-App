export function dateKey(value?: Date | string | null): string {
  if (!value) return "";
  if (typeof value === "string") {
    const iso = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function normalizeJoiner(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export type LetterGroupInput = {
  type: string;
  districtId: string;
  schoolYear: string;
  hostDistrictId?: string | null;
  joinerDistricts?: string | null;
  receivedDate?: Date | string | null;
};

/** Joint letters share a file only when host, joiner, and date received all match. */
export function letterGroupKey(row: LetterGroupInput): string {
  if (row.type === "joint") {
    return ["joint", row.schoolYear, row.hostDistrictId || "", normalizeJoiner(row.joinerDistricts), dateKey(row.receivedDate)].join(
      "|"
    );
  }
  return [row.type, row.districtId, row.schoolYear].join("|");
}

export function groupByLetter<T>(rows: T[], input: (row: T) => LetterGroupInput): T[][] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = letterGroupKey(input(row));
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return Array.from(map.values());
}

export function sameLetterGroup(a: LetterGroupInput, b: LetterGroupInput): boolean {
  return letterGroupKey(a) === letterGroupKey(b);
}
