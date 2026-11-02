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

const DAY_MS = 1000 * 60 * 60 * 24;

export type InsuranceSpan = {
  startsOn?: Date | null;
  expiresAt?: Date | null;
  namedDistrict?: string | null;
};

type CoverageKind = "missing" | "pending" | "mismatch" | "gap" | "covers";

export type InsuranceCoverage = {
  kind: CoverageKind;
  label: string;
  gapStart: Date | null;
  gapEnd: Date | null;
};

/** Calendar day in UTC so a date-only value compares the same way it was entered. */
function utcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function namesMatch(namedDistrict?: string | null, districtName?: string | null) {
  if (!namedDistrict || !districtName) return true;
  const named = namedDistrict.toLowerCase();
  const district = districtName.toLowerCase();
  return named.includes(district) || district.includes(named);
}

function coverage(kind: CoverageKind, label: string, gapStart: Date | null = null, gapEnd: Date | null = null): InsuranceCoverage {
  return { kind, label, gapStart, gapEnd };
}

const MISSING = "No insurance expiration on file";
const PENDING = "Insurance dates are on file. Enter the contract dates during review to check the full run.";
const MISMATCH = "The district name on the certificate may not match this district";
const ENDS_EARLY = "Insurance ends before this contract ends. We need a new certificate for the rest of the run.";
const STARTS_LATE = "Insurance starts after this contract starts.";
const HOLE = "Insurance does not cover the full contract period. We need a certificate for the dates in between.";
const UNCOVERED = "Insurance does not cover this contract period.";

type Interval = { start: number | null; end: number };

function mergeIntervals(intervals: Interval[]) {
  const sorted = [...intervals].sort((a, b) => {
    if (a.start == null && b.start == null) return a.end - b.end;
    if (a.start == null) return -1;
    if (b.start == null) return 1;
    return a.start - b.start || a.end - b.end;
  });
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    const touches = last && (interval.start == null || interval.start <= last.end + DAY_MS);
    if (!last || !touches) {
      merged.push({ start: interval.start, end: interval.end });
      continue;
    }
    last.start = last.start == null || interval.start == null ? null : Math.min(last.start, interval.start);
    last.end = Math.max(last.end, interval.end);
  }
  return merged;
}

function coversLabel(count: number) {
  return count > 1
    ? "The certificates on file cover the full contract period"
    : "This certificate covers the full contract period";
}

function gapLabel(gapStart: number, gapEnd: number, needStart: number | null, needEnd: number | null) {
  const fromStart = needStart == null || gapStart <= needStart;
  const throughEnd = needEnd != null && gapEnd >= needEnd;
  if (fromStart && throughEnd) return UNCOVERED;
  if (throughEnd) return ENDS_EARLY;
  if (fromStart) return STARTS_LATE;
  return HOLE;
}

/**
 * Every certificate for this contractor and district stays on file.
 * Coverage is the dates together: a renewal that starts the day after the current policy ends still covers the contract.
 */
export function certificatesCoverContract(input: {
  certificates: InsuranceSpan[];
  contractStart?: Date | null;
  contractEnd?: Date | null;
  districtName?: string | null;
}): InsuranceCoverage {
  const withEnd = input.certificates.filter((cert) => cert.expiresAt);
  if (!input.contractStart && !input.contractEnd) {
    return withEnd.length ? coverage("pending", PENDING) : coverage("missing", MISSING);
  }
  const usable = withEnd.filter((cert) => namesMatch(cert.namedDistrict, input.districtName));
  if (!usable.length) {
    const mismatched = withEnd.some(
      (cert) => cert.namedDistrict && input.districtName && !namesMatch(cert.namedDistrict, input.districtName)
    );
    return mismatched ? coverage("mismatch", MISMATCH) : coverage("missing", MISSING);
  }

  const merged = mergeIntervals(
    usable.map((cert) => ({
      start: cert.startsOn ? utcDay(cert.startsOn) : null,
      end: utcDay(cert.expiresAt as Date),
    }))
  );
  const needStart = input.contractStart ? utcDay(input.contractStart) : null;
  const needEnd = input.contractEnd ? utcDay(input.contractEnd) : null;
  const covered = () => coverage("covers", coversLabel(usable.length));

  if (needStart == null && needEnd != null) {
    const latest = Math.max(...merged.map((interval) => interval.end));
    if (latest >= needEnd) return covered();
    return coverage("gap", ENDS_EARLY, new Date(latest + DAY_MS), input.contractEnd ?? null);
  }
  if (needEnd == null && needStart != null) {
    const open = merged.some((interval) => interval.start == null || interval.start <= needStart);
    if (open) return covered();
    const earliest = Math.min(...merged.map((interval) => interval.start ?? needStart));
    return coverage("gap", STARTS_LATE, input.contractStart ?? null, new Date(earliest));
  }

  const startBound = needStart as number;
  const endBound = needEnd as number;
  if (merged.length === 1) {
    const interval = merged[0];
    if (interval.end < endBound) {
      return coverage("gap", ENDS_EARLY, new Date(interval.end + DAY_MS), input.contractEnd ?? null);
    }
    if (interval.start != null && interval.start > startBound) {
      return coverage("gap", STARTS_LATE, input.contractStart ?? null, new Date(interval.start));
    }
    return covered();
  }

  let cursor = startBound;
  for (const interval of merged) {
    if (interval.end < cursor) continue;
    const start = interval.start == null ? cursor : interval.start;
    if (start > endBound) break;
    if (start > cursor) {
      const gapEnd = Math.min(start, endBound);
      return coverage(
        "gap",
        gapLabel(cursor, gapEnd, startBound, endBound),
        new Date(cursor),
        gapEnd === endBound ? input.contractEnd ?? new Date(gapEnd) : new Date(gapEnd)
      );
    }
    cursor = Math.max(cursor, interval.end + DAY_MS);
    if (cursor > endBound) return covered();
  }
  if (cursor <= endBound) {
    return coverage("gap", gapLabel(cursor, endBound, startBound, endBound), new Date(cursor), input.contractEnd ?? null);
  }
  return covered();
}

export function insuranceCoverage(input: {
  insStart?: Date | null;
  insEnd?: Date | null;
  contractStart?: Date | null;
  contractEnd?: Date | null;
  namedDistrict?: string | null;
  districtName?: string | null;
}) {
  return certificatesCoverContract({
    certificates: [
      {
        startsOn: input.insStart,
        expiresAt: input.insEnd,
        namedDistrict: input.namedDistrict,
      },
    ],
    contractStart: input.contractStart,
    contractEnd: input.contractEnd,
    districtName: input.districtName,
  });
}

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
