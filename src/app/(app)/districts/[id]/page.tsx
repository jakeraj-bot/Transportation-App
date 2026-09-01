import { notFound } from "next/navigation";
import { saveDistrict, softDelete } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function DistrictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const district = await prisma.district.findFirst({ where: { id, deletedAt: null } });
  if (!district) notFound();
  async function remove() {
    "use server";
    await softDelete("district", id, "/districts");
  }
  return (
    <div>
      <PageHeader title={district.name} backHref="/districts" actions={<form action={remove}><button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">Remove</button></form>} />
      <Card>
        <form action={saveDistrict} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={district.id} />
          <Field label="District name" className="md:col-span-2"><input className={inputClass} name="name" required defaultValue={district.name} /></Field>
          <Field label="Transportation email"><input className={inputClass} name="email" type="email" defaultValue={district.email ?? ""} /></Field>
          <Field label="Phone"><input className={inputClass} name="phone" defaultValue={district.phone ?? ""} /></Field>
          <Field label="Code"><input className={inputClass} name="code" defaultValue={district.code ?? ""} /></Field>
          <Field label="Street for letters" className="md:col-span-2" hint="This address is printed on approval, disapproval, and PT-4 letters for this district.">
            <input className={inputClass} name="street" defaultValue={district.street ?? ""} />
          </Field>
          <Field label="City"><input className={inputClass} name="city" defaultValue={district.city ?? ""} /></Field>
          <Field label="State"><input className={inputClass} name="state" defaultValue={district.state ?? ""} placeholder="NJ" /></Field>
          <Field label="ZIP"><input className={inputClass} name="zip" defaultValue={district.zip ?? ""} /></Field>
          <Field label="Notes" className="md:col-span-2"><textarea className={inputClass} name="notes" rows={3} defaultValue={district.notes ?? ""} /></Field>
          <div><Button type="submit">Save district</Button></div>
        </form>
      </Card>
    </div>
  );
}
