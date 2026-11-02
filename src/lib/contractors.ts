import { matchNjCounty } from "./nj-counties";
import { prisma } from "./prisma";
import { nameControlFrom } from "./utils";

export async function findContractorByLegalName(legalName: string) {
  const name = legalName.trim();
  if (!name) return null;
  const exact = await prisma.contractor.findFirst({
    where: { deletedAt: null, legalName: name },
  });
  if (exact) return exact;
  const lower = name.toLowerCase();
  const candidates = await prisma.contractor.findMany({
    where: { deletedAt: null },
    select: { id: true, legalName: true },
  });
  const match = candidates.find((row) => row.legalName.toLowerCase() === lower);
  if (!match) return null;
  return prisma.contractor.findFirst({ where: { id: match.id, deletedAt: null } });
}

export async function findOrCreateContractorByLegalName(legalName: string, county?: string) {
  const name = legalName.trim();
  if (!name) throw new Error("Enter the contractor’s name.");
  const existing = await findContractorByLegalName(name);
  if (existing) {
    const matchedCounty = matchNjCounty(county || null);
    if (matchedCounty && !existing.county) {
      return prisma.contractor.update({
        where: { id: existing.id },
        data: { county: matchedCounty },
      });
    }
    return existing;
  }
  return prisma.contractor.create({
    data: {
      legalName: name,
      incomplete: true,
      brcStatus: "Not on file",
      brcNameControl: nameControlFrom(name) || null,
      county: matchNjCounty(county || null),
    },
  });
}
