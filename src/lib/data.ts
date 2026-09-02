import { CHECKLISTS, checklistDefinition } from "./checklists";
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

export async function syncChecklistTemplates() {
  for (const list of CHECKLISTS) {
    const contractType = list.contractType ?? null;
    let template = await prisma.checklistTemplate.findFirst({
      where: { entityType: list.entityType, contractType },
    });
    if (!template) {
      template = await prisma.checklistTemplate.create({
        data: {
          entityType: list.entityType,
          contractType,
          name: list.name,
        },
      });
    } else if (template.name !== list.name) {
      template = await prisma.checklistTemplate.update({
        where: { id: template.id },
        data: { name: list.name },
      });
    }
    const existing = await prisma.checklistTemplateItem.findMany({ where: { templateId: template.id } });
    const wanted = new Set(list.items);
    for (let sortOrder = 0; sortOrder < list.items.length; sortOrder += 1) {
      const label = list.items[sortOrder];
      const match = existing.find((item) => item.label === label);
      if (match) {
        if (match.sortOrder !== sortOrder) {
          await prisma.checklistTemplateItem.update({
            where: { id: match.id },
            data: { sortOrder },
          });
        }
      } else {
        await prisma.checklistTemplateItem.create({
          data: { templateId: template.id, label, sortOrder },
        });
      }
    }
    for (const item of existing) {
      if (!wanted.has(item.label)) {
        await prisma.checklistTemplateItem.delete({ where: { id: item.id } });
      }
    }
  }
}

export async function ensureChecklist(
  entityType: string,
  entityId: string,
  contractType?: string | null
) {
  const defined = checklistDefinition(entityType, contractType);
  const template = defined ? null : await getChecklistTemplate(entityType, contractType);
  const labels = defined?.items ?? template?.items.map((item) => item.label) ?? [];
  if (!labels.length) return [];
  for (const itemLabel of labels) {
    await prisma.checklistResponse.upsert({
      where: {
        entityType_entityId_itemLabel: {
          entityType,
          entityId,
          itemLabel,
        },
      },
      update: {},
      create: {
        entityType,
        entityId,
        itemLabel,
        checked: false,
      },
    });
  }
  await prisma.checklistResponse.deleteMany({
    where: { entityType, entityId, itemLabel: { notIn: labels } },
  });
  const responses = await prisma.checklistResponse.findMany({
    where: { entityType, entityId, itemLabel: { in: labels } },
  });
  const byLabel = new Map(responses.map((row) => [row.itemLabel, row]));
  return labels.map((label) => byLabel.get(label)).filter((row): row is NonNullable<typeof row> => Boolean(row));
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
