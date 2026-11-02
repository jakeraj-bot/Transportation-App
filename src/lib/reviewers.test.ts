import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReviewerChoice, reviewerLabel, userCanSecondReview } from "./reviewers";

describe("reviewer names", () => {
  it("prefers a login name, then a typed name", () => {
    assert.equal(reviewerLabel("Jakera Jacobs", "Old list"), "Jakera Jacobs");
    assert.equal(reviewerLabel(null, "Pat Smith"), "Pat Smith");
    assert.equal(reviewerLabel("", ""), "");
  });

  it("uses a typed name even if a dropdown value is also present", () => {
    assert.deepEqual(parseReviewerChoice("user:abc", "Pat Smith"), { userId: null, name: "Pat Smith" });
  });

  it("includes the other contract reviewer, not only the person signed in", () => {
    assert.equal(userCanSecondReview({ role: "super_admin", permissionKeys: [] }), true);
    assert.equal(userCanSecondReview({ role: "reviewer", permissionKeys: [] }), true);
    assert.equal(userCanSecondReview({ role: "office_manager", permissionKeys: [] }), true);
    assert.equal(userCanSecondReview({ role: "staff", permissionKeys: ["second_review"] }), true);
    assert.equal(userCanSecondReview({ role: "intake", permissionKeys: [] }), false);
    assert.equal(userCanSecondReview({ role: "route_reviewer", permissionKeys: [] }), false);
  });

  it("reads login users and names without a login from the dropdown", () => {
    assert.deepEqual(parseReviewerChoice("user:abc", ""), { userId: "abc", name: null });
    assert.deepEqual(parseReviewerChoice("name:Pat Smith", ""), { userId: null, name: "Pat Smith" });
    assert.deepEqual(parseReviewerChoice("abc", ""), { userId: "abc", name: null });
  });
});
