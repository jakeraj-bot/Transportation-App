export function districtOptionLabel(name: string, county?: string | null) {
  const countyName = (county ?? "").trim();
  if (!countyName || countyName.toLowerCase() === "passaic") return name;
  return `${name} (${countyName})`;
}
