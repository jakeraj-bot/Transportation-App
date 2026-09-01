import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isPostgresUrl(url?: string) {
  return Boolean(url && /^postgres(ql)?:\/\//i.test(url));
}

function createPrisma() {
  if (process.env.VERCEL && !isPostgresUrl(process.env.DATABASE_URL)) {
    throw new Error(
      "Vercel must use Supabase Postgres (DATABASE_URL starting with postgres://). A SQLite file on Vercel will disappear."
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
