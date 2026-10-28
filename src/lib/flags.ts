import { daysBetween } from "./utils";

export function needsRationaleLetter(
  receivedDate?: Date | null,
  boardMeetingDate?: Date | null
) {
  if (!receivedDate || !boardMeetingDate) return false;
  return daysBetween(receivedDate, boardMeetingDate) >= 30;
}

function sameInstant(left?: Date | null, right?: Date | null) {
  if (!left || !right) return false;
  return left.getTime() === right.getTime();
}

/** A late packet still needs a letter unless someone marked these exact dates OK. */
export function rationaleStillNeeded(contract: {
  receivedDate?: Date | null;
  boardMeetingDate?: Date | null;
  rationaleOk?: boolean;
  rationaleOkReceivedAt?: Date | null;
  rationaleOkBoardAt?: Date | null;
}) {
  if (!needsRationaleLetter(contract.receivedDate, contract.boardMeetingDate)) return false;
  const waived =
    Boolean(contract.rationaleOk) &&
    sameInstant(contract.rationaleOkReceivedAt, contract.receivedDate) &&
    sameInstant(contract.rationaleOkBoardAt, contract.boardMeetingDate);
  return !waived;
}

export function missedNextBoardMeeting(
  quoteApprovedAt?: Date | null,
  boardMeetingDate?: Date | null
) {
  if (!quoteApprovedAt || !boardMeetingDate) return false;
  const days = daysBetween(boardMeetingDate, quoteApprovedAt);
  return days > 45;
}

export function insuranceCoverage(input: {
  insStart?: Date | null;
  insEnd?: Date | null;
  contractStart?: Date | null;
  contractEnd?: Date | null;
  namedDistrict?: string | null;
  districtName?: string | null;
}) {
  const nameMismatch =
    input.namedDistrict &&
    input.districtName &&
    !input.namedDistrict.toLowerCase().includes(input.districtName.toLowerCase()) &&
    !input.districtName.toLowerCase().includes(input.namedDistrict.toLowerCase());

  if (!input.contractStart && !input.contractEnd) {
    if (!input.insEnd) {
      return { kind: "missing" as const, label: "No insurance expiration on file", gapStart: null, gapEnd: null };
    }
    return {
      kind: "pending" as const,
      label: "Insurance dates are on file. Enter the contract dates during review to check the full run.",
      gapStart: null,
      gapEnd: null,
    };
  }
  if (!input.insEnd) {
    return { kind: "missing" as const, label: "No insurance expiration on file", gapStart: null, gapEnd: null };
  }
  if (nameMismatch) {
    return {
      kind: "mismatch" as const,
      label: "The district name on the certificate may not match this district",
      gapStart: null,
      gapEnd: null,
    };
  }
  if (input.contractEnd && input.insEnd < input.contractEnd) {
    const gapStart = new Date(input.insEnd);
    gapStart.setDate(gapStart.getDate() + 1);
    return {
      kind: "gap" as const,
      label: "Insurance ends before this contract ends. We need a new certificate for the rest of the run.",
      gapStart,
      gapEnd: input.contractEnd,
    };
  }
  if (input.contractStart && input.insStart && input.insStart > input.contractStart) {
    return {
      kind: "gap" as const,
      label: "Insurance starts after this contract starts.",
      gapStart: input.contractStart,
      gapEnd: input.insStart,
    };
  }
  return { kind: "covers" as const, label: "This certificate covers the full contract period", gapStart: null, gapEnd: null };
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Whole days a contract has been in 2nd review. The same calendar day is 0. */
export function daysInSecondReview(startedAt?: Date | null, now = Date.now()) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - startedAt.getTime()) / DAY_MS));
}

export function formatSecondReviewDays(startedAt?: Date | null, now = Date.now()) {
  const days = daysInSecondReview(startedAt, now);
  if (days <= 0) return "Less than 1 day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/** Days for the Home alert. Older offices stored this as hours. */
export function alertDaysFromStored(daysRaw?: string | null, hoursRaw?: string | null) {
  const days = Number(daysRaw);
  if (daysRaw != null && daysRaw.trim() !== "" && Number.isFinite(days) && days >= 0) {
    return Math.floor(days);
  }
  const hours = Number(hoursRaw);
  if (Number.isFinite(hours) && hours > 0) return Math.max(1, Math.round(hours / 24));
  return 2;
}

/** @deprecated use insuranceCoverage */
export function insuranceStatus(
  expiresAt?: Date | null,
  namedDistrict?: string | null,
  districtName?: string | null
) {
  const result = insuranceCoverage({
    insEnd: expiresAt,
    namedDistrict,
    districtName,
  });
  if (result.kind === "covers") return { kind: "current" as const, label: result.label };
  if (result.kind === "gap") return { kind: "expired" as const, label: result.label };
  return { kind: result.kind, label: result.label };
}
