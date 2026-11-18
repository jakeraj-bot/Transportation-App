export function contractReviewBlock(
  nextStatus: string,
  checks: { firstReviewDone: boolean; secondReviewDone: boolean },
  currentStatus?: string
) {
  if (currentStatus && nextStatus === currentStatus) return null;
  if (nextStatus === "2nd review" && !checks.firstReviewDone) {
    return "Check 1st review done before you put this contract in 2nd review.";
  }
  if (
    (nextStatus === "Approved" || nextStatus === "Final Approval") &&
    (!checks.firstReviewDone || !checks.secondReviewDone)
  ) {
    return "Check 1st review done and 2nd review done before this contract can be approved.";
  }
  return null;
}
