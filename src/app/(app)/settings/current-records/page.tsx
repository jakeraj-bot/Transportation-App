import { redirect } from "next/navigation";
import {
  approveImportedContract,
  discardImportedContract,
  importContractors,
  importContractsFromPdf,
  saveCurrentContract,
  savePendingImportContract,
} from "@/app/actions";
import { CollapsibleBlock, CollapsibleSection } from "@/components/collapsible";
import { CurrentContractForm } from "@/components/current-contract-form";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { activeContractors, activeDistricts, getSchoolYear, getStatuses } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { toInputDate } from "@/lib/utils";

export default async function CurrentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    number?: string;
    imported?: string;
    updated?: string;
    certs?: string;
    importedPdf?: string;
    newContractors?: string;
    stubCerts?: string;
    skipped?: string;
    skippedDetail?: string;
    approved?: string;
    discarded?: string;
    error?: string;
  }>;
}) {
  const session = await getSession();
  if (!isSuperAdmin(session?.role)) redirect("/");
  const q = await searchParams;
  const [schoolYear, districts, contractors, statuses, reviewers, pending] = await Promise.all([
    getSchoolYear(),
    activeDistricts(),
    activeContractors(),
    getStatuses("contract"),
    prisma.user.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.contract.findMany({
      where: { deletedAt: null, importStatus: "pending" },
      include: { district: true, contractor: true, routes: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const insurance = pending.length
    ? await prisma.insuranceCertificate.findMany({
        where: {
          deletedAt: null,
          OR: pending.map((row) => ({ contractorId: row.contractorId, districtId: row.districtId })),
        },
        orderBy: { expiresAt: "desc" },
      })
    : [];

  const formLists = {
    schoolYear,
    districts,
    contractors,
    statuses,
    reviewers,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bring in current records"
        backHref="/settings"
        hint="Super Admin only. Use this while we copy contractors and contracts from the current office system. Incoming packets should still use New contract. Click a heading to open it. Tell us when the move is done and we can take this page out."
      />

      {q.error ? (
        <Card className="bg-rose-soft">
          <p className="font-medium text-rose">{q.error}</p>
          {q.skippedDetail ? <p className="mt-1 text-sm">{q.skippedDetail}</p> : null}
          <p className="mt-1 text-sm">You can also copy the tracker rows in Excel and paste them in the box below.</p>
        </Card>
      ) : null}
      {q.saved === "contract" ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">Saved {q.number || "the contract"}.</p>
          <p className="mt-1 text-sm text-muted">The form below is blank so you can enter the next one. It also appears in Contracts.</p>
        </Card>
      ) : null}
      {q.saved === "pending" ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">Updated {q.number || "the imported contract"}.</p>
          <p className="mt-1 text-sm text-muted">It is still on this page until you approve it onto Contracts.</p>
        </Card>
      ) : null}
      {q.approved ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">{q.number || "That contract"} is now on Contracts.</p>
        </Card>
      ) : null}
      {q.discarded ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">Discarded {q.number || "the imported contract"}.</p>
        </Card>
      ) : null}
      {q.importedPdf ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">
            Brought in {q.importedPdf} contract{q.importedPdf === "1" ? "" : "s"} from the PDF.
            {q.newContractors && q.newContractors !== "0"
              ? ` ${q.newContractors} new bus compan${q.newContractors === "1" ? "y was" : "ies were"} added in red.`
              : ""}
            {q.stubCerts && q.stubCerts !== "0"
              ? ` ${q.stubCerts} annual cert${q.stubCerts === "1" ? " was" : "s were"} started so you can add the packet.`
              : ""}
            {q.skipped && q.skipped !== "0" ? ` ${q.skipped} row${q.skipped === "1" ? "" : "s"} could not be matched to a district.` : ""}
          </p>
          {q.skippedDetail ? <p className="mt-1 text-sm">{q.skippedDetail}</p> : null}
          <p className="mt-1 text-sm text-muted">Review them below. They will not appear on Contracts until you approve each one.</p>
        </Card>
      ) : null}
      {q.imported || q.updated || q.certs ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">
            Tracker uploaded: {q.imported || "0"} contractor{(q.imported || "0") === "1" ? "" : "s"} added
            {q.updated ? `, ${q.updated} updated` : ""}
            {q.certs ? `, ${q.certs} annual cert${q.certs === "1" ? "" : "s"}` : ""}.
          </p>
        </Card>
      ) : null}

      <CollapsibleSection
        title="Upload the certification tracker"
        hint={`Excel or CSV. Adds bus companies and their annual certification for ${schoolYear}.`}
      >
        <p className="mb-4 text-muted">
          Matching uses the Office of Student Protection code when it is on the row, otherwise the bus company name.
        </p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-muted">
          <li><strong>Contractor code</strong> — Office of Student Protection code</li>
          <li><strong>Bus Company</strong> — contractor name</li>
          <li><strong>County</strong> — home county for the contractor, and the county this annual cert is for. If the same company appears again with a different county, that is another terminal and another cert</li>
          <li><strong>Date Received</strong> — date we received their annual certification</li>
          <li><strong>Date reviewed</strong> — date we reviewed it</li>
          <li><strong>Compliance Status</strong> — approved, pending, need review, and so on</li>
          <li><strong>Status</strong> — notes: if approved, the date the compliance letter went out; if pending, why it is pending</li>
        </ul>
        <form action={importContractors} className="space-y-4">
          <input type="hidden" name="redirectTo" value="/settings/current-records" />
          <Field label="Tracker file" hint="Excel (.xlsx) or CSV. Macros (.xlsm) are fine too.">
            <input className={inputClass} type="file" name="file" accept=".csv,.xlsx,.xls,.xlsm,.xlsb,text/csv" />
          </Field>
          <Field label="Or paste from Excel" hint="Paste the header row, then each contractor on its own line. You can also upload the Excel file above.">
            <textarea className={inputClass} name="pasted" rows={6} placeholder="Contractor code	Bus Company	County	Date Received	Date reviewed	Compliance Status	Status" />
          </Field>
          <Button type="submit">Upload tracker</Button>
        </form>
        <p className="mt-3 text-sm">
          <a className="text-teal hover:underline" href="/certification-tracker-template.csv">Download a blank CSV with these column names</a>
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        title="Upload a PDF of old contracts"
        hint="The system reads the packets and lists them here for you to check. Nothing goes to Contracts until you approve it."
      >
        <p className="mb-4 text-muted">
          Upload a PDF that lists the old contracts. Each packet should include date received, district, bus company, type, multi-contract number, route number(s), bid number, status, reviewers, date sent to district, and insurance expiration when those are on the page. If a bus company is not in the system yet, it is added in red and an annual cert is started so you know to fill those in.
        </p>
        <form action={importContractsFromPdf} className="space-y-4">
          <Field label="PDF file" hint="A scanned or saved PDF of the old contract list.">
            <input className={inputClass} type="file" name="file" accept="application/pdf,.pdf,.txt,text/plain" />
          </Field>
          <Button type="submit">Bring in contracts from PDF</Button>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        title="Review imported contracts"
        hint={
          pending.length
            ? `${pending.length} waiting for your review. Edit anything the PDF got wrong, then approve it onto Contracts.`
            : "Nothing is waiting. Upload a PDF above and the packets will list here."
        }
        defaultOpen={pending.length > 0}
      >
        {pending.length === 0 ? (
          <p className="text-muted">No imported contracts to review.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((row) => {
              const expires = insurance.find(
                (item) => item.contractorId === row.contractorId && item.districtId === row.districtId
              )?.expiresAt;
              const incomplete = row.contractor.incomplete;
              return (
                <CollapsibleBlock
                  key={row.id}
                  rememberAs={`pending-${row.id}`}
                  danger={incomplete}
                  title={`${row.multiContractNumber} · ${row.district.name} · ${row.contractor.legalName}`}
                  hint={
                    incomplete
                      ? "New contractor — shown in red until you add the company details. An annual cert was started too."
                      : `${row.routes.map((route) => route.number).filter(Boolean).join(", ") || "No routes yet"} · ${row.statusName}`
                  }
                >
                  {incomplete ? (
                    <p className="text-sm text-rose">
                      Open the{" "}
                      <a className="underline" href={`/contractors/${row.contractorId}`}>
                        contractor file
                      </a>{" "}
                      to add OSP code, contact, and the rest. Add the annual certification from Annual certs.
                    </p>
                  ) : null}
                  <CurrentContractForm
                    action={savePendingImportContract}
                    allowNewContractor={false}
                    submitLabel="Save changes"
                    {...formLists}
                    values={{
                      id: row.id,
                      receivedDate: toInputDate(row.receivedDate),
                      schoolYear: row.schoolYear,
                      districtId: row.districtId,
                      contractorId: row.contractorId,
                      type: row.type,
                      multiContractNumber: row.multiContractNumber,
                      routes: row.routes.map((route) => route.number).join("\n"),
                      bidNumber: row.bidNumber ?? "",
                      statusName: row.statusName,
                      firstReviewerId: row.firstReviewerId ?? "",
                      secondReviewerId: row.secondReviewerId ?? "",
                      sentToDistrictAt: toInputDate(row.sentToDistrictAt),
                      insuranceExpiresAt: toInputDate(expires),
                      notes: row.notes ?? "",
                    }}
                    extraActions={
                      <Button type="submit" variant="secondary" formAction={approveImportedContract}>
                        Approve to Contracts
                      </Button>
                    }
                  />
                  <form action={discardImportedContract}>
                    <input type="hidden" name="id" value={row.id} />
                    <button className="text-sm text-rose hover:underline" type="submit">
                      Discard this import
                    </button>
                  </form>
                </CollapsibleBlock>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Enter a current contract"
        hint="For packets already in the current system. This does not change New contract."
      >
        <p className="mb-4 text-muted">
          Upload the tracker first so the bus company list is filled in. After you save, the form clears so you can enter the next one. This path goes straight to Contracts.
        </p>
        <CurrentContractForm
          action={saveCurrentContract}
          allowNewContractor
          submitLabel="Save current contract"
          {...formLists}
        />
      </CollapsibleSection>
    </div>
  );
}
