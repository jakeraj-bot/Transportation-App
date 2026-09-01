import { prisma } from "./prisma";
import { currentSchoolYear } from "./utils";

export async function getSetting(key: string, fallback = "") {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getSchoolYear() {
  return getSetting("schoolYear", currentSchoolYear());
}

export async function getStatuses(entityType: string) {
  return prisma.status.findMany({
    where: { entityType, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });
}

export async function activeDistricts() {
  return prisma.district.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function activeContractors() {
  return prisma.contractor.findMany({
    where: { deletedAt: null },
    orderBy: { legalName: "asc" },
  });
}

export async function getChecklistTemplate(entityType: string, contractType?: string | null) {
  if (contractType) {
    const typed = await prisma.checklistTemplate.findFirst({
      where: { entityType, contractType },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (typed) return typed;
  }
  return prisma.checklistTemplate.findFirst({
    where: { entityType, contractType: null },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function ensureChecklist(
  entityType: string,
  entityId: string,
  contractType?: string | null
) {
  const template = await getChecklistTemplate(entityType, contractType);
  if (!template) return [];
  for (const item of template.items) {
    await prisma.checklistResponse.upsert({
      where: {
        entityType_entityId_itemLabel: {
          entityType,
          entityId,
          itemLabel: item.label,
        },
      },
      update: {},
      create: {
        entityType,
        entityId,
        itemLabel: item.label,
        checked: false,
      },
    });
  }
  return prisma.checklistResponse.findMany({
    where: { entityType, entityId },
    orderBy: { itemLabel: "asc" },
  });
}

export async function refreshContractFlags(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { emergencyQuote: true },
  });
  if (!contract) return;
  const { needsRationaleLetter, missedNextBoardMeeting } = await import("./flags");
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      rationaleNeeded: needsRationaleLetter(contract.receivedDate, contract.boardMeetingDate),
      nextMeetingFlag:
        contract.type === "quote" &&
        missedNextBoardMeeting(contract.emergencyQuote?.approvedAt, contract.boardMeetingDate),
    },
  });
}
