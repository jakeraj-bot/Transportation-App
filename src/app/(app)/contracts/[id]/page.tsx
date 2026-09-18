import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addContractComment,
  deleteContractComment,
  markLetterSent,
  saveSignedApprovalLetter,
  softDelete,
} from "@/app/actions";
import { ChecklistRow, LabelButton, LetterButtons, Pt4Form, SimpleEmailForm } from "@/components/client-forms";
import { CollapsibleSection } from "@/components/collapsible";
import { ContractForm } from "@/components/contract-form";
import { ContractSnapshot } from "@/components/contract-snapshot";
import { ContractRoutesPanel } from "@/components/contract-routes-panel";
import { Button, Card, Field, Flag, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { activeContractors, activeDistricts, ensureChecklist, getSchoolYear, getSetting, getStatuses } from "@/lib/data";
import { can, getSession } from "@/lib/auth";
import { outlookConfigured } from "@/lib/email";
import { hoursInSecondReview, insuranceCoverage } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { checklistDefinition } from "@/lib/checklists";
import { sameLetterGroup } from "@/lib/letter-groups";
import { contractTypeLabel, debarmentUrl, formatDate } from "@/lib/utils";
import { formatCompanyNames } from "@/lib/contract-intake";
import { reviewerLabel } from "@/lib/reviewers";

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    addendumLinked?: string;
    addendumCount?: string;
    routeCount?: string;
    routesAdded?: string;
    routeCancelled?: string;
    routeRestored?: string;
  }>;
}) {
  const { id } = await params;
  const linked = await searchParams;
  const session = await getSession();
  const canEdit = can(session, "create") || can(session, "edit");
  const contract = await prisma.contract.findFirst({
    where: { id, deletedAt: null },
    include: {
      district: true,
      contractor: { include: { annualCerts: true } },
      routes: { include: { addenda: { where: { deletedAt: null } } } },
      extraPackets: { orderBy: { sortOrder: "asc" } },
      extraContractors: { include: { contractor: true }, orderBy: { sortOrder: "asc" } },
      comments: { include: { user: true }, orderBy: { createdAt: "desc" } },
      bidSpec: true,
      routePacket: true,
      hostDistrict: true,
      firstReviewer: true,
      secondReviewer: true,
      routeLinks: { include: { routeDescription: true } },
    },
  });
  if (!contract) notFound();

  const firstReviewerLabel = reviewerLabel(contract.firstReviewer?.name, contract.firstReviewerName);
  const secondReviewerLabel = reviewerLabel(contract.secondReviewer?.name, contract.secondReviewerName);

  const [schoolYear, districts, contractors, statuses, bidSpecs, routePackets, checklist, cpi, bidThreshold, sameTypeContracts, latestPt4] =
    await Promise.all([
      getSchoolYear(),
      activeDistricts(),
      activeContractors(),
      getStatuses("contract"),
      prisma.bidSpec.findMany({ where: { deletedAt: null } }),
      prisma.routeDescription.findMany({ where: { deletedAt: null } }),
      ensureChecklist("contract", contract.id, contract.type),
      getSetting("cpi", "2.50"),
      getSetting("bidThreshold", "7500"),
      prisma.contract.findMany({
        where:
          contract.type === "joint"
            ? {
                id: { not: contract.id },
                type: "joint",
                schoolYear: contract.schoolYear,
                deletedAt: null,
              }
            : {
                id: { not: contract.id },
                districtId: contract.districtId,
                type: contract.type,
                schoolYear: contract.schoolYear,
                deletedAt: null,
              },
        include: { contractor: true, hostDistrict: true },
        orderBy: { multiContractNumber: "asc" },
      }),
      prisma.letter.findFirst({
        where: { entityType: "contract", entityId: contract.id, kind: "pt4" },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  const existingPt4Url = latestPt4
    ? `/api/files?path=${encodeURIComponent(latestPt4.filePath)}`
    : undefined;

  const cert =
    contract.contractor.annualCerts.find(
      (c) => c.schoolYear === contract.schoolYear && !c.deletedAt && (c.county === "Passaic" || !c.county)
    ) ??
    contract.contractor.annualCerts.find((c) => c.schoolYear === contract.schoolYear && !c.deletedAt);
  const insurance = await prisma.insuranceCertificate.findFirst({
    where: {
      contractorId: contract.contractorId,
      districtId: contract.districtId,
      deletedAt: null,
    },
    orderBy: { expiresAt: "desc" },
  });
  const ins = insuranceCoverage({
    insStart: insurance?.startsOn,
    insEnd: insurance?.expiresAt,
    contractStart: contract.startsOn,
    contractEnd: contract.endsOn,
    namedDistrict: insurance?.namedDistrict,
    districtName: contract.district.name,
  });
  const cpiMax =
    contract.priorYearCost != null
      ? contract.priorYearCost * (1 + Number(cpi) / 100)
      : null;
  const secondHours = hoursInSecondReview(contract.secondReviewStartedAt);
  const sortedRoutes = [...contract.routes].sort((a, b) => {
    if (a.cancelledAt && !b.cancelledAt) return 1;
    if (!a.cancelledAt && b.cancelledAt) return -1;
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });
  const activeRouteCount = sortedRoutes.filter((route) => !route.cancelledAt).length;
  const addendumTotal = contract.routes.reduce((sum, route) => sum + route.addenda.length, 0);
  const companyNames = formatCompanyNames([
    contract.parentName || contract.contractor.legalName,
    ...contract.extraContractors.map((link) => link.contractor.legalName),
  ]);
  const statusColor = statuses.find((s) => s.name === contract.statusName)?.color;
  const snapshotRoutes = sortedRoutes.map((route) => ({
    id: route.id,
    number: route.number,
    cancelledAt: route.cancelledAt,
    addenda: route.addenda.map((addendum) => ({ id: addendum.id, reason: addendum.reason })),
  }));
  const routePanelRoutes = sortedRoutes.map((route) => ({
    id: route.id,
    number: route.number,
    cancelledAt: route.cancelledAt,
    cancelNote: route.cancelNote,
    addendaCount: route.addenda.length,
  }));
  const insuranceHint = insurance
    ? `${formatDate(insurance.startsOn)} – ${formatDate(insurance.expiresAt)}`
    : "No certificate on file yet";
  const superAdmin = isSuperAdmin(session?.role);
  const defaultIntakeNote = "Entered from the current-system list.";
  const displayComments = [
    ...contract.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      userName: comment.user.name,
      createdAt: comment.createdAt,
      canDelete: superAdmin,
    })),
    ...(contract.notes?.trim() &&
    contract.notes !== defaultIntakeNote &&
    !contract.comments.some((comment) => comment.body.trim() === contract.notes!.trim())
      ? [
          {
            id: "intake-notes",
            body: contract.notes,
            userName: "Intake notes",
            createdAt: contract.createdAt,
            canDelete: false,
          },
        ]
      : []),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const checklistDef = checklistDefinition("contract", contract.type);
  const currentLetterGroup = {
    type: contract.type,
    districtId: contract.districtId,
    schoolYear: contract.schoolYear,
    hostDistrictId: contract.hostDistrictId,
    joinerDistricts: contract.joinerDistricts,
    receivedDate: contract.receivedDate,
  };

  async function remove() {
    "use server";
    await softDelete("contract", id, "/contracts");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract"
        backHref="/contracts"
        actions={
          <>
            <LabelButton contractId={contract.id} />
            <form action={remove}><button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">Remove</button></form>
          </>
        }
      />

      {linked.addendumLinked ? (
        <Flag tone="sage">
          New addendum linked to this route. This contract now has {linked.addendumCount || addendumTotal} addendum
          {(linked.addendumCount || String(addendumTotal)) === "1" ? "" : "s"}
          {linked.routeCount ? ` on ${linked.routeCount} matching route${linked.routeCount === "1" ? "" : "s"}` : ""}.
        </Flag>
      ) : null}
      {contract.contractor.incomplete ? (
        <Flag tone="rose">
          {contract.contractor.legalName} was added by name only. Fill in the rest on the{" "}
          <Link className="underline" href={`/contractors/${contract.contractorId}`}>contractor tab</Link> so it is no longer highlighted in red.
        </Flag>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Status</p>
          <div className="mt-2"><StatusChip name={contract.statusName} color={statusColor} /></div>
          {contract.statusName === "2nd review" ? (
            <p className="mt-2 text-sm text-muted">
              Waiting {Math.max(1, Math.round(secondHours))} hours
              {firstReviewerLabel ? ` · first review by ${firstReviewerLabel}` : ""}
              {secondReviewerLabel ? ` · second review by ${secondReviewerLabel}` : ""}
            </p>
          ) : (
            <>
              {firstReviewerLabel ? (
                <p className="mt-2 text-sm text-muted">1st reviewer: {firstReviewerLabel}</p>
              ) : null}
              {secondReviewerLabel ? (
                <p className="mt-2 text-sm text-muted">2nd reviewer: {secondReviewerLabel}</p>
              ) : null}
            </>
          )}
          {contract.bidNumber ? (
            <p className="mt-2 text-sm text-muted">Bid number {contract.bidNumber}</p>
          ) : null}
          {contract.sentToDistrictAt ? (
            <p className="mt-2 text-sm text-muted">Letter sent {formatDate(contract.sentToDistrictAt)}</p>
          ) : null}
        </Card>
        <Card>
          <p className="text-sm text-muted">Annual certification</p>
          <p className="mt-2 font-medium">{cert?.statusName ?? "No cert record this year"}</p>
          {cert ? <Link className="text-sm text-teal" href={`/certs/${cert.id}`}>Open cert</Link> : <Link className="text-sm text-teal" href="/certs/new">Add cert</Link>}
        </Card>
        <Card>
          <p className="text-sm text-muted">Vendor / OSP</p>
          <p className="mt-2 font-medium">{contract.contractor.vendorCode || "Vendor not on file"}</p>
          <p className="text-sm text-muted">OSP {contract.contractor.ospCode || "not on file"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Business registration</p>
          <p className="mt-2 font-medium">{contract.contractor.brcStatus}</p>
          <Link className="text-sm text-teal" href={`/contractors/${contract.contractorId}`}>Open BRC search from contractor</Link>
        </Card>
      </div>

      <ContractSnapshot
        contractId={contract.id}
        contract={contract}
        companyNames={companyNames}
        routes={snapshotRoutes}
      />

      <div className="space-y-2">
        {contract.contractor.debarred ? (
          <Flag tone="rose">This contractor is flagged as debarred. Check the <a className="underline" href={debarmentUrl()} target="_blank">NJDOE debarment list</a> before approving.</Flag>
        ) : (
          <Flag tone="teal">Not flagged as debarred. Still confirm on the <a className="underline" href={debarmentUrl()} target="_blank">state list</a> if you are unsure.</Flag>
        )}
        {contract.rationaleNeeded ? (
          <Flag tone="rose">
            Received {formatDate(contract.receivedDate)}, which is 30 or more days after the {formatDate(contract.boardMeetingDate)} board meeting. Ask the district for a rationale letter.
          </Flag>
        ) : null}
        {ins.kind === "pending" ? (
          <Flag tone="amber">{ins.label}</Flag>
        ) : ins.kind !== "covers" ? (
          <Flag tone={ins.kind === "gap" || ins.kind === "missing" ? "rose" : "amber"}>
            Insurance for {contract.district.name}: {ins.label}
            {ins.gapStart && ins.gapEnd ? ` Need coverage ${formatDate(ins.gapStart)} through ${formatDate(ins.gapEnd)}.` : ""}
            {contract.startsOn && contract.endsOn ? ` Contract runs ${formatDate(contract.startsOn)} – ${formatDate(contract.endsOn)}.` : ""}
          </Flag>
        ) : (
          <Flag tone="sage">
            Insurance for {contract.district.name} covers this contract
            {insurance?.startsOn || insurance?.expiresAt
              ? ` (${formatDate(insurance?.startsOn)} – ${formatDate(insurance?.expiresAt)})`
              : ""}.
          </Flag>
        )}
        {cpiMax != null && contract.cost != null && contract.cost > cpiMax + 0.01 && contract.type === "renewal" ? (
          <Flag tone="amber">Renewal cost ${contract.cost.toLocaleString()} is above this year’s CPI cap of ${cpiMax.toFixed(2)} ({cpi}%). Confirm a bid-allowed exception.</Flag>
        ) : null}
        {contract.type === "quote" && contract.cost != null && contract.cost > Number(bidThreshold) ? (
          <Flag tone="amber">Quote amount is over the ${Number(bidThreshold).toLocaleString()} bid threshold. Quotes over the threshold can only run until they would exceed it.</Flag>
        ) : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <CollapsibleSection
            compact
            title="Review process"
            hint={`${checklistDef?.name ?? "Checklist"}, review and decide${contract.rationaleNeeded ? ", rationale letter" : ""}`}
          >
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-medium">{checklistDef?.name ?? "Checklist"}</h3>
                <p className="mb-3 text-sm text-muted">
                  Only the items this type of contract needs. Comment on anything missing — those comments become the PT-4.
                </p>
                <div className="space-y-3">
                  {checklist.length === 0 ? <p className="text-muted">No checklist items for this type.</p> : null}
                  {checklist.map((item) => (
                    <ChecklistRow key={item.id} item={item} />
                  ))}
                </div>
              </div>

              {contract.bidSpec ? (
                <div>
                  <h3 className="mb-1 font-medium">Linked bid spec</h3>
                  <p className="text-sm">
                    <Link className="text-teal hover:underline" href={`/bid-specs/${contract.bidSpec.id}`}>{contract.bidSpec.title}</Link>
                    {contract.bidSpec.insuranceAmount ? ` · Insurance $${contract.bidSpec.insuranceAmount.toLocaleString()}` : ""}
                    {contract.bidSpec.bondType ? ` · Bond ${contract.bidSpec.bondType}` : ""}
                  </p>
                </div>
              ) : null}

              {contract.routePacket ? (
                <div>
                  <h3 className="mb-1 font-medium">Linked route packet</h3>
                  <Link className="text-sm text-teal hover:underline" href={`/route-descriptions/${contract.routePacket.id}`}>
                    {contract.routePacket.destination || contract.routePacket.title}
                  </Link>
                </div>
              ) : null}

              {contract.rationaleNeeded ? (
                <div>
                  <h3 className="mb-2 font-medium">Ask for a rationale letter</h3>
                  <SimpleEmailForm
                    districtId={contract.districtId}
                    defaultTo={contract.district.email || ""}
                    kind="rationale"
                    subject={`Rationale letter needed — ${contract.multiContractNumber}`}
                    body={`Hello,\n\nThis contract was received by the county office 30 or more days after the board meeting that awarded it. Please send a rationale letter so we can continue the review.\n\nMulti-contract: ${contract.multiContractNumber}\nBoard meeting: ${formatDate(contract.boardMeetingDate)}\nDate received: ${formatDate(contract.receivedDate)}\n\nThank you,\nPassaic County Transportation`}
                    canSend={outlookConfigured()}
                  />
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 font-medium">Review and decide</h3>
                <p className="mb-3 text-sm text-muted">
                  Generating a letter moves the status to Approved or Disapproved while you wait for a signature. After the signed letter is sent, mark the date it went to the district.
                </p>
                <LetterButtons
                  kind="contract"
                  id={contract.id}
                  contractTypeLabel={contractTypeLabel(contract.type)}
                  contractType={contract.type}
                  letterGroup={currentLetterGroup}
                  sameTypeContracts={sameTypeContracts.map((row) => ({
                    id: row.id,
                    multiContractNumber: row.multiContractNumber,
                    contractorName: row.contractor.legalName,
                    hostName: row.hostDistrict?.name,
                    joinerDistricts: row.joinerDistricts,
                    receivedDateLabel: formatDate(row.receivedDate),
                    letterGroup: {
                      type: row.type,
                      districtId: row.districtId,
                      schoolYear: row.schoolYear,
                      hostDistrictId: row.hostDistrictId,
                      joinerDistricts: row.joinerDistricts,
                      receivedDate: row.receivedDate,
                    },
                    sameLetterGroup: sameLetterGroup(currentLetterGroup, {
                      type: row.type,
                      districtId: row.districtId,
                      schoolYear: row.schoolYear,
                      hostDistrictId: row.hostDistrictId,
                      joinerDistricts: row.joinerDistricts,
                      receivedDate: row.receivedDate,
                    }),
                  }))}
                />
                {["Approved", "Disapproved", "Final Approval", "Final Disapproval"].includes(contract.statusName) ? (
                  <form action={markLetterSent} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <input type="hidden" name="id" value={contract.id} />
                    <Field label="Date sent to district">
                      <input className={inputClass} type="date" name="sentToDistrictAt" defaultValue={new Date().toISOString().slice(0, 10)} />
                    </Field>
                    <Button type="submit">Mark signed letter sent</Button>
                  </form>
                ) : null}
                <form action={saveSignedApprovalLetter} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <input type="hidden" name="id" value={contract.id} />
                  <Field
                    label="Signed approval letter (optional)"
                    hint={contract.signedApprovalLetterPath ? "A signed letter is already on file. Upload another to replace it." : "You do not have to upload this."}
                  >
                    <input className={inputClass} type="file" name="file" />
                  </Field>
                  <Button type="submit" variant="secondary">Save signed letter</Button>
                </form>
                {contract.signedApprovalLetterPath ? (
                  <p className="mt-2 text-sm">
                    <a className="text-teal hover:underline" href={`/api/files?path=${encodeURIComponent(contract.signedApprovalLetterPath)}`}>
                      Open signed letter
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            compact
            title="Send PT-4"
            hint={existingPt4Url ? "PT-4 on file · create a new one or copy the email into Outlook" : "Create the PT-4, then copy the email into your work Outlook"}
          >
            <Pt4Form
              entityType="contract"
              entityId={contract.id}
              defaultTo={contract.district.email || ""}
              districtName={contract.district.name}
              canSend={outlookConfigured()}
              existingPt4Url={existingPt4Url}
            />
          </CollapsibleSection>
        </div>

        <div className="space-y-3">
          <CollapsibleSection
            compact
            title="Comments"
            hint={
              displayComments.length
                ? `${displayComments.length} comment${displayComments.length === 1 ? "" : "s"}`
                : "Review notes from anyone on this contract"
            }
          >
            <div className="space-y-3">
              {displayComments.length === 0 ? <p className="text-muted">No comments yet.</p> : null}
              {displayComments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-line px-4 py-3">
                  <p className="text-sm text-muted">
                    {comment.userName} · {formatDate(comment.createdAt)} {comment.createdAt.toLocaleTimeString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                  {comment.canDelete ? (
                    <form action={deleteContractComment} className="mt-2">
                      <input type="hidden" name="id" value={comment.id} />
                      <button className="text-sm text-rose" type="submit">Delete comment</button>
                    </form>
                  ) : null}
                </div>
              ))}
              <form action={addContractComment} className="space-y-3">
                <input type="hidden" name="contractId" value={contract.id} />
                <Field label="Add a comment">
                  <textarea className={inputClass} name="body" rows={3} required />
                </Field>
                <Button type="submit">Save comment</Button>
              </form>
            </div>
          </CollapsibleSection>

          <CollapsibleSection compact title="Insurance" hint={insuranceHint}>
            <p className="mb-3 text-sm text-muted">
              We do not approve insurance. Keep the policy dates so we can tell when it expires. Uploading the file is optional.
            </p>
            {insurance ? (
              <p className="mb-3 text-sm">
                Named: {insurance.namedDistrict || "—"} · {formatDate(insurance.startsOn)} – {formatDate(insurance.expiresAt)}{" "}
                {insurance.filePath ? (
                  <a className="text-teal hover:underline" href={`/api/files?path=${encodeURIComponent(insurance.filePath)}`}>Open file</a>
                ) : (
                  <span className="text-muted">(no file uploaded)</span>
                )}
              </p>
            ) : (
              <p className="mb-3 text-sm text-muted">No certificate on file that names {contract.district.name}.</p>
            )}
            <Link className="text-sm text-teal hover:underline" href={`/insurance/new?contractorId=${contract.contractorId}&districtId=${contract.districtId}`}>
              Add insurance dates
            </Link>
            {ins.kind !== "covers" && ins.kind !== "pending" ? (
              <div className="mt-4">
                <SimpleEmailForm
                  districtId={contract.districtId}
                  defaultTo={contract.district.email || ""}
                  kind="insurance"
                  subject={`Updated insurance needed — ${contract.district.name}`}
                  body={`Hello,\n\nPlease send an updated certificate of insurance for ${contract.contractor.legalName} that names ${contract.district.name} as an additional insured${ins.gapStart && ins.gapEnd ? ` and covers ${formatDate(ins.gapStart)} through ${formatDate(ins.gapEnd)}` : ""}.\n\nThank you,\nPassaic County Transportation`}
                  canSend={outlookConfigured()}
                />
              </div>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            compact
            title="Edit contract"
            hint="District, bus company, status, dates, costs, bonds, and other review fields"
          >
            {canEdit ? (
              <ContractForm
                mode="review"
                schoolYear={schoolYear}
                districts={districts}
                contractors={contractors}
                statuses={statuses}
                bidSpecs={bidSpecs}
                routePackets={routePackets}
                contract={contract}
                routes={sortedRoutes}
                extraPackets={contract.extraPackets}
                additionalContractorIds={contract.extraContractors.map((link) => link.contractorId)}
                linkedRouteIds={contract.routeLinks.map((l) => l.routeDescriptionId)}
                currentUserId={session?.id}
              />
            ) : (
              <p className="text-muted">You can view this contract. Super Admin can give you permission to edit records.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            compact
            title="Edit routes"
            hint={
              contract.routes.length
                ? `${activeRouteCount} active${contract.routes.length !== activeRouteCount ? ` · ${contract.routes.length - activeRouteCount} cancelled` : ""}${addendumTotal ? ` · ${addendumTotal} addendum${addendumTotal === 1 ? "" : "s"}` : ""}`
                : "Add route numbers or cancel one route"
            }
          >
            <ContractRoutesPanel
              contractId={contract.id}
              routes={routePanelRoutes}
              extraPackets={contract.extraPackets}
              canEdit={canEdit}
              saved={{
                added: linked.routesAdded === "1",
                cancelled: linked.routeCancelled,
                restored: linked.routeRestored,
              }}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
