import Link from "next/link";
import { StatusChip } from "@/components/ui";
import { contractTypeLabel, formatCurrency, formatDate } from "@/lib/utils";

function SnapshotField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium break-words">{value || "—"}</p>
    </div>
  );
}

export function ContractSnapshot({
  contract,
  companyNames,
  routeLabels,
  statusColor,
  firstReviewerLabel,
  secondReviewerLabel,
}: {
  contract: {
    id: string;
    multiContractNumber: string;
    schoolYear: string;
    type: string;
    statusName: string;
    district: { id: string; name: string };
    contractorId: string;
    parentName: string | null;
    hostDistrict: { name: string } | null;
    joinerDistricts: string | null;
    receivedDate: Date | null;
    boardMeetingDate: Date | null;
    startsOn: Date | null;
    endsOn: Date | null;
    cost: number | null;
    priorYearCost: number | null;
    bondAmount: number | null;
    bondType: string;
    insuranceAmount: number | null;
    bidNumber: string | null;
    renewalNumber: string | null;
    sentToDistrictAt: Date | null;
    notes: string | null;
  };
  companyNames: string;
  routeLabels: string;
  statusColor?: string;
  firstReviewerLabel: string;
  secondReviewerLabel: string;
}) {
  const districtLabel =
    contract.type === "joint" && contract.hostDistrict
      ? `${contract.hostDistrict.name}${contract.joinerDistricts ? ` · Joiners ${contract.joinerDistricts}` : ""}`
      : contract.district.name;

  return (
    <div className="rounded-2xl bg-card px-5 py-4 shadow-[0_1px_0_rgba(44,58,71,0.04),0_12px_32px_rgba(44,58,71,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Packet on file</p>
          <p className="serif mt-1 text-2xl">{contract.multiContractNumber}</p>
        </div>
        <StatusChip name={contract.statusName} color={statusColor} />
      </div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <SnapshotField
          label="District"
          value={
            <Link className="text-teal hover:underline" href={`/districts/${contract.district.id}`}>
              {districtLabel}
            </Link>
          }
        />
        <SnapshotField label="Type" value={contractTypeLabel(contract.type)} />
        <SnapshotField label="School year" value={contract.schoolYear} />
        <SnapshotField
          label={contract.parentName ? "Parent" : "Bus company"}
          value={
            contract.parentName ? (
              contract.parentName
            ) : (
              <Link className="text-teal hover:underline" href={`/contractors/${contract.contractorId}`}>
                {companyNames}
              </Link>
            )
          }
        />
        <SnapshotField label="Routes" value={routeLabels || "None yet"} />
        <SnapshotField label="Date received" value={formatDate(contract.receivedDate)} />
        <SnapshotField label="Board meeting" value={formatDate(contract.boardMeetingDate)} />
        <SnapshotField
          label="Contract dates"
          value={
            contract.startsOn || contract.endsOn
              ? `${formatDate(contract.startsOn)} – ${formatDate(contract.endsOn)}`
              : ""
          }
        />
        <SnapshotField
          label="Contract cost"
          value={contract.cost != null ? `$${formatCurrency(contract.cost)}` : ""}
        />
        {contract.type === "renewal" ? (
          <SnapshotField
            label="Prior-year cost"
            value={contract.priorYearCost != null ? `$${formatCurrency(contract.priorYearCost)}` : ""}
          />
        ) : null}
        <SnapshotField
          label="Bond"
          value={
            contract.bondAmount != null || contract.bondType !== "none"
              ? `${contract.bondType !== "none" ? contract.bondType : "None"}${contract.bondAmount != null ? ` · $${formatCurrency(contract.bondAmount)}` : ""}`
              : ""
          }
        />
        <SnapshotField
          label="Insurance amount"
          value={contract.insuranceAmount != null ? `$${formatCurrency(contract.insuranceAmount)}` : ""}
        />
        {contract.bidNumber ? <SnapshotField label="Bid number" value={contract.bidNumber} /> : null}
        {contract.renewalNumber ? <SnapshotField label="Renewal number" value={contract.renewalNumber} /> : null}
        {firstReviewerLabel ? <SnapshotField label="1st reviewer" value={firstReviewerLabel} /> : null}
        {secondReviewerLabel ? <SnapshotField label="2nd reviewer" value={secondReviewerLabel} /> : null}
        {contract.sentToDistrictAt ? (
          <SnapshotField label="Letter sent" value={formatDate(contract.sentToDistrictAt)} />
        ) : null}
      </div>
      {contract.notes ? (
        <p className="mt-4 border-t border-line pt-3 text-sm text-muted whitespace-pre-wrap">{contract.notes}</p>
      ) : null}
    </div>
  );
}
