export const RETIRED_CONTRACT_CHECKLIST_ITEMS = [
  "PT-1 form",
  "Bid specifications",
  "Approved route description on file and linked",
  "Certified board minutes (contractor, routes, and costs)",
  "Certified board minutes",
  "Certified board minutes authorizing the adjustment",
  "Summary of all bids received",
  "Newspaper bid advertisement",
  "Insurance certificate naming this district",
  "Consent of surety",
  "Bidder's guarantee",
  "Performance bond with multi-contract or route numbers",
  "Performance bond",
  "Performance bond (if required)",
  "Affirmative action material",
  "Stockholder / ownership disclosure",
  "Non-collusion statement",
  "Bid sheet of successful bidder",
  "Business registration certificate",
  "Investment activities in Iran disclosure",
  "If not lowest bidder: board attorney statement",
];

const BOTH_REVIEW_STATUSES = new Set([
  "Approved",
  "Final Approval",
  "Disapproved",
  "Final Disapproval",
  "Trenton Log",
]);

export function reviewChecksForStatus(statusName: string) {
  if (BOTH_REVIEW_STATUSES.has(statusName)) return { first: true, second: true };
  if (statusName === "2nd review") return { first: true, second: false };
  return { first: false, second: false };
}
