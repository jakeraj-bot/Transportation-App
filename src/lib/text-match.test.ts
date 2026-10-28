import assert from "node:assert/strict";
import test from "node:test";
import { isPostgresDatabase, textContains } from "./text-match";

test("contract search ignores letter case on Postgres", () => {
  assert.equal(isPostgresDatabase("postgresql://localhost/office"), true);
  assert.equal(isPostgresDatabase("postgres://localhost/office"), true);
  assert.equal(isPostgresDatabase("file:./dev.db"), false);
  assert.deepEqual(textContains("wayne", true), { contains: "wayne", mode: "insensitive" });
  assert.deepEqual(textContains("W-088", true), { contains: "W-088", mode: "insensitive" });
});

test("sqlite search stays a plain contains filter", () => {
  assert.deepEqual(textContains("wayne", false), { contains: "wayne" });
});
