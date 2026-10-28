import assert from "node:assert/strict";
import test from "node:test";
import { alertDaysFromStored, daysInSecondReview, formatSecondReviewDays, needsRationaleLetter, rationaleStillNeeded } from "./flags";

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
