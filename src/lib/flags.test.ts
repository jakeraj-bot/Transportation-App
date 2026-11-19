import assert from "node:assert/strict";
import test from "node:test";
import {
  alertDaysFromStored,
  certificatesCoverContract,
  daysInSecondReview,
  formatSecondReviewDays,
  needsRationaleLetter,
  rationaleStillNeeded,
} from "./flags";

const board = new Date("2026-08-18T00:00:00.000Z");
const received = new Date("2026-09-17T00:00:00.000Z");

test("a packet 30 days after the board meeting needs a rationale letter", () => {
  assert.equal(needsRationaleLetter(received, board), true);
  assert.equal(days(received, board), 30);
  assert.equal(
    rationaleStillNeeded({
      receivedDate: received,
      boardMeetingDate: board,
      rationaleOk: false,
    }),
    true
  );
});

test("marking those exact dates OK clears the flag for this contract only", () => {
  assert.equal(
    rationaleStillNeeded({
      receivedDate: received,
      boardMeetingDate: board,
      rationaleOk: true,
      rationaleOkReceivedAt: received,
      rationaleOkBoardAt: board,
    }),
    false
  );
});

test("a later received date brings the flag back", () => {
  const later = new Date("2026-09-20T00:00:00.000Z");
  assert.equal(
    rationaleStillNeeded({
      receivedDate: later,
      boardMeetingDate: board,
      rationaleOk: true,
      rationaleOkReceivedAt: received,
      rationaleOkBoardAt: board,
    }),
    true
  );
});

test("29 days does not ask for a rationale letter", () => {
  const earlier = new Date("2026-09-16T00:00:00.000Z");
  assert.equal(needsRationaleLetter(earlier, board), false);
  assert.equal(
    rationaleStillNeeded({
      receivedDate: earlier,
      boardMeetingDate: board,
    }),
    false
  );
});

test("2nd review waiting time is counted in days", () => {
  const started = new Date("2026-10-26T15:00:00.000Z");
  const sameAfternoon = new Date("2026-10-26T20:00:00.000Z").getTime();
  const nextDay = new Date("2026-10-27T16:00:00.000Z").getTime();
  const twoDays = new Date("2026-10-28T16:00:00.000Z").getTime();
  assert.equal(daysInSecondReview(started, sameAfternoon), 0);
  assert.equal(formatSecondReviewDays(started, sameAfternoon), "Less than 1 day");
  assert.equal(daysInSecondReview(started, nextDay), 1);
  assert.equal(formatSecondReviewDays(started, nextDay), "1 day");
  assert.equal(formatSecondReviewDays(started, twoDays), "2 days");
  assert.equal(alertDaysFromStored("", "48"), 2);
  assert.equal(alertDaysFromStored("3", "48"), 3);
});

function days(later: Date, earlier: Date) {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

const contractStart = new Date("2026-09-01T00:00:00.000Z");
const contractEnd = new Date("2027-06-30T00:00:00.000Z");
const currentCert = {
  startsOn: new Date("2026-07-01T00:00:00.000Z"),
  expiresAt: new Date("2027-03-03T00:00:00.000Z"),
  namedDistrict: "Wayne Township",
};
const updatedCert = {
  startsOn: new Date("2027-03-04T00:00:00.000Z"),
  expiresAt: new Date("2027-07-01T00:00:00.000Z"),
  namedDistrict: "Wayne Township",
};

test("the current certificate stays in the check when an updated one is added", () => {
  const updatedOnly = certificatesCoverContract({
    certificates: [updatedCert],
    contractStart,
    contractEnd,
    districtName: "Wayne",
  });
  assert.equal(updatedOnly.kind, "gap");
  assert.equal(updatedOnly.label, "Insurance starts after this contract starts.");

  const both = certificatesCoverContract({
    certificates: [currentCert, updatedCert],
    contractStart,
    contractEnd,
    districtName: "Wayne",
  });
  assert.equal(both.kind, "covers");
  assert.equal(both.gapStart, null);
  assert.equal(both.gapEnd, null);
});

test("a current certificate that ends early still asks for the rest of the run", () => {
  const result = certificatesCoverContract({
    certificates: [currentCert],
    contractStart,
    contractEnd,
    districtName: "Wayne",
  });
  assert.equal(result.kind, "gap");
  assert.equal(result.gapStart?.toISOString().slice(0, 10), "2027-03-04");
  assert.equal(result.gapEnd?.toISOString().slice(0, 10), "2027-06-30");
  assert.match(result.label, /ends before this contract ends/);
});

test("a hole between two certificates is still a gap", () => {
  const result = certificatesCoverContract({
    certificates: [
      currentCert,
      { ...updatedCert, startsOn: new Date("2027-03-05T00:00:00.000Z") },
    ],
    contractStart,
    contractEnd,
    districtName: "Wayne",
  });
  assert.equal(result.kind, "gap");
  assert.equal(result.gapStart?.toISOString().slice(0, 10), "2027-03-04");
  assert.equal(result.gapEnd?.toISOString().slice(0, 10), "2027-03-05");
  assert.match(result.label, /dates in between/);
});

test("a certificate for another district does not fill the gap", () => {
  const result = certificatesCoverContract({
    certificates: [currentCert, { ...updatedCert, namedDistrict: "Clifton" }],
    contractStart,
    contractEnd,
    districtName: "Wayne",
  });
  assert.equal(result.kind, "gap");
  assert.match(result.label, /ends before/);
});

test("a certificate that names the wrong district is a mismatch", () => {
  const result = certificatesCoverContract({
    certificates: [
      {
        startsOn: contractStart,
        expiresAt: new Date("2027-07-01T00:00:00.000Z"),
        namedDistrict: "Clifton",
      },
    ],
    contractStart,
    contractEnd,
    districtName: "Wayne",
  });
  assert.equal(result.kind, "mismatch");
});
