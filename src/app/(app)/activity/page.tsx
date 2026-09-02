import { restoreDeleted } from "@/app/actions";
import { redirect } from "next/navigation";
import { Button, Card, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function ActivityPage() {
  const session = await getSession();
  if (!isSuperAdmin(session?.role)) redirect("/");
  const rows = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div>
      <PageHeader
        title="Activity"
        hint="Only Super Admin can see this trail. If you deleted something by mistake, use Undo on that delete."
      />
      <Card className="divide-y divide-line p-0">
        {rows.length === 0 ? <p className="p-5 text-muted">Nothing logged yet.</p> : rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
            <div>
              <p className="font-medium">{r.summary}</p>
              <p className="text-sm text-muted">{r.user.name} · {r.action} · {r.entityType} · {formatDate(r.createdAt)} {r.createdAt.toLocaleTimeString()}</p>
            </div>
            {r.action === "delete" && r.entityId ? (
              <form
                action={async () => {
                  "use server";
                  await restoreDeleted(r.entityType, r.entityId!);
                }}
              >
                <Button type="submit" variant="secondary">Undo</Button>
              </form>
            ) : null}
          </div>
        ))}
      </Card>
    </div>
  );
}
