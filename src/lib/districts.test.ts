import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { districtOptionLabel } from "./districts";

describe("district labels", () => {
  it("leaves Passaic County districts as the name only", () => {
    assert.equal(districtOptionLabel("NRESC", "Passaic"), "NRESC");
    assert.equal(districtOptionLabel("Wayne", null), "Wayne");
  });

  it("shows the county when the district is outside Passaic", () => {
    assert.equal(districtOptionLabel("Ridgewood", "Bergen"), "Ridgewood (Bergen)");
  });
});
