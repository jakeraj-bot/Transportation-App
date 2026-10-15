import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { districtMatchesJoint, jointMatchesForContract, jointRouteLabel, matchingRouteNumbers } from "./joint-agreements";

describe("joint agreements", () => {
  it("matches the host or a joiner district by name", () => {
    const joint = { hostName: "Clifton", joinerDistricts: "Paterson; Wayne" };
    assert.equal(districtMatchesJoint("Clifton", joint), true);
    assert.equal(districtMatchesJoint("paterson", joint), true);
    assert.equal(districtMatchesJoint("Passaic", joint), false);
  });

  it("matches route numbers even when spacing differs", () => {
    assert.deepEqual(matchingRouteNumbers(["12", "14A"], ["12", "14 A", "99"]), ["12", "14A"]);
  });

  it("links a regular contract to a joint agreement on a shared route", () => {
    const matches = jointMatchesForContract(
      { type: "original", districtName: "Wayne", routes: ["4", "9"] },
      [
        { id: "j1", hostName: "Clifton", joinerDistricts: "Wayne", routes: ["9", "10"], statusName: "Approved" },
        { id: "j2", hostName: "Passaic", joinerDistricts: "Totowa", routes: ["9"], statusName: "Need Review" },
      ]
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, "j1");
    assert.deepEqual(matches[0].matchedRoutes, ["9"]);
  });

  it("does not look for a joint agreement on a joint agreement", () => {
    const matches = jointMatchesForContract(
      { type: "joint", districtName: "Clifton", routes: ["9"] },
      [{ id: "j1", hostName: "Clifton", joinerDistricts: "Wayne", routes: ["9"] }]
    );
    assert.equal(matches.length, 0);
  });

  it("labels a joint agreement by its routes", () => {
    assert.equal(jointRouteLabel([" 12 ", "", "14"]), "12, 14");
  });
});
