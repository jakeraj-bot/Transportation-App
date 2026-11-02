import { redirect } from "next/navigation";
import { saveStatus, softDelete } from "@/app/actions";
import { StatusColorField } from "@/components/status-color-field";
import { Button, Card, Field, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { resolveStatusHex } from "@/lib/status-color";

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
      <PageHeader
        title="Statuses"
        backHref="/settings"
        hint="Add, rename, or delete the status words staff can choose. Pick a color square or type a hex code, the same way as My home screen."
      />
      {ENTITIES.map(([entityType, label]) => (
        <Card key={entityType}>
          <h2 className="serif mb-3 text-2xl">{label}</h2>
          <div className="space-y-3">
            {rows
              .filter((s) => s.entityType === entityType)
              .map((s) => (
                <div key={s.id} className="flex flex-col gap-2 border-b border-line/70 pb-3 last:border-0 md:flex-row md:items-end">
                  <form action={saveStatus} className="grid flex-1 gap-2 md:grid-cols-[1fr_220px_90px_auto] md:items-end">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="entityType" value={entityType} />
                    <Field label="Name">
                      <input className={inputClass} name="name" defaultValue={s.name} />
                    </Field>
                    <StatusColorField defaultValue={s.color} />
                    <Field label="Order">
                      <input className={inputClass} name="sortOrder" defaultValue={s.sortOrder} />
                    </Field>
                    <div className="flex items-center gap-2 pb-1">
                      <Button type="submit">Save</Button>
                      <StatusChip name={s.name} color={resolveStatusHex(s.color)} />
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
            <form action={saveStatus} className="grid gap-2 border-t border-line pt-3 md:grid-cols-[1fr_220px_90px_auto] md:items-end">
              <input type="hidden" name="entityType" value={entityType} />
              <Field label="New status name">
                <input className={inputClass} name="name" required />
              </Field>
              <StatusColorField defaultValue="#2f9d90" />
              <Field label="Order">
                <input className={inputClass} name="sortOrder" defaultValue="10" />
              </Field>
              <Button type="submit">Add</Button>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}
