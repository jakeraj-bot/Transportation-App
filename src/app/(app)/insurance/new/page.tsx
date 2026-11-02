import Link from "next/link";
import { saveInsurance } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { activeContractors, activeDistricts, getSchoolYear } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function NewInsurancePage({
  searchParams,
}: {
  searchParams: Promise<{ contractorId?: string; districtId?: string }>;
}) {
  const q = await searchParams;
  const [contractors, districts, schoolYear, alreadyOnFile] = await Promise.all([
    activeContractors(),
    activeDistricts(),
    getSchoolYear(),
    q.contractorId && q.districtId
      ? prisma.insuranceCertificate.findMany({
          where: { contractorId: q.contractorId, districtId: q.districtId, deletedAt: null },
          orderBy: [{ startsOn: "asc" }, { expiresAt: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  return (
    <div>
      <PageHeader
        title="Add insurance certificate"
        backHref="/insurance"
        hint="We do not approve insurance. The certificate already on file stays. Enter the updated policy here, and the dates are checked together."
      />
      {alreadyOnFile.length ? (
        <Card className="mb-4">
          <h2 className="serif mb-2 text-2xl">Already on file</h2>
          <p className="mb-3 text-sm text-muted">These stay when you save the updated certificate.</p>
          <ul className="space-y-1 text-sm">
            {alreadyOnFile.map((cert) => (
              <li key={cert.id}>
                <Link className="text-teal hover:underline" href={`/insurance/${cert.id}`}>
                  {formatDate(cert.startsOn)} – {formatDate(cert.expiresAt)}
                </Link>
                {cert.policyNumber ? ` · ${cert.policyNumber}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <form action={saveInsurance} className="grid gap-4 md:grid-cols-2">
          <Field label="Contractor">
            <select className={inputClass} name="contractorId" required defaultValue={q.contractorId}>
              <option value="">Choose</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
            </select>
          </Field>
          <Field label="District named on the certificate">
            <select className={inputClass} name="districtId" required defaultValue={q.districtId}>
              <option value="">Choose</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="School year"><input className={inputClass} name="schoolYear" defaultValue={schoolYear} /></Field>
          <Field label="Policy number"><input className={inputClass} name="policyNumber" /></Field>
          <Field label="Coverage amount"><input className={inputClass} name="amount" /></Field>
          <Field label="Coverage start date"><input className={inputClass} type="date" name="startsOn" /></Field>
          <Field label="Coverage end date"><input className={inputClass} type="date" name="expiresAt" /></Field>
          <Field label="District name as it appears on the certificate" className="md:col-span-2">
            <input className={inputClass} name="namedDistrict" />
          </Field>
          <Field label="Upload the certificate (optional)" hint="Dates and the named district are enough. Skip the file if scanning it would take too long." className="md:col-span-2">
            <input className={inputClass} type="file" name="file" />
          </Field>
          <div><Button type="submit">Save insurance</Button></div>
        </form>
      </Card>
    </div>
  );
}
