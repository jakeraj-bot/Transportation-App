import assert from "node:assert/strict";
import test from "node:test";
import {
  insurancePolicyKind,
  parentalInsuranceMeetsRequirement,
  parentalInsuranceMessage,
  parentalInsuranceTotal,
  umbrellaSuffix,
} from "./parental-insurance";

test("regular insurance and umbrella add together", () => {
  assert.equal(parentalInsuranceTotal(1_000_000, 500_000), 1_500_000);
  assert.equal(parentalInsuranceTotal(null, null), null);
  assert.equal(parentalInsuranceTotal(1_000_000, null), 1_000_000);
});

test("a parental contract meets the requirement at $1,500,000", () => {
  assert.equal(parentalInsuranceMeetsRequirement(1_000_000, 500_000), true);
  assert.equal(parentalInsuranceMeetsRequirement(1_500_000, 0), true);
  assert.equal(parentalInsuranceMeetsRequirement(1_000_000, 400_000), false);
  assert.equal(parentalInsuranceMeetsRequirement(null, null), false);
});

test("the message names the shortfall until the two policies reach $1,500,000", () => {
  assert.match(parentalInsuranceMessage(null, null), /do not post a bond/);
  assert.match(parentalInsuranceMessage(1_000_000, 500_000), /Together: \$1,500,000\.00/);
  assert.match(parentalInsuranceMessage(1_000_000, 400_000), /Parents need \$1,500,000/);
});

test("a certificate is umbrella only when that policy is chosen", () => {
  assert.equal(insurancePolicyKind("umbrella"), "umbrella");
  assert.equal(insurancePolicyKind("regular"), "regular");
  assert.equal(insurancePolicyKind(""), "regular");
  assert.equal(umbrellaSuffix("umbrella"), " · Umbrella");
  assert.equal(umbrellaSuffix("regular"), "");
});
