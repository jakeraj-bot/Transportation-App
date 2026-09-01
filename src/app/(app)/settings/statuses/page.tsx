import { saveStatus, softDelete } from "@/app/actions";
import { Button, Card, Field, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";

const ENTITIES = [
  ["contract", "Contracts"],
  ["cert", "Annual certs"],
  ["bid_spec", "Bid specs"],
  ["route_description", "Route descriptions"],
  ["emergency_quote", "Emergency quotes"],
  ["insurance", "Insurance"],
];

export default async function StatusesPage() {
  const rows = await prisma.status.findMany({
    where: { deletedAt: null },
    orderBy: [{ entityType: "asc" }, { sortOrder: "asc" }],
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Statuses" backHref="/settings" hint="Add, rename, or remove the status words staff can choose." />
      {ENTITIES.map(([entityType, label]) => (
        <Card key={entityType}>
          <h2 className="serif mb-3 text-2xl">{label}</h2>
          <div className="space-y-3">
            {rows
              .filter((s) => s.entityType === entityType)
              .map((s) => (
                <form key={s.id} action={saveStatus} className="grid gap-2 md:grid-cols-[1fr_140px_90px_auto] md:items-end">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="entityType" value={entityType} />
                  <Field label="Name"><input className={inputClass} name="name" defaultValue={s.name} /></Field>
                  <Field label="Color">
                    <select className={inputClass} name="color" defaultValue={s.color}>
                      <option value="teal">Teal</option>
                      <option value="sage">Sage</option>
                      <option value="amber">Amber</option>
                      <option value="rose">Rose</option>
                      <option value="blue">Blue</option>
                    </select>
                  </Field>
                  <Field label="Order"><input className={inputClass} name="sortOrder" defaultValue={s.sortOrder} /></Field>
                  <div className="flex items-center gap-2 pb-1">
                    <Button type="submit">Save</Button>
                    <StatusChip name={s.name} color={s.color} />
                  </div>
                </form>
              ))}
            <form action={saveStatus} className="grid gap-2 border-t border-line pt-3 md:grid-cols-[1fr_140px_90px_auto] md:items-end">
              <input type="hidden" name="entityType" value={entityType} />
              <Field label="New status name"><input className={inputClass} name="name" required /></Field>
              <Field label="Color">
                <select className={inputClass} name="color">
                  <option value="teal">Teal</option>
                  <option value="sage">Sage</option>
                  <option value="amber">Amber</option>
                  <option value="rose">Rose</option>
                  <option value="blue">Blue</option>
                </select>
              </Field>
              <Field label="Order"><input className={inputClass} name="sortOrder" defaultValue="10" /></Field>
              <Button type="submit">Add</Button>
            </form>
          </div>
        </Card>
      ))}
      <Card>
        <h2 className="serif mb-3 text-2xl">Remove a status</h2>
        {rows.map((s) => (
          <form
            key={s.id}
            className="mb-2"
            action={async () => {
              "use server";
              await softDelete("status", s.id, "/settings/statuses");
            }}
          >
            <button className="text-sm text-rose" type="submit">Remove {s.entityType}: {s.name}</button>
          </form>
        ))}
      </Card>
    </div>
  );
}
