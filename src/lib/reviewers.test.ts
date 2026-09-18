import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReviewerChoice, reviewerLabel } from "./reviewers";

describe("reviewer names", () => {
  it("prefers a login name, then a typed name", () => {
    assert.equal(reviewerLabel("Jakera Jacobs", "Old list"), "Jakera Jacobs");
    assert.equal(reviewerLabel(null, "Pat Smith"), "Pat Smith");
    assert.equal(reviewerLabel("", ""), "");
  });

  it("uses a typed name even if a dropdown value is also present", () => {
    assert.deepEqual(parseReviewerChoice("user:abc", "Pat Smith"), { userId: null, name: "Pat Smith" });
  });

  it("reads login users and names without a login from the dropdown", () => {
    assert.deepEqual(parseReviewerChoice("user:abc", ""), { userId: "abc", name: null });
    assert.deepEqual(parseReviewerChoice("name:Pat Smith", ""), { userId: null, name: "Pat Smith" });
    assert.deepEqual(parseReviewerChoice("abc", ""), { userId: "abc", name: null });
  });
});
