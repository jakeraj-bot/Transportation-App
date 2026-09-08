import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterCerts, uniqueCertCounties, type CertListRow } from "./cert-list";

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

  it("lists counties that actually appear", () => {
    assert.deepEqual(uniqueCertCounties(rows), ["Bergen", "Passaic"]);
  });
});
