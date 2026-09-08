export const NJ_COUNTIES = [
  "Atlantic",
  "Bergen",
  "Burlington",
  "Camden",
  "Cape May",
  "Cumberland",
  "Essex",
  "Gloucester",
  "Hudson",
  "Hunterdon",
  "Mercer",
  "Middlesex",
  "Monmouth",
  "Morris",
  "Ocean",
  "Passaic",
  "Salem",
  "Somerset",
  "Sussex",
  "Union",
  "Warren",
] as const;

export type NjCounty = (typeof NJ_COUNTIES)[number];

export function matchNjCounty(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\bcounty\b/gi, "").replace(/\s+/g, " ").trim().toLowerCase();
  const hit = NJ_COUNTIES.find((county) => county.toLowerCase() === normalized);
  return hit ?? raw;
}
