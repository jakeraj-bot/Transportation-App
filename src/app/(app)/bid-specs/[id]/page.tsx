import { notFound } from "next/navigation";
import { saveBidSpec, softDelete } from "@/app/actions";
import { ChecklistRow } from "@/components/client-forms";
import { Button, Card, Field, Flag, PageHeader, inputClass } from "@/components/ui";
import { activeDistricts, ensureChecklist, getStatuses } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function BidSpecDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.bidSpec.findFirst({ where: { id, deletedAt: null }, include: { district: true } });
  if (!row) notFound();
  const highlights = row.highlightsJson ? (JSON.parse(row.highlightsJson) as Array<{ label: string; value: string }>) : [];
  const [districts, statuses, checklist] = await Promise.all([
    activeDistricts(),
    getStatuses("bid_spec"),
    ensureChecklist("bid_spec", row.id),
  ]);
  async function remove() {
    "use server";
    await softDelete("bid_spec", id, "/bid-specs");
  }
  return (
    <div className="space-y-6">
      <PageHeader title={row.title} backHref="/bid-specs" hint={row.district.name} actions={<form action={remove}><button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">Remove</button></form>} />
      {highlights.length > 0 ? (
        <Card>
          <h2 className="serif mb-3 text-2xl">Highlighted for your review</h2>
          <p className="mb-3 text-sm text-muted">The scan filled these in. Change anything that is wrong before you approve.</p>
          <div className="space-y-2">
            {highlights.map((h) => (
              <Flag key={h.label} tone={h.label.includes("Insurance") || h.label.includes("Bond") ? "amber" : "teal"}>
                <strong>{h.label}:</strong> {h.value}
              </Flag>
            ))}
          </div>
        </Card>
      ) : null}
      {row.filePath ? <a className="text-teal" href={`/api/files?path=${encodeURIComponent(row.filePath)}`}>Open uploaded spec</a> : null}
      <Card>
        <h2 className="serif mb-3 text-2xl">Checklist</h2>
        <div className="space-y-3">{checklist.map((item) => <ChecklistRow key={item.id} item={item} />)}</div>
      </Card>
      <Card>
        <form action={saveBidSpec} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={row.id} />
          <Field label="District">
            <select className={inputClass} name="districtId" defaultValue={row.districtId}>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="School year"><input className={inputClass} name="schoolYear" defaultValue={row.schoolYear} /></Field>
          <Field label="Title" className="md:col-span-2"><input className={inputClass} name="title" defaultValue={row.title} /></Field>
          <Field label="Insurance amount"><input className={inputClass} name="insuranceAmount" defaultValue={row.insuranceAmount ?? ""} /></Field>
          <Field label="Bond type">
            <select className={inputClass} name="bondType" defaultValue={row.bondType ?? ""}>
              <option value="">Unknown</option>
              <option value="corporate">Corporate</option>
              <option value="personal">Personal</option>
              <option value="none">None</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} name="statusName" defaultValue={row.statusName}>
              {statuses.map((s) => <option key={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Replace scan"><input className={inputClass} type="file" name="file" /></Field>
          <div><Button type="submit">Save bid spec</Button></div>
        </form>
      </Card>
    </div>
  );
}
