export type ChecklistDefinition = {
  entityType: string;
  contractType?: string;
  name: string;
  items: string[];
};

export const CHECKLISTS: ChecklistDefinition[] = [
  {
    entityType: "contract",
    contractType: "original",
    name: "Original / bid contract",
    items: [],
  },
  {
    entityType: "contract",
    contractType: "renewal",
    name: "Renewal contract",
    items: [
      "Original was competitively bid",
      "Increase does not exceed CPI (unless bid-allowed aide, route change, or safety)",
      "School destination is the same as the original",
    ],
  },
  {
    entityType: "contract",
    contractType: "quote",
    name: "Quoted / emergency contract",
    items: [
      "Evidence of three quotes",
      "Emergency quote approved and linked",
      "Board acted at the next meeting after the quote",
    ],
  },
  {
    entityType: "contract",
    contractType: "parental",
    name: "Parental contract",
    items: [
      "Parent automobile insurance",
      "Umbrella insurance",
      "Copy of a valid driver's license",
      "Copy of current vehicle registration",
    ],
  },
  {
    entityType: "contract",
    contractType: "addendum",
    name: "Contract addendum",
    items: [
      "Commissioner addendum form",
      "Additional performance bond if the cost increased",
      "Adjustment follows the original bid (per mile / per student / per vehicle)",
    ],
  },
  {
    entityType: "contract",
    contractType: "joint",
    name: "Joint transportation agreement",
    items: [
      "Commissioner joint agreement form",
      "Host district certified minutes",
      "Joiner district certified minutes",
      "Host insurance or host contract on file",
    ],
  },
  {
    entityType: "cert",
    name: "Annual certification",
    items: [
      "Annual certification transmittal with contractor / vendor code",
      "Packet received by August 15",
      "Driver and aide packets complete (kept in paper file)",
      "Contractor is not debarred",
    ],
  },
  {
    entityType: "bid_spec",
    name: "Bid specification review",
    items: [
      "Submitted before advertisement",
      "Insurance limits are stated",
      "Bond type and amount are stated",
      "Route descriptions are included",
      "Adjustment / increase-decrease clause is included",
      "Business registration certificate is required",
    ],
  },
  {
    entityType: "route_description",
    name: "Route description review",
    items: [
      "Each route has a number (ROUTE NO.)",
      "Destination is stated",
      "Hours / start and end time are stated",
      "THE STARTING DATE OF THIS ROUTE IS is filled in",
      "Stops and schedule are described",
      "Vehicle capacity is stated where required",
    ],
  },
  {
    entityType: "emergency_quote",
    name: "Emergency quote review",
    items: [
      "Service was unanticipated",
      "Three quotes were sought",
      "Quoted on a per diem basis",
      "Amount compared to the bid threshold",
    ],
  },
];

export function checklistDefinition(entityType: string, contractType?: string | null) {
  if (contractType) {
    const typed = CHECKLISTS.find((list) => list.entityType === entityType && list.contractType === contractType);
    if (typed) return typed;
  }
  return CHECKLISTS.find((list) => list.entityType === entityType && !list.contractType);
}
