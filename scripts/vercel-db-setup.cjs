"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const ENV_HELP = `
Vercel did not receive a Postgres DATABASE_URL at build time (it was missing, empty, or still a SQLite file: URL).

Copy the URIs from Supabase:
  1. supabase.com/dashboard → your project
  2. Connect (or Project Settings → Database)
  3. ORM → Prisma
  4. Copy DATABASE_URL (Transaction pooler, port 6543). If it has no ?pgbouncer=true, add it.
  5. Copy DIRECT_URL (Session pooler, port 5432).
  6. Replace [YOUR-PASSWORD] with the database password. Do not use anon / service_role keys.

Paste them into Vercel:
  1. vercel.com/yea14/transportation-app
  2. Settings → Environment Variables
  3. Add these for Production (turn on Production; also enable them for the Build):
       DATABASE_URL    postgresql://…@…pooler.supabase.com:6543/postgres?pgbouncer=true
       DIRECT_URL      postgresql://…@…pooler.supabase.com:5432/postgres
       AUTH_SECRET     a long random string
       SEED_DEMO       0
  4. Save. If the variables already exist, click each one and confirm the value starts with postgresql:// not file:
  5. Deployments → newest commit (not the old c8c64d5) → Redeploy → turn OFF “Use existing Build Cache”.
`.trim();

function normalizeDbUrl(value) {
  if (value == null) return value;
  let url = String(value).trim().replace(/^\uFEFF/, "");
  if (/^DATABASE_URL\s*=/i.test(url)) url = url.replace(/^DATABASE_URL\s*=\s*/i, "");
  if (/^DIRECT_URL\s*=/i.test(url)) url = url.replace(/^DIRECT_URL\s*=\s*/i, "");
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

function isPostgresUrl(url) {
  return Boolean(url && /^postgres(ql)?:\/\//i.test(url));
}

function isSqliteUrl(url) {
  return Boolean(url && (/^file:/i.test(url) || /dev\.db/i.test(url)));
}

function describeUrl(url) {
  if (url == null || url === "") return "(missing)";
  if (isSqliteUrl(url)) return "SQLite file: URL (not allowed on Vercel)";
  try {
    const parsed = new URL(url);
    const port = parsed.port || "default";
    return `${parsed.protocol}//${parsed.hostname}:${port}${parsed.pathname} (password ${parsed.password ? "set" : "MISSING"})`;
  } catch {
    return "(could not parse — check special characters in the password; they must be URL-encoded)";
  }
}

function fail(message) {
  console.error(`\nError: ${message}\n\n${ENV_HELP}\n`);
  process.exit(1);
}

function toDirectUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.port === "6543") parsed.port = "5432";
    parsed.searchParams.delete("pgbouncer");
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

function prismaCli() {
  try {
    return require.resolve("prisma/build/index.js");
  } catch {
    fail("The prisma package is not installed. npm install may have skipped dependencies.");
  }
}

function tsxCli() {
  try {
    return require.resolve("tsx/dist/cli.mjs");
  } catch {
    fail("tsx is not installed. Keep it in dependencies so Vercel can run prisma/seed.ts.");
  }
}

function run(args, extraEnv) {
  execFileSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
}

function main() {
  const databaseUrl = normalizeDbUrl(process.env.DATABASE_URL);
  const directUrl = normalizeDbUrl(process.env.DIRECT_URL);
  if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
  if (directUrl) process.env.DIRECT_URL = directUrl;

  console.log("Vercel database setup");
  console.log(`  DATABASE_URL: ${describeUrl(databaseUrl)}`);
  console.log(`  DIRECT_URL:   ${describeUrl(directUrl)}`);
  console.log(`  AUTH_SECRET:  ${process.env.AUTH_SECRET ? "set" : "(missing)"}`);
  console.log(`  SEED_DEMO:    ${process.env.SEED_DEMO ?? "(unset)"}`);

  if (!databaseUrl) {
    fail("DATABASE_URL is missing on Vercel. Add the Supabase Transaction pooler URI (postgresql://…:6543/…) under Settings → Environment Variables for Production + Build.");
  }
  if (isSqliteUrl(databaseUrl)) {
    fail("DATABASE_URL is still a SQLite file: URL. On Vercel it must be the Supabase postgres/postgresql URI, not file:./dev.db.");
  }
  if (!isPostgresUrl(databaseUrl)) {
    fail("DATABASE_URL is not a postgres:// or postgresql:// URI. Paste the Supabase Prisma connection string, not an API key.");
  }

  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = toDirectUrl(databaseUrl);
    console.log(`DIRECT_URL was missing; derived session URL: ${describeUrl(process.env.DIRECT_URL)}`);
  } else if (isSqliteUrl(process.env.DIRECT_URL) || !isPostgresUrl(process.env.DIRECT_URL)) {
    fail("DIRECT_URL is set but is not a postgresql:// URI. Use the Supabase Session pooler (port 5432).");
  }

  if (!process.env.AUTH_SECRET) {
    fail("AUTH_SECRET is missing. Set a long random value so login cookies work across deploys.");
  }

  const prisma = prismaCli();

  console.log("Generating Prisma client for PostgreSQL...");
  try {
    run([prisma, "generate", "--schema", "prisma/schema.postgres.prisma"]);
  } catch (error) {
    fail(
      `prisma generate failed (${error.status ?? "error"}). If engines were skipped during npm install, this retry should download them. Check that DATABASE_URL and DIRECT_URL are valid postgresql:// URIs.`
    );
  }

  console.log("Pushing Prisma schema to Supabase Postgres...");
  try {
    run([prisma, "db", "push", "--schema", "prisma/schema.postgres.prisma", "--skip-generate"]);
  } catch (error) {
    fail(
      `prisma db push failed (${error.status ?? "error"}). Typical causes: wrong database password, [YOUR-PASSWORD] still in the URI, DIRECT_URL using the 6543 transaction pooler, or the IPv6-only direct host. Use the Session pooler (port 5432) for DIRECT_URL.`
    );
  }

  console.log("Seeding empty office (SEED_DEMO=0)...");
  try {
    run([tsxCli(), "prisma/seed.ts"], {
      SEED_DEMO: "0",
      NODE_ENV: "production",
    });
  } catch (error) {
    fail(`Seed failed (${error.status ?? "error"}). Schema push succeeded but prisma/seed.ts crashed.`);
  }

  console.log("Database setup finished. Starting next build...");
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
