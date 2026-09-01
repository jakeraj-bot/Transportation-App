"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const ENV_HELP = `
Set these in Vercel → Project → Settings → Environment Variables
(Production, then Redeploy without build cache):

  DATABASE_URL   Supabase Transaction pooler URI
                 postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true
                 Must start with postgres:// or postgresql://. Never file: or SQLite.
  DIRECT_URL     Supabase Session pooler URI (port 5432), same password.
                 Used for prisma db push. Do not use IPv6-only db.xxx.supabase.co if Vercel cannot connect.
  AUTH_SECRET    a long random secret for login cookies
  SEED_DEMO      0

Use the database connection URI from Supabase (Prisma / connection string),
not the anon or service_role API keys. If the URL still contains [YOUR-PASSWORD],
replace it with the database password.
`.trim();

function isPostgresUrl(url) {
  return Boolean(url && /^postgres(ql)?:\/\//i.test(url));
}

function isSqliteUrl(url) {
  return Boolean(url && (/^file:/i.test(url) || /dev\.db/i.test(url)));
}

function describeUrl(url) {
  if (!url) return "(missing)";
  if (isSqliteUrl(url)) return "file:/SQLite (not allowed on Vercel)";
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
  const databaseUrl = process.env.DATABASE_URL;
  console.log("Vercel database setup");
  console.log(`  DATABASE_URL: ${describeUrl(databaseUrl)}`);
  console.log(`  DIRECT_URL:   ${describeUrl(process.env.DIRECT_URL)}`);
  console.log(`  AUTH_SECRET:  ${process.env.AUTH_SECRET ? "set" : "(missing)"}`);
  console.log(`  SEED_DEMO:    ${process.env.SEED_DEMO ?? "(unset)"}`);

  if (!databaseUrl) {
    fail("DATABASE_URL is missing. Prisma cannot generate, db push, or seed.");
  }
  if (isSqliteUrl(databaseUrl) || !isPostgresUrl(databaseUrl)) {
    fail("DATABASE_URL is not Postgres. Vercel cannot keep a SQLite file; use a Supabase postgresql:// URI.");
  }

  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = toDirectUrl(databaseUrl);
    console.log(`DIRECT_URL was missing; derived session URL: ${describeUrl(process.env.DIRECT_URL)}`);
  } else if (!isPostgresUrl(process.env.DIRECT_URL)) {
    fail("DIRECT_URL is set but is not a postgresql:// URI.");
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
