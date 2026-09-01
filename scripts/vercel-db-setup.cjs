"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");

const ENV_CLICKS = `
If prisma db push failed, the Prisma text is in the BUILD FAILED block.
Password: a literal @ in the password must be %40 once (not %2540).
Keep DIRECT_URL on port 5432 (session pooler), DATABASE_URL on 6543 with pgbouncer=true.
`.trim();

function fail(message, extra) {
  console.error("\n========== BUILD FAILED ==========");
  console.error(`Error: ${message}`);
  if (extra) console.error(`\n${extra}`);
  console.error("\n========== END BUILD ERROR ==========\n");
  process.exit(1);
}

function stripWrap(value) {
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

function encodePasswordOnce(password) {
  if (!password) return "";
  let decoded = password;
  try {
    decoded = decodeURIComponent(password);
  } catch {
    decoded = password;
  }
  return encodeURIComponent(decoded);
}

function decodeOnce(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parsePgUrl(raw) {
  if (!raw || !/^postgres(ql)?:\/\//i.test(raw)) return null;
  const proto = raw.match(/^(postgres(?:ql)?:\/\/)/i)[1];
  const after = raw.slice(proto.length);
  const at = after.lastIndexOf("@");
  if (at < 0) return null;
  const userPass = after.slice(0, at);
  const hostPart = after.slice(at + 1);
  const colon = userPass.indexOf(":");
  const user = colon >= 0 ? userPass.slice(0, colon) : userPass;
  const password = colon >= 0 ? userPass.slice(colon + 1) : "";
  const qMark = hostPart.indexOf("?");
  const query = qMark >= 0 ? hostPart.slice(qMark + 1) : "";
  const hostPath = qMark >= 0 ? hostPart.slice(0, qMark) : hostPart;
  const slash = hostPath.indexOf("/");
  const hostPort = slash >= 0 ? hostPath.slice(0, slash) : hostPath;
  const pathname = slash >= 0 ? hostPath.slice(slash) : "/postgres";
  const lastColon = hostPort.lastIndexOf(":");
  let hostname = hostPort;
  let port = "";
  if (lastColon >= 0 && /^\d+$/.test(hostPort.slice(lastColon + 1))) {
    hostname = hostPort.slice(0, lastColon);
    port = hostPort.slice(lastColon + 1);
  }
  return { proto, user, password, hostname, port, pathname, query };
}

function formatPgUrl(parts, opts = {}) {
  const params = new URLSearchParams(parts.query);
  if (opts.dropPgbouncer) params.delete("pgbouncer");
  if (opts.ensurePgbouncer) params.set("pgbouncer", "true");
  if (opts.ssl && !params.has("sslmode")) params.set("sslmode", "require");
  const port = opts.port || parts.port;
  const user = encodeURIComponent(decodeOnce(parts.user));
  const password = encodePasswordOnce(parts.password);
  const q = params.toString();
  return `${parts.proto}${user}:${password}@${parts.hostname}${port ? `:${port}` : ""}${parts.pathname || "/postgres"}${q ? `?${q}` : ""}`;
}

function normalizeDbUrl(value) {
  const stripped = stripWrap(value);
  if (!stripped) return stripped;
  const parts = parsePgUrl(stripped);
  if (!parts) return stripped;
  return formatPgUrl(parts);
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
  const parts = parsePgUrl(url);
  if (!parts) return "(could not parse postgres URL)";
  const user = decodeOnce(parts.user);
  const userHint = user ? user.replace(/^(postgres\.[a-z0-9]{4}).*$/i, "$1…") : "MISSING USER";
  return `${parts.hostname}:${parts.port || "?"} db=${parts.pathname || "/"} user=${userHint} password=${parts.password ? "set" : "MISSING"}`;
}

function redactPrefix(url) {
  if (url == null || String(url).trim() === "") return "unset";
  const trimmed = String(url).trim();
  if (/^file:/i.test(trimmed) || /dev\.db/i.test(trimmed)) {
    return `sqlite ${trimmed.slice(0, 40)}`;
  }
  const parts = parsePgUrl(trimmed);
  if (parts) return `postgres ${parts.hostname}:${parts.port || "?"}`;
  if (/^postgres(ql)?:\/\//i.test(trimmed)) {
    return "postgres (unparseable — encode @ in the password as %40)";
  }
  const scheme = (trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/) || ["", "unknown"])[1];
  return `other scheme=${scheme} prefix=${trimmed.slice(0, 20)}`;
}

function envDiagnostic() {
  const names = [
    "DATABASE_URL",
    "DIRECT_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "AUTH_SECRET",
    "SEED_DEMO",
  ];
  return names
    .map((name) => {
      if (name === "AUTH_SECRET") return `${name}=${process.env.AUTH_SECRET ? "set" : "unset"}`;
      if (name === "SEED_DEMO") return `${name}=${process.env.SEED_DEMO ?? "unset"}`;
      return `${name}=${redactPrefix(normalizeDbUrl(process.env[name]) || process.env[name])}`;
    })
    .join(" ");
}

function pickPostgres(names) {
  let firstSet;
  for (const name of names) {
    const url = normalizeDbUrl(process.env[name]);
    if (!url) continue;
    if (!firstSet) firstSet = { name, url };
    if (isPostgresUrl(url) && !isSqliteUrl(url)) return { name, url };
  }
  return firstSet || { name: names[0], url: undefined };
}

function asSessionUrl(url) {
  const parts = parsePgUrl(url);
  if (!parts) return url;
  return formatPgUrl(parts, {
    port: "5432",
    dropPgbouncer: true,
    ssl: true,
  });
}

function asPoolerUrl(url) {
  const parts = parsePgUrl(url);
  if (!parts) return url;
  return formatPgUrl(parts, {
    port: parts.port || "6543",
    ensurePgbouncer: parts.port === "6543" || !parts.port,
    ssl: true,
  });
}

function isDirectDbHost(url) {
  const parts = parsePgUrl(url);
  return Boolean(parts && /^db\./i.test(parts.hostname) && /supabase\.co$/i.test(parts.hostname));
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

function run(label, args, extraEnv, timeoutMs) {
  const seconds = Math.round(timeoutMs / 1000);
  console.log(`Starting ${label} (stdio inherit, ${seconds}s timeout, IPv4 DNS first)...`);
  const nodeOptions = [process.env.NODE_OPTIONS, extraEnv.NODE_OPTIONS, "--dns-result-order=ipv4first"]
    .filter(Boolean)
    .join(" ");
  try {
    execFileSync(process.execPath, args, {
      cwd: root,
      stdio: ["ignore", "inherit", "inherit"],
      timeout: timeoutMs,
      killSignal: "SIGTERM",
      env: {
        ...process.env,
        ...extraEnv,
        CI: "1",
        NODE_OPTIONS: nodeOptions,
      },
    });
  } catch (error) {
    const timedOut = Boolean(error.killed) || error.signal === "SIGTERM" || error.code === "ETIMEDOUT";
    error.logTail = [
      `step=${label}`,
      `exit=${error.status ?? "unknown"}`,
      `signal=${error.signal || "none"}`,
      `timedOut=${timedOut}`,
      `message=${error.message}`,
      timedOut
        ? `${label} hung for ${seconds}s with no finish. Prisma prints above this line when stdio is inherited. Usually the Vercel build cannot open TCP/SSL to the Supabase session pooler (DIRECT_URL port 5432).`
        : `${label} exited ${error.status}. Prisma’s stderr/stdout is in the lines immediately above this Error.`,
    ].join("\n");
    throw error;
  }
}

function main() {
  console.log("Vercel database setup (commit must show: node scripts/vercel-db-setup.cjs)");
  const diagnostic = envDiagnostic();
  console.log(`Env diagnostic (redacted, no passwords): ${diagnostic}`);

  const dbPick = pickPostgres(["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]);
  const directPick = pickPostgres(["DIRECT_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL"]);
  let databaseUrl = dbPick.url;
  let directUrl = directPick.url;
  if (databaseUrl && dbPick.name !== "DATABASE_URL") {
    console.log(`Using ${dbPick.name} as DATABASE_URL`);
  }
  if (directUrl && directPick.name !== "DIRECT_URL") {
    console.log(`Using ${directPick.name} as DIRECT_URL`);
  }

  console.log(`  DATABASE_URL: ${describeUrl(databaseUrl)}`);
  console.log(`  DIRECT_URL:   ${describeUrl(directUrl)}`);
  console.log(`  AUTH_SECRET:  ${process.env.AUTH_SECRET ? "set" : "(missing)"}`);
  console.log(`  SEED_DEMO:    ${process.env.SEED_DEMO ?? "(unset)"}`);

  if (!databaseUrl) {
    fail(`DATABASE_URL is unset at build time. ${diagnostic}`, ENV_CLICKS);
  }
  if (isSqliteUrl(databaseUrl)) {
    fail(`DATABASE_URL is still SQLite (${redactPrefix(databaseUrl)}).`, ENV_CLICKS);
  }
  if (!isPostgresUrl(databaseUrl)) {
    fail(`DATABASE_URL is not postgres/postgresql (${redactPrefix(databaseUrl)}).`, ENV_CLICKS);
  }
  if (isDirectDbHost(databaseUrl)) {
    fail("DATABASE_URL uses db.xxx.supabase.co (IPv6-only). Use the pooler host.", ENV_CLICKS);
  }

  databaseUrl = asPoolerUrl(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;

  if (!directUrl) {
    directUrl = asSessionUrl(databaseUrl);
    console.log(`DIRECT_URL was missing; using session URL: ${describeUrl(directUrl)}`);
  } else if (isSqliteUrl(directUrl) || !isPostgresUrl(directUrl)) {
    fail("DIRECT_URL is set but is not a postgresql:// URI.", ENV_CLICKS);
  } else if (isDirectDbHost(directUrl)) {
    console.log("DIRECT_URL uses db.xxx.supabase.co; switching to the pooler host from DATABASE_URL.");
    directUrl = asSessionUrl(databaseUrl);
  } else {
    directUrl = asSessionUrl(directUrl);
  }
  process.env.DIRECT_URL = directUrl;
  console.log(`  DIRECT_URL for db push: ${describeUrl(directUrl)}`);

  const dbParts = parsePgUrl(databaseUrl);
  const directParts = parsePgUrl(directUrl);
  if (!dbParts?.user || !directParts?.user) {
    fail("Rewritten database URL is missing the postgres.PROJECT username. Re-copy the Prisma URI from Supabase.");
  }
  if (directParts.port && directParts.port !== "5432") {
    fail(`DIRECT_URL for db push must be port 5432 (got ${directParts.port}).`);
  }

  if (!process.env.AUTH_SECRET) {
    fail("AUTH_SECRET is missing.", ENV_CLICKS);
  }

  const prisma = prismaCli();
  const prismaEnv = {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    CI: "1",
  };

  console.log("Generating Prisma client for PostgreSQL...");
  try {
    run("prisma generate", [prisma, "generate", "--schema", "prisma/schema.postgres.prisma"], prismaEnv, 60_000);
  } catch (error) {
    fail("prisma generate failed.", error.logTail || String(error.message));
  }

  console.log("Pushing Prisma schema to Supabase Postgres (DIRECT_URL port 5432, sslmode=require)...");
  console.log("Ignore Supabase Connect Step 1 (npm install prisma / prisma init). This app already has Prisma. Only the two URIs from Step 2 are used.");
  try {
    run(
      "prisma db push",
      [prisma, "db", "push", "--schema", "prisma/schema.postgres.prisma", "--skip-generate"],
      prismaEnv,
      45_000
    );
  } catch (error) {
    fail(
      "prisma db push failed or hung. Do not run npm install prisma in Supabase. Check password @ is %40 once (not %2540), DIRECT_URL port 5432, DATABASE_URL port 6543.",
      `${error.logTail || error.message}\n\n${ENV_CLICKS}`
    );
  }

  console.log("Seeding empty office (SEED_DEMO=0)...");
  try {
    run(
      "seed",
      [tsxCli(), "prisma/seed.ts"],
      {
        ...prismaEnv,
        SEED_DEMO: "0",
        NODE_ENV: "production",
      },
      60_000
    );
  } catch (error) {
    fail("Seed failed after schema push.", error.logTail || error.message);
  }

  console.log("Database setup finished. Starting next build...");
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
