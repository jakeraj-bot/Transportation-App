import Link from "next/link";
import { notFound } from "next/navigation";
import { saveInsurance, softDelete } from "@/app/actions";
import { SimpleEmailForm } from "@/components/client-forms";
import { Button, Card, Field, Flag, PageHeader, inputClass } from "@/components/ui";
import { activeContractors, activeDistricts } from "@/lib/data";
import { outlookConfigured } from "@/lib/email";
import { certificatesCoverContract } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { formatDate, toInputDate } from "@/lib/utils";

export default async function InsuranceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.insuranceCertificate.findFirst({
    where: { id, deletedAt: null },
    include: { contractor: true, district: true },
  });
  if (!row) notFound();
  const [contractors, districts, contracts, certificates] = await Promise.all([
    activeContractors(),
    activeDistricts(),
    prisma.contract.findMany({
      where: { contractorId: row.contractorId, districtId: row.districtId, deletedAt: null },
    }),
    prisma.insuranceCertificate.findMany({
      where: { contractorId: row.contractorId, districtId: row.districtId, deletedAt: null },
    }),
  ]);
  const onFile = [...certificates].sort((a, b) => {
    const start = (a.startsOn?.getTime() ?? 0) - (b.startsOn?.getTime() ?? 0);
    if (start !== 0) return start;
    return (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0);
  });
  const gaps = contracts
    .map((c) => ({
      contract: c,
      cover: certificatesCoverContract({
        certificates: onFile,
        contractStart: c.startsOn,
        contractEnd: c.endsOn,
        districtName: row.district.name,
      }),
    }))
    .filter((x) => x.cover.kind === "gap" || x.cover.kind === "missing" || x.cover.kind === "mismatch");
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
        <Flag tone="sage">
          {onFile.length > 1
            ? "Together, the certificates on file cover the contracts for this contractor and district."
            : "This certificate covers the contracts on file for this contractor and district."}
        </Flag>
      ) : (
        <Flag tone="rose">
          {gaps.length} contract{gaps.length === 1 ? "" : "s"} still need coverage for the full run. Add the updated certificate and keep this one.
        </Flag>
      )}
      <Card>
        <h2 className="serif mb-2 text-2xl">Certificates on file</h2>
        <p className="mb-3 text-sm text-muted">
          Adding an updated certificate keeps this one. The contract is covered when the dates together span the full run.
        </p>
        <ul className="space-y-2 text-sm">
          {onFile.map((cert) => (
            <li key={cert.id}>
              {cert.id === row.id ? (
                <span>
                  {formatDate(cert.startsOn)} – {formatDate(cert.expiresAt)}
                  {cert.policyNumber ? ` · ${cert.policyNumber}` : ""} · this certificate
                </span>
              ) : (
                <Link className="text-teal hover:underline" href={`/insurance/${cert.id}`}>
                  {formatDate(cert.startsOn)} – {formatDate(cert.expiresAt)}
                  {cert.policyNumber ? ` · ${cert.policyNumber}` : ""}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <Link
          className="mt-3 inline-block text-teal hover:underline"
          href={`/insurance/new?contractorId=${row.contractorId}&districtId=${row.districtId}`}
        >
          Add another certificate
        </Link>
      </Card>
      {row.filePath ? <a className="text-teal" href={`/api/files?path=${encodeURIComponent(row.filePath)}`}>Open uploaded certificate</a> : null}
      {gaps.length ? (
        <Card>
          <h2 className="serif mb-3 text-2xl">Prepare an email for the district</h2>
          <SimpleEmailForm
            districtId={row.districtId}
            defaultTo={row.district.email || ""}
            kind="insurance"
            subject={`Updated insurance needed — ${row.district.name}`}
            body={`Hello,\n\nPlease send an updated certificate of insurance for ${row.contractor.legalName} that names ${row.district.name} as an additional insured${gaps[0]?.cover.gapStart && gaps[0]?.cover.gapEnd ? ` and covers ${formatDate(gaps[0].cover.gapStart)} through ${formatDate(gaps[0].cover.gapEnd)}` : " and covers the rest of the contract period"}.\n\nThank you,\nPassaic County Transportation`}
            canSend={outlookConfigured()}
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
