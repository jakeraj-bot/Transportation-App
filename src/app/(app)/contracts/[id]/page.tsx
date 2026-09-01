import Link from "next/link";
import { notFound } from "next/navigation";
import { markLetterSent, softDelete } from "@/app/actions";
import { ChecklistRow, LabelButton, LetterButtons, Pt4Form, SimpleEmailForm } from "@/components/client-forms";
import { ContractForm } from "@/components/contract-form";
import { Button, Card, Field, Flag, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { activeContractors, activeDistricts, ensureChecklist, getSchoolYear, getSetting, getStatuses } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { hoursInSecondReview, insuranceCoverage } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { contractTypeLabel, debarmentUrl, formatDate } from "@/lib/utils";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const contract = await prisma.contract.findFirst({
    where: { id, deletedAt: null },
    include: {
      district: true,
      contractor: { include: { annualCerts: true } },
      routes: { include: { addenda: { where: { deletedAt: null } } } },
      bidSpec: true,
      routePacket: true,
      hostDistrict: true,
      firstReviewer: true,
      routeLinks: { include: { routeDescription: true } },
    },
  });
  if (!contract) notFound();

  const [schoolYear, districts, contractors, statuses, bidSpecs, routePackets, checklist, cpi, bidThreshold] =
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Status</p>
          <div className="mt-2"><StatusChip name={contract.statusName} /></div>
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

      <Card>
        <h2 className="serif mb-3 text-2xl">Routes</h2>
        <p className="mb-3 text-muted">Click a route to see addendums. Addendums belong to the route, not the multi-contract number.</p>
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
      </Card>

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
        {ins.kind !== "covers" ? (
          <Flag tone={ins.kind === "gap" || ins.kind === "missing" ? "rose" : "amber"}>
            Insurance for {contract.district.name}: {ins.label}
            {ins.gapStart && ins.gapEnd ? ` Need coverage ${formatDate(ins.gapStart)} through ${formatDate(ins.gapEnd)}.` : ""}
            {` Contract runs ${formatDate(contract.startsOn)} – ${formatDate(contract.endsOn)}.`}
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="serif mb-4 text-2xl">Review and decide</h2>
          <p className="mb-3 text-sm text-muted">
            Generating a letter moves the status to Approved or Disapproved while you wait for a signature. After the signed letter is sent, mark the date it went to the district.
          </p>
          <LetterButtons kind="contract" id={contract.id} />
          {["Approved", "Disapproved", "Final Approval", "Final Disapproval"].includes(contract.statusName) ? (
            <form action={markLetterSent} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="id" value={contract.id} />
              <Field label="Date sent to district">
                <input className={inputClass} type="date" name="sentToDistrictAt" defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Button type="submit">Mark signed letter sent</Button>
            </form>
          ) : null}
        </Card>
        <Card>
          <h2 className="serif mb-4 text-2xl">Insurance for this district</h2>
          <p className="mb-3 text-sm text-muted">
            We do not approve insurance. We keep a certificate on the contractor and district so it can cover every contract they have together.
          </p>
          {insurance ? (
            <p className="mb-3">
              Named: {insurance.namedDistrict || "—"} · {formatDate(insurance.startsOn)} – {formatDate(insurance.expiresAt)}{" "}
              {insurance.filePath ? (
                <a className="text-teal" href={`/api/files?path=${encodeURIComponent(insurance.filePath)}`}>Open file</a>
              ) : null}
            </p>
          ) : (
            <p className="mb-3 text-muted">No certificate on file that names {contract.district.name}.</p>
          )}
          <Link className="text-teal" href={`/insurance/new?contractorId=${contract.contractorId}&districtId=${contract.districtId}`}>
            Upload insurance for this district
          </Link>
          {ins.kind !== "covers" && (
            <div className="mt-4">
              <SimpleEmailForm
                districtId={contract.districtId}
                defaultTo={contract.district.email || ""}
                kind="insurance"
                subject={`Updated insurance needed — ${contract.district.name}`}
                body={`Hello,\n\nPlease send an updated certificate of insurance for ${contract.contractor.legalName} that names ${contract.district.name} as an additional insured${ins.gapStart && ins.gapEnd ? ` and covers ${formatDate(ins.gapStart)} through ${formatDate(ins.gapEnd)}` : ""}.\n\nThank you,\nPassaic County Transportation`}
              />
            </div>
          )}
        </Card>
      </div>

      {contract.rationaleNeeded ? (
        <Card>
          <h2 className="serif mb-4 text-2xl">Ask for a rationale letter</h2>
          <SimpleEmailForm
            districtId={contract.districtId}
            defaultTo={contract.district.email || ""}
            kind="rationale"
            subject={`Rationale letter needed — ${contract.multiContractNumber}`}
            body={`Hello,\n\nThis contract was received by the county office 30 or more days after the board meeting that awarded it. Please send a rationale letter so we can continue the review.\n\nMulti-contract: ${contract.multiContractNumber}\nBoard meeting: ${formatDate(contract.boardMeetingDate)}\nDate received: ${formatDate(contract.receivedDate)}\n\nThank you,\nPassaic County Transportation`}
          />
        </Card>
      ) : null}

      <Card>
        <h2 className="serif mb-2 text-2xl">Checklist</h2>
        <p className="mb-4 text-muted">Use this when the review starts. Comment on anything missing — those comments become the PT-4.</p>
        <div className="space-y-3">
          {checklist.map((item) => (
            <ChecklistRow key={item.id} item={item} />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="serif mb-4 text-2xl">Send a PT-4</h2>
        <Pt4Form
          entityType="contract"
          entityId={contract.id}
          defaultTo={contract.district.email || ""}
          districtName={contract.district.name}
        />
      </Card>

      {contract.bidSpec ? (
        <Card>
          <h2 className="serif mb-2 text-2xl">Linked bid spec</h2>
          <p>
            <Link className="text-teal" href={`/bid-specs/${contract.bidSpec.id}`}>{contract.bidSpec.title}</Link>
            {contract.bidSpec.insuranceAmount ? ` · Insurance $${contract.bidSpec.insuranceAmount.toLocaleString()}` : ""}
            {contract.bidSpec.bondType ? ` · Bond ${contract.bidSpec.bondType}` : ""}
          </p>
        </Card>
      ) : null}

      {contract.routePacket ? (
        <Card>
          <h2 className="serif mb-2 text-2xl">Linked route packet</h2>
          <Link className="text-teal" href={`/route-descriptions/${contract.routePacket.id}`}>
            {contract.routePacket.destination || contract.routePacket.title}
          </Link>
        </Card>
      ) : null}

      <Card>
        <h2 className="serif mb-2 text-2xl">Review details</h2>
        <p className="mb-4 text-muted">
          These fields depend on the type of contract. Prior-year cost is only for renewals, host and joiner districts only for joint agreements, route descriptions and bid specs only for originals, and emergency quote packets only for quotes.
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
          linkedRouteIds={contract.routeLinks.map((l) => l.routeDescriptionId)}
          currentUserId={session?.id}
        />
      </Card>
    </div>
  );
}
