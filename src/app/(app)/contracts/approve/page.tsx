import { BatchContractPicker } from "@/components/batch-contract-picker";
import { EmptyState, PageHeader } from "@/components/ui";
import { getSchoolYear } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { contractTypeLabel, formatDate, toInputDate } from "@/lib/utils";

const BLOCKED = ["Cancelled", "Final Disapproval"];

export default async function ApproveContractsPage() {
  const schoolYear = await getSchoolYear();
  const rows = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      schoolYear,
      statusName: { notIn: BLOCKED },
    },
    include: { district: true, contractor: true, routes: true, hostDistrict: true },
    orderBy: [{ type: "asc" }, { multiContractNumber: "asc" }],
  });
  return (
    <div>
      <PageHeader
        title="Approve contracts"
        backHref="/contracts"
        hint="Contracts you can put on an approval letter, grouped by type. Joint agreements with the same host, joiner, and date received share a letter; different combinations print separately."
      />
      {rows.length === 0 ? (
        <EmptyState title="Nothing to approve" body="There are no open contracts for this school year." />
      ) : (
        <BatchContractPicker
          mode="approve"
          rows={rows.map((c) => ({
            id: c.id,
            multiContractNumber: c.multiContractNumber,
            districtId: c.districtId,
            districtName: c.district.name,
            contractorName: c.contractor.legalName,
            type: c.type,
            typeLabel: contractTypeLabel(c.type),
            statusName: c.statusName,
            routeSummary: c.routes.map((r) => r.number).join(", "),
            hostDistrictId: c.hostDistrictId,
            hostName: c.hostDistrict?.name,
            joinerDistricts: c.joinerDistricts,
            receivedDate: toInputDate(c.receivedDate),
            receivedDateLabel: formatDate(c.receivedDate),
            schoolYear: c.schoolYear,
          }))}
        />
      )}
    </div>
  );
}
