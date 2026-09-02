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
import { Button, Card, Field, Flag, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { activeContractors, activeDistricts, ensureChecklist, getSchoolYear, getSetting, getStatuses } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { outlookConfigured } from "@/lib/email";
import { hoursInSecondReview, insuranceCoverage } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { checklistDefinition } from "@/lib/checklists";
import { sameLetterGroup } from "@/lib/letter-groups";
import { contractTypeLabel, debarmentUrl, formatDate } from "@/lib/utils";

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ addendumLinked?: string; addendumCount?: string; routeCount?: string }>;
}) {
  const { id } = await params;
  const linked = await searchParams;
  const session = await getSession();
  const contract = await prisma.contract.findFirst({
    where: { id, deletedAt: null },
    include: {
      district: true,
      contractor: { include: { annualCerts: true } },
      routes: { include: { addenda: { where: { deletedAt: null } } } },
      extraPackets: { orderBy: { sortOrder: "asc" } },
      comments: { include: { user: true }, orderBy: { createdAt: "desc" } },
      bidSpec: true,
      routePacket: true,
      hostDistrict: true,
      firstReviewer: true,
      routeLinks: { include: { routeDescription: true } },
    },
  });
  if (!contract) notFound();

  const [schoolYear, districts, contractors, statuses, bidSpecs, routePackets, checklist, cpi, bidThreshold, sameTypeContracts] =
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
    ]);

  const cert = contract.contractor.annualCerts.find((c) => c.schoolYear === contract.schoolYear && !c.deletedAt);
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
  const addendumTotal = contract.routes.reduce((sum, route) => sum + route.addenda.length, 0);
  const superAdmin = isSuperAdmin(session?.role);
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
        title={contract.multiContractNumber}
        backHref="/contracts"
        hint={`${contract.district.name} · ${contract.contractor.legalName} · ${contractTypeLabel(contract.type)}`}
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
          <div className="mt-2"><StatusChip name={contract.statusName} color={statuses.find((s) => s.name === contract.statusName)?.color} /></div>
          {contract.statusName === "2nd review" ? (
            <p className="mt-2 text-sm text-muted">
              Waiting {Math.max(1, Math.round(secondHours))} hours
              {contract.firstReviewer ? ` · first review by ${contract.firstReviewer.name}` : ""}
            </p>
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

      <div className="space-y-3">
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

      <CollapsibleSection
        title="Comments"
        hint={
          contract.comments.length
            ? `${contract.comments.length} comment${contract.comments.length === 1 ? "" : "s"} · only Super Admin can delete`
            : "Review notes from anyone on this contract"
        }
      >
        <div className="space-y-3">
          {contract.comments.length === 0 ? <p className="text-muted">No comments yet.</p> : null}
          {contract.comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-line px-4 py-3">
              <p className="text-sm text-muted">
                {comment.user.name} · {formatDate(comment.createdAt)} {comment.createdAt.toLocaleTimeString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
              {superAdmin ? (
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

      <CollapsibleSection
        title="Routes"
        hint={
          contract.routes.length
            ? `${contract.routes.length} route${contract.routes.length === 1 ? "" : "s"}${addendumTotal ? ` · ${addendumTotal} addendum${addendumTotal === 1 ? "" : "s"}` : ""}`
            : "Add route numbers when the packet is entered or reviewed"
        }
      >
        <p className="mb-3 text-muted">Click a route to see addendums. Addendums belong to the route, not the multi-contract number.</p>
        {contract.extraPackets.length ? (
          <div className="mb-4 rounded-xl bg-cream px-4 py-3">
            <p className="font-medium">Additional multi-contract numbers on this renewal</p>
            <ul className="mt-2 space-y-1 text-sm">
              {contract.extraPackets.map((packet) => (
                <li key={packet.id}>
                  {packet.multiContractNumber} · route {packet.routeNumber}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {contract.routes.length === 0 ? (
          <p className="text-muted">No route numbers yet. Add them when you review or when the packet is entered.</p>
        ) : (
          <div className="space-y-2">
            {contract.routes.map((route) => (
              <Link
                key={route.id}
                href={`/contracts/${contract.id}/routes/${route.id}`}
                className="flex items-center justify-between rounded-xl border border-line px-4 py-3 hover:bg-teal-soft/40"
              >
                <span className="font-medium">{route.number}</span>
                <span className="text-sm text-muted">
                  {route.addenda.length
                    ? `${route.addenda.length} addendum${route.addenda.length === 1 ? "" : "s"}`
                    : "No addendum"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Review process" hint={`${checklistDef?.name ?? "Review details"}, then the checklist, then review and decide`}>
        <div className="space-y-8">
          <div>
            <h3 className="serif mb-2 text-xl">Review details</h3>
            <p className="mb-4 text-muted">
              Every contract asks for status, start and end dates, board meeting date, contract total cost, bond amount, bond type, and insurance amount. Extra questions follow this type of packet.
            </p>
            <ContractForm
              mode="review"
              schoolYear={schoolYear}
              districts={districts}
              contractors={contractors}
              statuses={statuses}
              bidSpecs={bidSpecs}
              routePackets={routePackets}
              contract={contract}
              routes={contract.routes}
              extraPackets={contract.extraPackets}
              linkedRouteIds={contract.routeLinks.map((l) => l.routeDescriptionId)}
              currentUserId={session?.id}
            />
          </div>
          {contract.bidSpec ? (
            <div>
              <h3 className="serif mb-2 text-xl">Linked bid spec</h3>
              <p>
                <Link className="text-teal" href={`/bid-specs/${contract.bidSpec.id}`}>{contract.bidSpec.title}</Link>
                {contract.bidSpec.insuranceAmount ? ` · Insurance $${contract.bidSpec.insuranceAmount.toLocaleString()}` : ""}
                {contract.bidSpec.bondType ? ` · Bond ${contract.bidSpec.bondType}` : ""}
              </p>
            </div>
          ) : null}
          {contract.routePacket ? (
            <div>
              <h3 className="serif mb-2 text-xl">Linked route packet</h3>
              <Link className="text-teal" href={`/route-descriptions/${contract.routePacket.id}`}>
                {contract.routePacket.destination || contract.routePacket.title}
              </Link>
            </div>
          ) : null}
          {contract.rationaleNeeded ? (
            <div>
              <h3 className="serif mb-2 text-xl">Ask for a rationale letter</h3>
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
            <h3 className="serif mb-2 text-xl">{checklistDef?.name ?? "Checklist"}</h3>
            <p className="mb-4 text-muted">
              Only the items this type of contract needs. Comment on anything missing — those comments become the PT-4.
            </p>
            <div className="space-y-3">
              {checklist.length === 0 ? <p className="text-muted">No checklist items for this type.</p> : null}
              {checklist.map((item) => (
                <ChecklistRow key={item.id} item={item} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="serif mb-2 text-xl">Review and decide</h3>
            <p className="mb-3 text-sm text-muted">
              Generating a letter moves the status to Approved or Disapproved while you wait for a signature. After the signed letter is sent, mark the date it went to the district. Uploading the signed letter is optional.
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
                <a className="text-teal" href={`/api/files?path=${encodeURIComponent(contract.signedApprovalLetterPath)}`}>
                  Open signed letter
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Send PT-4" hint="Create the PT-4, then copy the email into your work Outlook">
        <Pt4Form
          entityType="contract"
          entityId={contract.id}
          defaultTo={contract.district.email || ""}
          districtName={contract.district.name}
          canSend={outlookConfigured()}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Insurance for this district" hint={insurance ? `${formatDate(insurance.startsOn)} – ${formatDate(insurance.expiresAt)}` : "No certificate on file yet"}>
        <p className="mb-3 text-sm text-muted">
          We do not approve insurance. Keep the policy dates so we can tell when it expires. Uploading the file is optional.
        </p>
        {insurance ? (
          <p className="mb-3">
            Named: {insurance.namedDistrict || "—"} · {formatDate(insurance.startsOn)} – {formatDate(insurance.expiresAt)}{" "}
            {insurance.filePath ? (
              <a className="text-teal" href={`/api/files?path=${encodeURIComponent(insurance.filePath)}`}>Open file</a>
            ) : (
              <span className="text-muted">(no file uploaded)</span>
            )}
          </p>
        ) : (
          <p className="mb-3 text-muted">No certificate on file that names {contract.district.name}.</p>
        )}
        <Link className="text-teal" href={`/insurance/new?contractorId=${contract.contractorId}&districtId=${contract.districtId}`}>
          Add insurance dates for this district
        </Link>
        {ins.kind !== "covers" && ins.kind !== "pending" && (
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
        )}
      </CollapsibleSection>
    </div>
  );
}
