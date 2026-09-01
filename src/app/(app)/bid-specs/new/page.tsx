import { saveBidSpec } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { activeDistricts, getSchoolYear, getStatuses } from "@/lib/data";

export default async function NewBidSpecPage() {
  const [districts, schoolYear, statuses] = await Promise.all([activeDistricts(), getSchoolYear(), getStatuses("bid_spec")]);
  return (
    <div>
      <PageHeader title="New bid spec" backHref="/bid-specs" hint="Upload the scan. The app will try to fill insurance amount and bond type. You can always edit." />
      <Card>
        <form action={saveBidSpec} className="grid gap-4 md:grid-cols-2">
          <Field label="District">
            <select className={inputClass} name="districtId" required>
              <option value="">Choose</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="School year"><input className={inputClass} name="schoolYear" defaultValue={schoolYear} /></Field>
          <Field label="Title" className="md:col-span-2"><input className={inputClass} name="title" required /></Field>
          <Field label="Status">
            <select className={inputClass} name="statusName">{statuses.map((s) => <option key={s.id}>{s.name}</option>)}</select>
          </Field>
          <Field label="Scan or file"><input className={inputClass} type="file" name="file" /></Field>
          <Field label="Insurance amount (if you already know it)"><input className={inputClass} name="insuranceAmount" /></Field>
          <Field label="Bond type">
            <select className={inputClass} name="bondType">
              <option value="">Unknown</option>
              <option value="corporate">Corporate</option>
              <option value="personal">Personal</option>
              <option value="none">None</option>
            </select>
          </Field>
          <div><Button type="submit">Save bid spec</Button></div>
        </form>
      </Card>
    </div>
  );
}
