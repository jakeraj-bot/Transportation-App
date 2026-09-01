import { execSync } from "node:child_process";

function isPostgresUrl(url?: string) {
  return Boolean(url && /^postgres(ql)?:\/\//i.test(url));
}

function main() {
  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    throw new Error(
      "Production setup needs a Supabase Postgres DATABASE_URL (postgres://...), not a SQLite file."
    );
  }
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = url;
  }

  console.log("Generating Prisma client for PostgreSQL...");
  execSync("npx prisma generate --schema prisma/schema.postgres.prisma", {
    stdio: "inherit",
    env: process.env,
  });

  console.log("Pushing Prisma schema to Supabase Postgres...");
  execSync("npx prisma db push --schema prisma/schema.postgres.prisma", {
    stdio: "inherit",
    env: process.env,
  });

  console.log("Seeding empty office (SEED_DEMO=0)...");
  execSync("npx tsx prisma/seed.ts", {
    stdio: "inherit",
    env: {
      ...process.env,
      SEED_DEMO: "0",
      NODE_ENV: "production",
    },
  });
}

main();
