import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jointMatchesForContract, jointRouteLabel, matchingRouteNumbers } from "./joint-agreements";

describe("joint agreements", () => {
  it("matches route numbers even when spacing differs", () => {
    assert.deepEqual(matchingRouteNumbers(["12", "14A"], ["12", "14 A", "99"]), ["12", "14A"]);
  });

  it("links a regular contract to every joint agreement that shares a route", () => {
    const matches = jointMatchesForContract(
      { type: "original", routes: ["4", "9"] },
      [
        { id: "j1", hostName: "Clifton", joinerDistricts: "Wayne", routes: ["9", "10"], statusName: "Approved" },
        { id: "j2", hostName: "Passaic", joinerDistricts: "Totowa", routes: ["4"], statusName: "Need Review" },
        { id: "j3", hostName: "Bloomfield", joinerDistricts: "Glen Rock", routes: ["22"], statusName: "Need Review" },
      ]
    );
    assert.deepEqual(matches.map((match) => match.id), ["j1", "j2"]);
    assert.deepEqual(matches[0].matchedRoutes, ["9"]);
    assert.deepEqual(matches[1].matchedRoutes, ["4"]);
  });

  it("does not look for a joint agreement on a joint agreement", () => {
    const matches = jointMatchesForContract(
      { type: "joint", routes: ["9"] },
      [{ id: "j1", hostName: "Clifton", joinerDistricts: "Wayne", routes: ["9"] }]
    );
    assert.equal(matches.length, 0);
  });

  it("labels a joint agreement by its routes", () => {
    assert.equal(jointRouteLabel([" 12 ", "", "14"]), "12, 14");
  });
});
