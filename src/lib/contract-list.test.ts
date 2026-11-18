import assert from "node:assert/strict";
import test from "node:test";
import { filterContracts } from "./contract-list";

const rows = [
  {
    id: "wayne-quote",
    receivedDate: "2026-08-10",
    districtId: "wayne",
    contractorIds: ["first"],
    type: "quote",
    statusName: "2nd review",
  },
  {
    id: "paterson-renewal",
    receivedDate: "2026-09-02",
    districtId: "paterson",
    contractorIds: ["garden", "first"],
    type: "renewal",
    statusName: "Need Review",
  },
  {
    id: "clifton-parent",
    receivedDate: "",
    districtId: "clifton",
    contractorIds: ["parent"],
    type: "parental",
    statusName: "Approved",
  },
];

test("a blank filter keeps every contract", () => {
  assert.deepEqual(
    filterContracts(rows, {}).map((row) => row.id),
    ["wayne-quote", "paterson-renewal", "clifton-parent"]
  );
});

test("filters combine the received dates, district, contractor, type, and status", () => {
  const matched = filterContracts(rows, {
    receivedFrom: "2026-08-01",
    receivedTo: "2026-08-31",
    districtId: "wayne",
    contractorId: "first",
    type: "quote",
    status: "2nd review",
  });
  assert.deepEqual(matched.map((row) => row.id), ["wayne-quote"]);
});

test("a contractor on an extra company still matches", () => {
  const matched = filterContracts(rows, { contractorId: "first" });
  assert.deepEqual(matched.map((row) => row.id), ["wayne-quote", "paterson-renewal"]);
});

test("a received-date filter skips contracts with no date", () => {
  const matched = filterContracts(rows, { receivedFrom: "2026-08-10", receivedTo: "2026-09-02" });
  assert.deepEqual(matched.map((row) => row.id), ["wayne-quote", "paterson-renewal"]);
});

test("one received date matches that day", () => {
  const matched = filterContracts(rows, { receivedFrom: "2026-09-02", receivedTo: "2026-09-02" });
  assert.deepEqual(matched.map((row) => row.id), ["paterson-renewal"]);
});
