"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");

const ENV_CLICKS = `
Copy URIs from Supabase:
  1. supabase.com/dashboard → your project
  2. Connect → ORM → Prisma
  3. DATABASE_URL = Transaction pooler (port 6543). Add ?pgbouncer=true if missing.
  4. DIRECT_URL = Session pooler (port 5432).
  5. Replace [YOUR-PASSWORD] with the database password. Not anon / service_role keys.

Paste into Vercel:
  1. vercel.com/yea14/transportation-app
  2. Settings → Environment Variables
  3. Production + Build must be ON for:
       DATABASE_URL    postgresql://…@…pooler.supabase.com:6543/postgres?pgbouncer=true
       DIRECT_URL      postgresql://…@…pooler.supabase.com:5432/postgres
       AUTH_SECRET     a long random string
       SEED_DEMO       0
  4. Deployments → commit 1a58d70 or newer (not c8c64d5) → Redeploy, cache OFF.
`.trim();

function fail(message, extra) {
  console.error("\n========== BUILD FAILED ==========");
  console.error(`Error: ${message}`);
  if (extra) console.error(`\n${extra}`);
  console.error("\n========== END BUILD ERROR ==========\n");
  process.exit(1);
}

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
  return encodePasswordInUrl(url);
}

function encodePasswordInUrl(raw) {
  if (!raw || !/^postgres(ql)?:\/\//i.test(raw)) return raw;
  const match = raw.match(/^(postgres(?:ql)?:\/\/)([^/]+)@(.+)$/i);
  if (!match) return raw;
  const [, proto, userPass, rest] = match;
  const colon = userPass.indexOf(":");
  if (colon < 0) return raw;
  const user = userPass.slice(0, colon);
  const password = userPass.slice(colon + 1);
  if (!password || /%[0-9A-Fa-f]{2}/.test(password)) return raw;
  if (!/[^A-Za-z0-9._~-]/.test(password)) return raw;
  return `${proto}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${rest}`;
}

function isPostgresUrl(url) {
  return Boolean(url && /^postgres(ql)?:\/\//i.test(url));
}

function isSqliteUrl(url) {
  return Boolean(url && (/^file:/i.test(url) || /dev\.db/i.test(url)));
}

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function describeUrl(url) {
  if (url == null || url === "") return "(missing)";
  if (isSqliteUrl(url)) return "SQLite file: URL (not allowed on Vercel)";
  const parsed = parseUrl(url);
  if (!parsed) {
    return "(could not parse — a special character in the password may need encoding)";
  }
  return `${parsed.protocol}//${parsed.hostname}:${parsed.port || "default"}${parsed.pathname} (password ${parsed.password ? "set" : "MISSING"})`;
}

function withSsl(url) {
  const parsed = parseUrl(url);
  if (!parsed) return url;
  if (!parsed.searchParams.has("sslmode")) parsed.searchParams.set("sslmode", "require");
  return parsed.toString();
}

function asSessionUrl(url) {
  const parsed = parseUrl(url);
  if (!parsed) return url;
  if (parsed.port === "6543") parsed.port = "5432";
  parsed.searchParams.delete("pgbouncer");
  if (!parsed.searchParams.has("sslmode")) parsed.searchParams.set("sslmode", "require");
  return parsed.toString();
}

function asPoolerUrl(url) {
  const parsed = parseUrl(url);
  if (!parsed) return url;
  if (!parsed.searchParams.has("pgbouncer") && parsed.port === "6543") {
    parsed.searchParams.set("pgbouncer", "true");
  }
  if (!parsed.searchParams.has("sslmode")) parsed.searchParams.set("sslmode", "require");
  return parsed.toString();
}

function isDirectDbHost(url) {
  const parsed = parseUrl(url);
  return Boolean(parsed && /^db\./i.test(parsed.hostname) && /supabase\.co$/i.test(parsed.hostname));
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

function run(label, args, extraEnv) {
  try {
    execFileSync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...extraEnv },
    });
  } catch (error) {
    const tail = `${error.stdout || ""}\n${error.stderr || ""}`.trim().slice(-4000);
    if (tail) {
      console.error(tail);
      error.logTail = tail;
    }
    error.step = label;
    throw error;
  }
}

function main() {
  console.log("Vercel database setup (commit must show: node scripts/vercel-db-setup.cjs)");
  console.log("If the line above vercel-build still says tsx scripts/vercel-db-setup.ts, this is the old c8c64d5 commit — Redeploy 1a58d70 or newer.");

  let databaseUrl = normalizeDbUrl(process.env.DATABASE_URL);
  let directUrl = normalizeDbUrl(process.env.DIRECT_URL);

  console.log(`  DATABASE_URL: ${describeUrl(databaseUrl)}`);
  console.log(`  DIRECT_URL:   ${describeUrl(directUrl)}`);
  console.log(`  AUTH_SECRET:  ${process.env.AUTH_SECRET ? "set" : "(missing)"}`);
  console.log(`  SEED_DEMO:    ${process.env.SEED_DEMO ?? "(unset)"}`);

  if (!databaseUrl) {
    fail(
      "DATABASE_URL is missing on Vercel (not set for Production + Build).",
      ENV_CLICKS
    );
  }
  if (isSqliteUrl(databaseUrl)) {
    fail(
      "DATABASE_URL is still a SQLite file: URL. Use the Supabase postgresql:// pooler URI, not file:./dev.db.",
      ENV_CLICKS
    );
  }
  if (!isPostgresUrl(databaseUrl)) {
    fail(
      "DATABASE_URL is not postgres:// or postgresql://. Paste the Supabase Prisma connection string, not an API key.",
      ENV_CLICKS
    );
  }
  if (isDirectDbHost(databaseUrl)) {
    fail(
      "DATABASE_URL uses db.xxx.supabase.co (IPv6-only). Vercel often cannot reach it. Use Connect → Prisma Transaction pooler (…pooler.supabase.com:6543).",
      ENV_CLICKS
    );
  }

  databaseUrl = asPoolerUrl(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;

  if (!directUrl) {
    directUrl = asSessionUrl(databaseUrl);
    console.log(`DIRECT_URL was missing; using session URL: ${describeUrl(directUrl)}`);
  } else if (isSqliteUrl(directUrl) || !isPostgresUrl(directUrl)) {
    fail("DIRECT_URL is set but is not a postgresql:// URI. Use the Session pooler (port 5432).", ENV_CLICKS);
  } else if (isDirectDbHost(directUrl)) {
    console.log("DIRECT_URL uses db.xxx.supabase.co; switching to the pooler host from DATABASE_URL so Vercel can connect.");
    directUrl = asSessionUrl(databaseUrl);
  } else {
    directUrl = asSessionUrl(directUrl);
  }
  process.env.DIRECT_URL = directUrl;
  console.log(`  DIRECT_URL for db push: ${describeUrl(directUrl)}`);

  if (!process.env.AUTH_SECRET) {
    fail(
      "AUTH_SECRET is missing. In Vercel → Settings → Environment Variables add AUTH_SECRET (any long random string) for Production + Build.",
      ENV_CLICKS
    );
  }

  const prisma = prismaCli();

  console.log("Generating Prisma client for PostgreSQL...");
  try {
    run("prisma generate", [prisma, "generate", "--schema", "prisma/schema.postgres.prisma"]);
  } catch (error) {
    fail(
      "prisma generate failed. The Prisma output is above / in the block below.",
      error.logTail || String(error.message)
    );
  }

  console.log("Pushing Prisma schema to Supabase Postgres...");
  try {
    run("prisma db push", [prisma, "db", "push", "--schema", "prisma/schema.postgres.prisma", "--skip-generate"]);
  } catch (error) {
    fail(
      "prisma db push could not reach Supabase. Check the database password, URL-encode special characters, use pooler.supabase.com (not db.xxx), DIRECT_URL port 5432, and that both env vars are enabled for Production + Build.",
      `${error.logTail || error.message}\n\n${ENV_CLICKS}`
    );
  }

  console.log("Seeding empty office (SEED_DEMO=0)...");
  try {
    run("seed", [tsxCli(), "prisma/seed.ts"], {
      SEED_DEMO: "0",
      NODE_ENV: "production",
    });
  } catch (error) {
    fail(
      "Seed failed after schema push. Prisma/seed output is below.",
      error.logTail || error.message
    );
  }

  console.log("Database setup finished. Starting next build...");
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
