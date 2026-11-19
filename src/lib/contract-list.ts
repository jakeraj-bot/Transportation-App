export type ContractListFilter = {
  receivedFrom?: string | null;
  receivedTo?: string | null;
  districtId?: string | null;
  contractorId?: string | null;
  type?: string | null;
  status?: string | null;
};

type FilterableContract = {
  receivedDate?: string | null;
  districtId: string;
  contractorIds: string[];
  type: string;
  statusName: string;
};

function day(value?: string | null) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

/** My districts stays on unless this person has no districts, or they chose View all. Filters do not change that. */
export function limitContractsToAssignedDistricts(input: { assignedDistrictIds: string[]; view?: string | null }) {
  return input.assignedDistrictIds.length > 0 && input.view !== "all";
}

/** Keep contracts that match every chosen filter. A blank filter does not narrow the list. */
export function filterContracts<T extends FilterableContract>(rows: T[], filter: ContractListFilter) {
  const from = day(filter.receivedFrom);
  const to = day(filter.receivedTo);
  const districtId = String(filter.districtId ?? "").trim();
  const contractorId = String(filter.contractorId ?? "").trim();
  const type = String(filter.type ?? "").trim();
  const status = String(filter.status ?? "").trim();

  return rows.filter((row) => {
    if (districtId && row.districtId !== districtId) return false;
    if (contractorId && !row.contractorIds.includes(contractorId)) return false;
    if (type && row.type !== type) return false;
    if (status && row.statusName !== status) return false;
    if (from || to) {
      const received = day(row.receivedDate);
      if (!received) return false;
      if (from && received < from) return false;
      if (to && received > to) return false;
    }
    return true;
  });
}
