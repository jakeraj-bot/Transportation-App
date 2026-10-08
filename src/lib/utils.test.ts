import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSchoolYear } from "./utils";

describe("normalizeSchoolYear", () => {
  it("keeps the office format", () => {
    assert.equal(normalizeSchoolYear("2026-2027", "2025-2026"), "2026-2027");
  });

  it("expands short school years", () => {
    assert.equal(normalizeSchoolYear("26-27", "2025-2026"), "2026-2027");
    assert.equal(normalizeSchoolYear("2026-27", "2025-2026"), "2026-2027");
  });
});
