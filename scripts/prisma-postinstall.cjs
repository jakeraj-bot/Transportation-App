"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");

function prismaCli() {
  return require.resolve("prisma/build/index.js");
}

function generate(schema, env) {
  execFileSync(process.execPath, [prismaCli(), "generate", "--schema", schema], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

try {
  if (process.env.VERCEL) {
    const placeholder = "postgresql://build:build@127.0.0.1:5432/postgres";
    console.log("postinstall: generating Prisma Postgres client for Vercel");
    generate("prisma/schema.postgres.prisma", {
      DATABASE_URL: process.env.DATABASE_URL || placeholder,
      DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || placeholder,
    });
  } else {
    generate("prisma/schema.prisma", {});
  }
} catch (error) {
  console.warn("prisma generate during postinstall did not finish:", error.message);
  console.warn("vercel-build will try again with the Postgres schema.");
}
