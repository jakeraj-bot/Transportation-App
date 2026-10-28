import { unstable_noStore as noStore } from "next/cache";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { ContractList } from "@/components/contract-list";
import { prisma } from "@/lib/prisma";
import { getSchoolYear, getStatuses } from "@/lib/data";
import { can, getSession } from "@/lib/auth";
import { formatSecondReviewDays } from "@/lib/flags";
import { contractTypeLabel, formatDate, toInputDate } from "@/lib/utils";
import { formatCompanyNames } from "@/lib/contract-intake";
import { jointMatchesForContract } from "@/lib/joint-agreements";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string; status?: string; view?: string; reviewer?: string }>;
}) {
  noStore();
  const { flag, status, view, reviewer } = await searchParams;
  const [schoolYear, session, statuses] = await Promise.all([getSchoolYear(), getSession(), getStatuses("contract")]);
  const assigned = session?.districtIds ?? [];
  const secondReviewList = status === "2nd review";
  const showMine = !secondReviewList && Boolean(assigned.length) && view !== "all";
  const reviewerMine = secondReviewList && reviewer === "me";
  const where: Record<string, unknown> = { deletedAt: null, schoolYear };
  if (showMine) where.districtId = { in: assigned };
  if (reviewerMine && session) where.secondReviewerId = session.id;
  if (flag === "late") where.rationaleNeeded = true;
  if (flag === "meeting") where.nextMeetingFlag = true;
  if (status) where.statusName = status;
  const statusColor = Object.fromEntries(statuses.map((row) => [row.name, row.color]));

  const rows = await prisma.contract.findMany({
    where,
    include: {
      district: true,
      contractor: true,
      secondReviewer: true,
      extraContractors: { include: { contractor: true } },
      routes: { include: { addenda: true } },
      hostDistrict: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const jointCandidates = rows
    .filter((row) => row.type === "joint")
    .map((row) => ({
      id: row.id,
      hostName: row.hostDistrict?.name || row.district.name,
      joinerDistricts: row.joinerDistricts,
      routes: row.routes.filter((route) => !route.cancelledAt).map((route) => route.number),
      statusName: row.statusName,
    }));

  return (
    <div>
      <PageHeader
        title="Contracts"
        hint={
          secondReviewList
            ? reviewerMine
              ? `${schoolYear} contracts in 2nd review that are assigned to you.`
              : `Every ${schoolYear} contract in 2nd review, including districts that are not assigned to you. Use Assigned to me to see only yours.`
            : showMine
              ? `Showing ${schoolYear} contracts for your assigned districts. Use View all if a saved contract is missing. Addendums attach to an existing contract instead of creating a new row.`
              : `Every ${schoolYear} packet that comes in for approval. Approve contracts, print folder tabs, or print labels in batches. Addendums attach to an existing contract instead of creating a new row.`
        }
        actions={
          <>
            {secondReviewList ? (
              <>
                <Button href="/contracts?status=2nd%20review" variant={reviewerMine ? "secondary" : "primary"}>All 2nd reviews</Button>
                <Button href="/contracts?status=2nd%20review&reviewer=me" variant={reviewerMine ? "primary" : "secondary"}>Assigned to me</Button>
              </>
            ) : null}
            {!secondReviewList && assigned.length ? (
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
          title={reviewerMine ? "No 2nd reviews assigned to you" : "No contracts in this list"}
          body={reviewerMine ? "Contracts appear here after someone chooses you as the 2nd reviewer." : "Enter a contract when a district packet arrives."}
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
            contractorName: formatCompanyNames([
              c.parentName || c.contractor.legalName,
              ...c.extraContractors.map((link) => link.contractor.legalName),
            ]),
            contractorIncomplete: c.contractor.incomplete,
            type: c.type,
            typeLabel: contractTypeLabel(c.type),
            statusName: c.statusName,
            statusColor: statusColor[c.statusName],
            rationaleNeeded: c.rationaleNeeded,
            nextMeetingFlag: c.nextMeetingFlag,
            secondReviewWait: c.statusName === "2nd review" ? formatSecondReviewDays(c.secondReviewStartedAt) : undefined,
            secondReviewerName: c.secondReviewer
              ? c.secondReviewer.id === session?.id
                ? `${c.secondReviewer.name} (you)`
                : c.secondReviewer.name
              : undefined,
            hostDistrictId: c.hostDistrictId,
            hostName: c.hostDistrict?.name,
            joinerDistricts: c.joinerDistricts,
            receivedDate: toInputDate(c.receivedDate),
            receivedDateLabel: formatDate(c.receivedDate),
            schoolYear: c.schoolYear,
            jointNote: (() => {
              const matches = jointMatchesForContract(
                {
                  type: c.type,
                  routes: c.routes.filter((route) => !route.cancelledAt).map((route) => route.number),
                },
                jointCandidates
              );
              if (!matches.length) return "";
              const routeList = [...new Set(matches.flatMap((match) => match.matchedRoutes))].join(", ");
              return matches.length === 1
                ? `Joint agreement for routes ${routeList}`
                : `${matches.length} joint agreements for routes ${routeList}`;
            })(),
            routes: c.routes.map((r) => ({
              id: r.id,
              number: r.number,
              hasAddendum: r.addenda.length > 0,
              cancelled: Boolean(r.cancelledAt),
            })),
          }))}
        />
      )}
    </div>
  );
}
