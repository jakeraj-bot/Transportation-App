import Link from "next/link";
import { notFound } from "next/navigation";
import { saveCert, softDelete } from "@/app/actions";
import { ChecklistRow, LetterButtons } from "@/components/client-forms";
import { CollapsibleSection } from "@/components/collapsible";
import { Button, Field, PageHeader, StatusChip, inputClass } from "@/components/ui";
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
  const [contractors, statuses, checklist] = await Promise.all([
    activeContractors(),
    getStatuses("cert"),
    ensureChecklist("cert", cert.id),
  ]);
  async function remove() {
    "use server";
    await softDelete("cert", id, "/certs");
  }
  const contractor = cert.contractor;
  const contractorHint = [
    contractor.ospCode || contractor.vendorCode || "no code",
    contractor.county ? `${contractor.county} County` : null,
    contractor.contactName,
  ]
    .filter(Boolean)
    .join(" · ");
  const checked = checklist.filter((item) => item.checked).length;
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
      <CollapsibleSection title="Contractor" hint={contractorHint} defaultOpen>
        <div className="mb-5 rounded-xl bg-cream px-4 py-3 text-sm">
          <p className="font-medium">{contractor.legalName}</p>
          {contractor.dba ? <p className="text-muted">DBA {contractor.dba}</p> : null}
          <p className="mt-1 text-muted">
            Vendor {contractor.vendorCode || "not on file"} · OSP {contractor.ospCode || "not on file"}
            {contractor.county ? ` · ${contractor.county} County` : ""}
          </p>
          {contractor.contactName || contractor.email || contractor.phone ? (
            <p className="text-muted">
              {[contractor.contactName, contractor.email, contractor.phone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="mt-2">
            <Link className="text-teal" href={`/contractors/${contractor.id}`}>
              Open the contractor file
            </Link>
          </p>
        </div>
        <form action={saveCert} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={cert.id} />
          <Field label="Contractor">
            <select className={inputClass} name="contractorId" defaultValue={cert.contractorId}>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="School year">
            <input className={inputClass} name="schoolYear" defaultValue={cert.schoolYear} />
          </Field>
          <Field label="Status">
            <select className={inputClass} name="statusName" defaultValue={cert.statusName}>
              {statuses.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date received" hint="The day the annual certification arrived.">
            <input className={inputClass} type="date" name="receivedDate" defaultValue={toInputDate(cert.receivedDate)} />
          </Field>
          <Field label="Date reviewed">
            <input className={inputClass} type="date" name="reviewedDate" defaultValue={toInputDate(cert.reviewedDate)} />
          </Field>
          <Field
            label="Notes"
            className="md:col-span-2"
            hint="If approved, the date the compliance letter went out. If pending, why it is pending."
          >
            <textarea className={inputClass} name="notes" rows={3} defaultValue={cert.notes ?? ""} />
          </Field>
          <div>
            <Button type="submit">Save cert</Button>
          </div>
        </form>
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
    </div>
  );
}
