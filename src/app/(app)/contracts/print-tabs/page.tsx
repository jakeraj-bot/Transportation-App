import { BatchContractPicker } from "@/components/batch-contract-picker";
import { EmptyState, PageHeader } from "@/components/ui";
import { getSchoolYear } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { contractTypeLabel } from "@/lib/utils";

export default async function PrintFolderTabsPage() {
  const schoolYear = await getSchoolYear();
  const rows = await prisma.contract.findMany({
    where: { deletedAt: null, schoolYear, folderTabPrintedAt: null },
    include: { district: true, contractor: true, routes: true },
    orderBy: [{ type: "asc" }, { multiContractNumber: "asc" }],
  });
  return (
    <div>
      <PageHeader
        title="Print folder tabs"
        backHref="/contracts"
        hint="These contracts do not have a folder tab printed yet. Click the ones you want, then print them together."
      />
      {rows.length === 0 ? (
        <EmptyState title="All folder tabs are printed" body="Every contract this year already has a folder tab marked as printed." />
      ) : (
        <BatchContractPicker
          mode="tabs"
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
          }))}
        />
      )}
    </div>
  );
}
