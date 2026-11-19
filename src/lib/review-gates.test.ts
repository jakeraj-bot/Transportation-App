import assert from "node:assert/strict";
import test from "node:test";
import { contractReviewBlock } from "./review-gates";

const open = { firstReviewDone: false, secondReviewDone: false };
const firstOnly = { firstReviewDone: true, secondReviewDone: false };
const both = { firstReviewDone: true, secondReviewDone: true };

test("2nd review waits for the first review checkbox", () => {
  assert.match(contractReviewBlock("2nd review", open, "Need Review") ?? "", /1st review done/);
  assert.equal(contractReviewBlock("2nd review", firstOnly, "Need Review"), null);
});

test("approval waits for both review checkboxes", () => {
  assert.match(contractReviewBlock("Approved", firstOnly, "2nd review") ?? "", /2nd review done/);
  assert.match(contractReviewBlock("Final Approval", open, "Need Review") ?? "", /1st review done/);
  assert.equal(contractReviewBlock("Approved", both, "2nd review"), null);
  assert.equal(contractReviewBlock("Final Approval", both, "Approved"), null);
});

test("saving the same status does not ask for the checkboxes again", () => {
  assert.equal(contractReviewBlock("2nd review", open, "2nd review"), null);
  assert.equal(contractReviewBlock("Approved", open, "Approved"), null);
});

test("other statuses stay open", () => {
  assert.equal(contractReviewBlock("Disapproved", open, "Need Review"), null);
  assert.equal(contractReviewBlock("1st review missing items", open, "Need Review"), null);
});
