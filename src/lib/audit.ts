import { prisma } from "./prisma";

export async function writeAudit(input: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      details: input.details ? JSON.stringify(input.details) : null,
    },
  });
}
