import { saveCert } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { activeContractors, getSchoolYear, getStatuses } from "@/lib/data";

export default async function NewCertPage({
  searchParams,
}: {
  searchParams: Promise<{ contractorId?: string }>;
}) {
  const { contractorId } = await searchParams;
  const [contractors, schoolYear, statuses] = await Promise.all([
    activeContractors(),
    getSchoolYear(),
    getStatuses("cert"),
  ]);
  return (
    <div>
      <PageHeader title="New annual certification" backHref="/certs" hint="Track status only. Do not upload driver packets." />
      <Card>
        <form action={saveCert} className="grid gap-4 md:grid-cols-2">
          <Field label="Contractor">
            <select className={inputClass} name="contractorId" required defaultValue={contractorId}>
              <option value="">Choose a contractor</option>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
            </select>
          </Field>
          <Field label="School year"><input className={inputClass} name="schoolYear" defaultValue={schoolYear} /></Field>
          <Field label="Status">
            <select className={inputClass} name="statusName">
              {statuses.map((s) => <option key={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="md:col-span-2"><textarea className={inputClass} name="notes" rows={3} /></Field>
          <div><Button type="submit">Save cert</Button></div>
        </form>
      </Card>
    </div>
  );
}
