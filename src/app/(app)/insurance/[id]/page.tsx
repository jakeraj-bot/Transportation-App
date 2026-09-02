import { notFound } from "next/navigation";
import { saveInsurance, softDelete } from "@/app/actions";
import { SimpleEmailForm } from "@/components/client-forms";
import { Button, Card, Field, Flag, PageHeader, inputClass } from "@/components/ui";
import { activeContractors, activeDistricts } from "@/lib/data";
import { insuranceCoverage } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { formatDate, toInputDate } from "@/lib/utils";

export default async function InsuranceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.insuranceCertificate.findFirst({
    where: { id, deletedAt: null },
    include: { contractor: true, district: true },
  });
  if (!row) notFound();
  const [contractors, districts, contracts] = await Promise.all([
    activeContractors(),
    activeDistricts(),
    prisma.contract.findMany({
      where: { contractorId: row.contractorId, districtId: row.districtId, deletedAt: null },
    }),
  ]);
  const gaps = contracts
    .map((c) => ({
      contract: c,
      cover: insuranceCoverage({
        insStart: row.startsOn,
        insEnd: row.expiresAt,
        contractStart: c.startsOn,
        contractEnd: c.endsOn,
        namedDistrict: row.namedDistrict,
        districtName: row.district.name,
      }),
    }))
    .filter((x) => x.cover.kind !== "covers");
  async function remove() {
    "use server";
    await softDelete("insurance", id, "/insurance");
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${row.contractor.legalName} · ${row.district.name}`}
        backHref="/insurance"
        hint={`${formatDate(row.startsOn)} – ${formatDate(row.expiresAt)}`}
        actions={<form action={remove}><button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">Remove</button></form>}
      />
      {gaps.length === 0 ? (
        <Flag tone="sage">This certificate covers the contracts on file for this contractor and district.</Flag>
      ) : (
        <Flag tone="rose">
          {gaps.length} contract{gaps.length === 1 ? "" : "s"} need an updated certificate because the dates do not cover the full run.
        </Flag>
      )}
      {row.filePath ? <a className="text-teal" href={`/api/files?path=${encodeURIComponent(row.filePath)}`}>Open uploaded certificate</a> : null}
      {gaps.length ? (
        <Card>
          <h2 className="serif mb-3 text-2xl">Email the district for an update</h2>
          <SimpleEmailForm
            districtId={row.districtId}
            defaultTo={row.district.email || ""}
            kind="insurance"
            subject={`Updated insurance needed — ${row.district.name}`}
            body={`Hello,\n\nPlease send an updated certificate of insurance for ${row.contractor.legalName} that names ${row.district.name} as an additional insured and covers the rest of the contract period.\n\nThank you,\nPassaic County Transportation`}
          />
        </Card>
      ) : null}
      <Card>
        <form action={saveInsurance} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={row.id} />
          <Field label="Contractor">
            <select className={inputClass} name="contractorId" defaultValue={row.contractorId}>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
            </select>
          </Field>
          <Field label="District">
            <select className={inputClass} name="districtId" defaultValue={row.districtId}>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="School year"><input className={inputClass} name="schoolYear" defaultValue={row.schoolYear} /></Field>
          <Field label="Policy number"><input className={inputClass} name="policyNumber" defaultValue={row.policyNumber ?? ""} /></Field>
          <Field label="Coverage amount"><input className={inputClass} name="amount" defaultValue={row.amount ?? ""} /></Field>
          <Field label="Coverage start date"><input className={inputClass} type="date" name="startsOn" defaultValue={toInputDate(row.startsOn)} /></Field>
          <Field label="Coverage end date"><input className={inputClass} type="date" name="expiresAt" defaultValue={toInputDate(row.expiresAt)} /></Field>
          <Field label="Name on the certificate" className="md:col-span-2"><input className={inputClass} name="namedDistrict" defaultValue={row.namedDistrict ?? ""} /></Field>
          <Field label="Replace file (optional)" hint="You can keep dates on file without uploading a scan.">
            <input className={inputClass} type="file" name="file" />
          </Field>
          <div><Button type="submit">Save insurance</Button></div>
        </form>
      </Card>
    </div>
  );
}
