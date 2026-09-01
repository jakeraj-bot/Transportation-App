import { saveDistrict } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";

export default function NewDistrictPage() {
  return (
    <div>
      <PageHeader title="Add district" backHref="/districts" />
      <Card>
        <form action={saveDistrict} className="grid gap-4 md:grid-cols-2">
          <Field label="District name" className="md:col-span-2"><input className={inputClass} name="name" required /></Field>
          <Field label="Transportation email" hint="Used for PT-4s and insurance follow-up."><input className={inputClass} name="email" type="email" /></Field>
          <Field label="Phone"><input className={inputClass} name="phone" /></Field>
          <Field label="Notes" className="md:col-span-2"><textarea className={inputClass} name="notes" rows={3} /></Field>
          <div><Button type="submit">Save district</Button></div>
        </form>
      </Card>
    </div>
  );
}
