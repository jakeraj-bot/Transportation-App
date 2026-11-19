import assert from "node:assert/strict";
import test from "node:test";
import { CHECKLISTS } from "./checklists";
import { RETIRED_CONTRACT_CHECKLIST_ITEMS, reviewChecksForStatus } from "./review-defaults";

test("finished and logged contracts get both review boxes", () => {
  for (const status of ["Approved", "Final Approval", "Disapproved", "Final Disapproval", "Trenton Log"]) {
    assert.deepEqual(reviewChecksForStatus(status), { first: true, second: true });
  }
});

test("2nd review gets the first box only", () => {
  assert.deepEqual(reviewChecksForStatus("2nd review"), { first: true, second: false });
});

test("a contract still missing items does not get the review boxes", () => {
  assert.deepEqual(reviewChecksForStatus("1st review missing items"), { first: false, second: false });
  assert.deepEqual(reviewChecksForStatus("Need Review"), { first: false, second: false });
});

test("the packet document boxes are gone from every contract checklist", () => {
  const contractItems = CHECKLISTS.filter((list) => list.entityType === "contract").flatMap((list) => list.items);
  for (const label of RETIRED_CONTRACT_CHECKLIST_ITEMS) {
    assert.equal(contractItems.includes(label), false, label);
  }
});
