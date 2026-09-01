import Link from "next/link";
import { Button, Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getSchoolYear } from "@/lib/data";
import { getSession } from "@/lib/auth";
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
        hint="Every packet that comes in for approval."
        actions={
          <>
            {assigned.length ? (
              <Button href={showMine ? "/contracts?view=all" : "/contracts"} variant="secondary">
                {showMine ? "View all" : "My districts"}
              </Button>
            ) : null}
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
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Multi-contract</th>
                <th className="px-5 py-3 font-medium">District</th>
                <th className="px-5 py-3 font-medium">Contractor</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Routes</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line/70">
                  <td className="px-5 py-3">
                    <Link className="text-teal hover:underline" href={`/contracts/${c.id}`}>
                      {c.multiContractNumber}
                    </Link>
                    {c.rationaleNeeded ? <div className="text-xs text-rose">Needs rationale letter</div> : null}
                    {c.nextMeetingFlag ? <div className="text-xs text-amber">Next-meeting flag</div> : null}
                    {c.statusName === "2nd review" ? (
                      <div className="text-xs text-muted">
                        In 2nd review {Math.max(1, Math.round(hoursInSecondReview(c.secondReviewStartedAt)))}h
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3">{c.district.name}</td>
                  <td className="px-5 py-3">{c.contractor.legalName}</td>
                  <td className="px-5 py-3">{contractTypeLabel(c.type)}</td>
                  <td className="px-5 py-3">
                    {c.routes.map((r) => (
                      <span key={r.id}>
                        <Link className="text-teal hover:underline" href={`/contracts/${c.id}/routes/${r.id}`}>
                          {r.number}
                        </Link>
                        {r.addenda.length ? " · addendum" : ""}
                        {c.routes.at(-1)?.id !== r.id ? ", " : ""}
                      </span>
                    )) || "—"}
                  </td>
                  <td className="px-5 py-3"><StatusChip name={c.statusName} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
