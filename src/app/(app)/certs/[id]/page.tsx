import { notFound } from "next/navigation";
import { saveCert, softDelete } from "@/app/actions";
import { ChecklistRow, LetterButtons, Pt4Form } from "@/components/client-forms";
import { Button, Card, Field, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { activeContractors, ensureChecklist, getStatuses } from "@/lib/data";
import { prisma } from "@/lib/prisma";

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
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${cert.contractor.legalName} · ${cert.schoolYear}`}
        backHref="/certs"
        hint={`Vendor code ${cert.contractor.vendorCode || "not on file"}`}
        actions={<form action={remove}><button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">Remove</button></form>}
      />
      <Card>
        <p className="mb-4"><StatusChip name={cert.statusName} /></p>
        <LetterButtons kind="cert" id={cert.id} />
      </Card>
      <Card>
        <h2 className="serif mb-3 text-2xl">Checklist</h2>
        <div className="space-y-3">{checklist.map((item) => <ChecklistRow key={item.id} item={item} />)}</div>
      </Card>
      <Card>
        <h2 className="serif mb-3 text-2xl">PT-4 if something is missing</h2>
        <Pt4Form entityType="cert" entityId={cert.id} />
      </Card>
      <Card>
        <form action={saveCert} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={cert.id} />
          <Field label="Contractor">
            <select className={inputClass} name="contractorId" defaultValue={cert.contractorId}>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
            </select>
          </Field>
          <Field label="School year"><input className={inputClass} name="schoolYear" defaultValue={cert.schoolYear} /></Field>
          <Field label="Status">
            <select className={inputClass} name="statusName" defaultValue={cert.statusName}>
              {statuses.map((s) => <option key={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="md:col-span-2"><textarea className={inputClass} name="notes" rows={3} defaultValue={cert.notes ?? ""} /></Field>
          <div><Button type="submit">Save cert</Button></div>
        </form>
      </Card>
    </div>
  );
}
