import { matchNjCounty } from "./nj-counties";
import { prisma } from "./prisma";

export function districtOptionLabel(name: string, county?: string | null) {
  const countyName = (county ?? "").trim();
  if (!countyName || countyName.toLowerCase() === "passaic") return name;
  return `${name} (${countyName})`;
}

export async function findDistrictByName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const exact = await prisma.district.findFirst({
    where: { deletedAt: null, name: trimmed },
  });
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  const candidates = await prisma.district.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const match = candidates.find((row) => row.name.toLowerCase() === lower);
  if (!match) return null;
  return prisma.district.findFirst({ where: { id: match.id, deletedAt: null } });
}

export async function findOrCreateDistrictByName(name: string, county?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter the district name.");
  const existing = await findDistrictByName(trimmed);
  if (existing) {
    const matchedCounty = matchNjCounty(county || null);
    if (matchedCounty && !existing.county) {
      return prisma.district.update({
        where: { id: existing.id },
        data: { county: matchedCounty },
      });
    }
    return existing;
  }
  return prisma.district.create({
    data: {
      name: trimmed,
      email: "",
      county: matchNjCounty(county || null) || "Passaic",
    },
  });
}
