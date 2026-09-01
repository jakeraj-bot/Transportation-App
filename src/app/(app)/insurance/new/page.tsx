import { saveInsurance } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { activeContractors, activeDistricts, getSchoolYear } from "@/lib/data";

export default async function NewInsurancePage({
  searchParams,
}: {
  searchParams: Promise<{ contractorId?: string; districtId?: string }>;
}) {
  const q = await searchParams;
  const [contractors, districts, schoolYear] = await Promise.all([
    activeContractors(),
    activeDistricts(),
    getSchoolYear(),
  ]);
  return (
    <div>
      <PageHeader
        title="Add insurance certificate"
        backHref="/insurance"
        hint="We do not approve insurance. We file it so every contract between this contractor and this district stays covered for the full run."
      />
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
          <Field label="Upload the certificate" className="md:col-span-2"><input className={inputClass} type="file" name="file" /></Field>
          <div><Button type="submit">Save insurance</Button></div>
        </form>
      </Card>
    </div>
  );
}
