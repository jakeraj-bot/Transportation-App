import assert from "node:assert/strict";
import test from "node:test";
import { needsRationaleLetter, rationaleStillNeeded } from "./flags";

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

function days(later: Date, earlier: Date) {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}
