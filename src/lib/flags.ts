import { daysBetween } from "./utils";

export function needsRationaleLetter(
  receivedDate?: Date | null,
  boardMeetingDate?: Date | null
) {
  if (!receivedDate || !boardMeetingDate) return false;
  return daysBetween(receivedDate, boardMeetingDate) >= 30;
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

export function hoursInSecondReview(startedAt?: Date | null) {
  if (!startedAt) return 0;
  return Math.max(0, (Date.now() - startedAt.getTime()) / (1000 * 60 * 60));
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
