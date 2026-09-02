import { redirect } from "next/navigation";
import { saveStatus, softDelete } from "@/app/actions";
import { Button, Card, Field, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

const ENTITIES = [
  ["contract", "Contracts"],
  ["cert", "Annual certs"],
  ["bid_spec", "Bid specs"],
  ["route_description", "Route descriptions"],
  ["emergency_quote", "Emergency quotes"],
  ["insurance", "Insurance"],
];

export default async function StatusesPage() {
  const session = await getSession();
  if (!isSuperAdmin(session?.role)) redirect("/settings");
  const rows = await prisma.status.findMany({
    where: { deletedAt: null },
    orderBy: [{ entityType: "asc" }, { sortOrder: "asc" }],
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Statuses" backHref="/settings" hint="Add, rename, or delete the status words staff can choose. Use Delete next to a status." />
      {ENTITIES.map(([entityType, label]) => (
        <Card key={entityType}>
          <h2 className="serif mb-3 text-2xl">{label}</h2>
          <div className="space-y-3">
            {rows
              .filter((s) => s.entityType === entityType)
              .map((s) => (
                <div key={s.id} className="flex flex-col gap-2 border-b border-line/70 pb-3 last:border-0 md:flex-row md:items-end">
                  <form action={saveStatus} className="grid flex-1 gap-2 md:grid-cols-[1fr_140px_90px_auto] md:items-end">
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
                  <form
                    action={async () => {
                      "use server";
                      await softDelete("status", s.id, "/settings/statuses");
                    }}
                  >
                    <button className="rounded-xl bg-rose-soft px-3 py-2.5 text-sm text-rose" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
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
    </div>
  );
}
