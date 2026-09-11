import Link from "next/link";
import { notFound } from "next/navigation";
import { softDelete } from "@/app/actions";
import { CertForm } from "@/components/cert-form";
import { CertReviewNav } from "@/components/cert-review-nav";
import { ChecklistRow, LetterButtons } from "@/components/client-forms";
import { CollapsibleSection } from "@/components/collapsible";
import { Button, PageHeader, StatusChip } from "@/components/ui";
import { adjacentCerts, sortCerts, type CertListRow } from "@/lib/cert-list";
import { activeContractors, ensureChecklist, getStatuses } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDate, toInputDate } from "@/lib/utils";

export default async function CertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cert = await prisma.annualCert.findFirst({
    where: { id, deletedAt: null },
    include: { contractor: true },
  });
  if (!cert) notFound();
  const [contractors, statuses, checklist, yearCerts] = await Promise.all([
    activeContractors(),
    getStatuses("cert"),
    ensureChecklist("cert", cert.id),
    prisma.annualCert.findMany({
      where: { deletedAt: null, schoolYear: cert.schoolYear },
      include: { contractor: true },
      orderBy: [{ contractor: { legalName: "asc" } }, { county: "asc" }],
    }),
  ]);
  async function remove() {
    "use server";
    await softDelete("cert", id, "/certs");
  }
  const contractor = cert.contractor;
  const certCounty = cert.county || contractor.county;
  const contractorHint = [
    contractor.ospCode || contractor.vendorCode || "no code",
    certCounty ? `${certCounty} County` : null,
    contractor.contactName,
  ]
    .filter(Boolean)
    .join(" · ");
  const checked = checklist.filter((item) => item.checked).length;
  const yearRows: CertListRow[] = sortCerts(
    yearCerts.map((row) => ({
      id: row.id,
      statusName: row.statusName,
      notes: row.notes,
      receivedDateLabel: formatDate(row.receivedDate),
      contractorName: row.contractor.legalName,
      dba: row.contractor.dba,
      ospCode: row.contractor.ospCode,
      vendorCode: row.contractor.vendorCode,
      county: row.county || row.contractor.county,
    }))
  );
  const { next } = adjacentCerts(yearRows, cert.id);
  return (
    <div className="space-y-4">
      <PageHeader
        title={`${contractor.legalName} · ${cert.schoolYear}`}
        backHref="/certs"
        hint="Click a heading to open it. Click it again to close it. PT-4s are only used on contracts."
        actions={
          <form action={remove}>
            <button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">
              Remove
            </button>
          </form>
        }
      />
      <CertReviewNav currentId={cert.id} rows={yearRows} />
      <CollapsibleSection title="Contractor" hint={contractorHint} defaultOpen>
        <div className="mb-5 rounded-xl bg-cream px-4 py-3 text-sm">
          <p className="font-medium">{contractor.legalName}</p>
          {contractor.dba ? <p className="text-muted">DBA {contractor.dba}</p> : null}
          <p className="mt-1 text-muted">
            Vendor {contractor.vendorCode || "not on file"} · OSP {contractor.ospCode || "not on file"}
            {contractor.county ? ` · based in ${contractor.county} County` : ""}
          </p>
          {certCounty ? (
            <p className="text-muted">
              This certification is for {certCounty} County
              {contractor.county && certCounty !== contractor.county ? " (another terminal)" : ""}.
            </p>
          ) : null}
          {contractor.contactName || contractor.email || contractor.phone ? (
            <p className="text-muted">
              {[contractor.contactName, contractor.email, contractor.phone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="mt-2">
            <Link className="text-teal" href={`/contractors/${contractor.id}`}>
              Open the contractor file
            </Link>
            {" · "}
            <Link className="text-teal" href={`/certs/new?contractorId=${contractor.id}`}>
              Add a cert for another county
            </Link>
          </p>
        </div>
        <CertForm
          contractors={contractors.map((c) => ({ id: c.id, legalName: c.legalName, county: c.county }))}
          statuses={statuses}
          cert={{
            id: cert.id,
            contractorId: cert.contractorId,
            schoolYear: cert.schoolYear,
            county: certCounty,
            statusName: cert.statusName,
            notes: cert.notes,
            receivedDate: toInputDate(cert.receivedDate),
            reviewedDate: toInputDate(cert.reviewedDate),
          }}
        />
      </CollapsibleSection>
      <CollapsibleSection
        title="Letters"
        hint={`${cert.statusName}${cert.letterDate ? ` · letter ${formatDate(cert.letterDate)}` : ""}`}
      >
        <p className="mb-4">
          <StatusChip name={cert.statusName} />
        </p>
        <LetterButtons kind="cert" id={cert.id} />
      </CollapsibleSection>
      <CollapsibleSection title="Checklist" hint={`${checked} of ${checklist.length} checked`}>
        <p className="mb-3 text-sm text-muted">
          If this cert is Approved, every box is checked. That means the packet was already accepted.
        </p>
        <div className="space-y-3">
          {checklist.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              commentPlaceholder="If something is missing or wrong, write it here."
            />
          ))}
        </div>
      </CollapsibleSection>
      {next ? (
        <div className="flex justify-end">
          <Button href={`/certs/${next.id}`}>Next: {next.contractorName}</Button>
        </div>
      ) : null}
    </div>
  );
}
