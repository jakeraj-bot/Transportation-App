import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowsMultipleCompanies,
  allowsMultiplePackets,
  formatCompanyNames,
  isIntakeType,
  parseContractorIds,
  parseJoinerDistricts,
  parsePacketRows,
  primaryAndExtraPackets,
  showsBidNumber,
  usesParentName,
} from "./contract-intake";

describe("contract intake types", () => {
  it("knows the six packet types", () => {
    assert.equal(isIntakeType("parental"), true);
    assert.equal(isIntakeType("emergency"), false);
  });

  it("asks for parent name instead of a bus company on parentals", () => {
    assert.equal(usesParentName("parental"), true);
    assert.equal(allowsMultipleCompanies("parental"), false);
  });

  it("lets originals, renewals, and joints have more than one bus company", () => {
    assert.equal(allowsMultipleCompanies("original"), true);
    assert.equal(allowsMultipleCompanies("joint"), true);
    assert.equal(allowsMultipleCompanies("quote"), false);
  });

  it("keeps extra multi-contract numbers on renewals only", () => {
    assert.equal(allowsMultiplePackets("renewal"), true);
    assert.equal(allowsMultiplePackets("original"), false);
    assert.equal(showsBidNumber("original"), true);
    assert.equal(showsBidNumber("quote"), false);
  });
});

describe("packet and company parsing", () => {
  it("uses repeating packet rows when they are filled in", () => {
    const form = new FormData();
    form.append("packetMulti", "MC-1");
    form.append("packetRoute", "R1, R2");
    form.append("packetRenewal", "1");
    form.append("packetMulti", "MC-2");
    form.append("packetRoute", "R9");
    form.append("packetRenewal", "2");
    const parsed = primaryAndExtraPackets(parsePacketRows(form));
    assert.equal(parsed.primary.multiContractNumber, "MC-1");
    assert.equal(parsed.primary.renewalNumber, "1");
    assert.deepEqual(parsed.routeNumbers, ["R1", "R2", "R9"]);
    assert.equal(parsed.extras.length, 1);
    assert.equal(parsed.extras[0].multiContractNumber, "MC-2");
  });

  it("falls back to the single multi-contract fields", () => {
    const form = new FormData();
    form.set("multiContractNumber", "MC-9");
    form.set("routes", "12\n13");
    form.set("renewalNumber", "3");
    const parsed = primaryAndExtraPackets(parsePacketRows(form));
    assert.equal(parsed.primary.multiContractNumber, "MC-9");
    assert.deepEqual(parsed.routeNumbers, ["12", "13"]);
    assert.equal(parsed.extras.length, 0);
  });

  it("keeps unique contractor ids and joiner names", () => {
    const form = new FormData();
    form.append("contractorId", "a");
    form.append("contractorId", "a");
    form.append("contractorId", "b");
    form.append("joinerDistrictName", "Clifton");
    form.append("joinerDistrictName", "Paterson");
    assert.deepEqual(parseContractorIds(form), ["a", "b"]);
    assert.equal(parseJoinerDistricts(form), "Clifton; Paterson");
  });

  it("lists company names in plain English", () => {
    assert.equal(formatCompanyNames(["Garden State"]), "Garden State");
    assert.equal(formatCompanyNames(["A", "B"]), "A and B");
    assert.equal(formatCompanyNames(["A", "B", "C"]), "A, B, and C");
  });
});
