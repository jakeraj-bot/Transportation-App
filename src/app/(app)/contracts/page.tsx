import { Button, EmptyState, PageHeader } from "@/components/ui";
import { ContractList } from "@/components/contract-list";
import { prisma } from "@/lib/prisma";
import { getSchoolYear } from "@/lib/data";
import { can, getSession } from "@/lib/auth";
import { hoursInSecondReview } from "@/lib/flags";
import { contractTypeLabel } from "@/lib/utils";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string; status?: string; view?: string }>;
}) {
  const { flag, status, view } = await searchParams;
  const [schoolYear, session] = await Promise.all([getSchoolYear(), getSession()]);
  const assigned = session?.districtIds ?? [];
  const showMine = Boolean(assigned.length) && view !== "all";
  const where: Record<string, unknown> = { deletedAt: null, schoolYear };
  if (showMine) where.districtId = { in: assigned };
  if (flag === "late") where.rationaleNeeded = true;
  if (flag === "meeting") where.nextMeetingFlag = true;
  if (status) where.statusName = status;

  const rows = await prisma.contract.findMany({
    where,
    include: { district: true, contractor: true, routes: { include: { addenda: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Contracts"
        hint="Every packet that comes in for approval. Approve contracts, print folder tabs, or print labels in batches."
        actions={
          <>
            {assigned.length ? (
              <Button href={showMine ? "/contracts?view=all" : "/contracts"} variant="secondary">
                {showMine ? "View all" : "My districts"}
              </Button>
            ) : null}
            <Button href="/contracts/approve" variant="secondary">Approve contracts</Button>
            <Button href="/contracts/print-tabs" variant="secondary">Print folder tabs</Button>
            <Button href="/contracts/print-labels" variant="secondary">Print labels</Button>
            <Button href="/contracts/new">New contract</Button>
          </>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No contracts in this list"
          body="Enter a contract when a district packet arrives."
          action={<Button href="/contracts/new">New contract</Button>}
        />
      ) : (
        <ContractList
          canApprove={can(session, "approve")}
          rows={rows.map((c) => ({
            id: c.id,
            multiContractNumber: c.multiContractNumber,
            districtId: c.districtId,
            districtName: c.district.name,
            contractorName: c.contractor.legalName,
            contractorIncomplete: c.contractor.incomplete,
            type: c.type,
            typeLabel: contractTypeLabel(c.type),
            statusName: c.statusName,
            rationaleNeeded: c.rationaleNeeded,
            nextMeetingFlag: c.nextMeetingFlag,
            secondReviewHours: c.statusName === "2nd review" ? hoursInSecondReview(c.secondReviewStartedAt) : undefined,
            routes: c.routes.map((r) => ({
              id: r.id,
              number: r.number,
              hasAddendum: r.addenda.length > 0,
            })),
          }))}
        />
      )}
    </div>
  );
}
