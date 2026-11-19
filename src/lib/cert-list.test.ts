import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterCerts, sortCerts, adjacentCerts, type CertListRow } from "./cert-list";
import { NJ_COUNTIES, certCountyOptions, resolveCertCounty } from "./nj-counties";

function row(partial: Partial<CertListRow> & { id: string; contractorName: string }): CertListRow {
  return {
    statusName: "Need review",
    notes: null,
    receivedDateLabel: "—",
    dba: null,
    ospCode: null,
    vendorCode: null,
    county: null,
    ...partial,
  };
}

const rows: CertListRow[] = [
  row({
    id: "1",
    contractorName: "Garden State Bus",
    dba: "GSB",
    ospCode: "12345",
    vendorCode: "V-9",
    county: "Passaic",
    statusName: "Approved",
    notes: "Letter sent Aug 12",
  }),
  row({
    id: "2",
    contractorName: "Omar Transport",
    ospCode: "7788",
    county: "Bergen",
    statusName: "Not received",
  }),
  row({
    id: "3",
    contractorName: "Wayne Coach",
    county: "Passaic",
    statusName: "Pending documents or changes",
    notes: "Missing board minutes",
  }),
];

describe("annual cert list filters", () => {
  it("finds a bus company without worrying about capital letters", () => {
    assert.deepEqual(
      filterCerts(rows, { q: "garden" }).map((r) => r.id),
      ["1"]
    );
  });

  it("finds an OSP code, DBA, or vendor code", () => {
    assert.equal(filterCerts(rows, { q: "7788" })[0]?.id, "2");
    assert.equal(filterCerts(rows, { q: "gsb" })[0]?.id, "1");
    assert.equal(filterCerts(rows, { q: "v-9" })[0]?.id, "1");
  });

  it("requires every search word to match", () => {
    assert.deepEqual(
      filterCerts(rows, { q: "passaic pending" }).map((r) => r.id),
      ["3"]
    );
  });

  it("filters by status and county", () => {
    assert.deepEqual(
      filterCerts(rows, { status: "Not received" }).map((r) => r.id),
      ["2"]
    );
    assert.deepEqual(
      filterCerts(rows, { county: "Passaic" }).map((r) => r.id),
      ["1", "3"]
    );
  });

  it("hides approved certs when showing ones that are not done yet", () => {
    assert.deepEqual(
      filterCerts(rows, { open: true }).map((r) => r.id),
      ["2", "3"]
    );
  });

  it("lists every New Jersey county in the filter, even when none have certs yet", () => {
    const options = certCountyOptions([]);
    assert.equal(options.length, 21);
    assert.deepEqual(options, [...NJ_COUNTIES]);
    assert.ok(options.includes("Passaic"));
    assert.ok(options.includes("Cape May"));
  });

  it("keeps the list A–Z by bus company so an edit does not jump to the top", () => {
    assert.deepEqual(
      sortCerts([rows[2], rows[0], rows[1]]).map((r) => r.contractorName),
      ["Garden State Bus", "Omar Transport", "Wayne Coach"]
    );
  });

  it("uses the contractor county on the cert unless a different terminal county is entered", () => {
    assert.equal(resolveCertCounty("", "Passaic"), "Passaic");
    assert.equal(resolveCertCounty("Bergen", "Passaic"), "Bergen");
    assert.equal(resolveCertCounty("ocean county", null), "Ocean");
  });

  it("moves to the next cert in A–Z order and wraps from the last back to the first", () => {
    const ordered = sortCerts(rows);
    assert.equal(adjacentCerts(ordered, "1").next?.id, "2");
    assert.equal(adjacentCerts(ordered, "3").next?.id, "1");
    assert.equal(adjacentCerts(ordered, "2").prev?.id, "1");
  });
});
