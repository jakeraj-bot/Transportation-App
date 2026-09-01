import Link from "next/link";
import { Button, Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function RouteDescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const rows = await prisma.routeDescription.findMany({
    where: { deletedAt: null, ...(kind ? { kind } : {}) },
    include: { district: true, lines: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        title="Route descriptions"
        hint="Bid route descriptions and emergency quotes live here. Scan a packet and we will try to split each route, destination, times, and dates."
        actions={<Button href="/route-descriptions/new">New route packet</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button href="/route-descriptions" variant={!kind ? "primary" : "secondary"}>All</Button>
        <Button href="/route-descriptions?kind=bid" variant={kind === "bid" ? "primary" : "secondary"}>Bid approvals</Button>
        <Button href="/route-descriptions?kind=emergency_quote" variant={kind === "emergency_quote" ? "primary" : "secondary"}>Emergency quotes</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="None yet" body="Add a packet when a district sends route descriptions or an emergency quote." action={<Button href="/route-descriptions/new">New route packet</Button>} />
      ) : (
        <Card className="divide-y divide-line p-0">
          {rows.map((r) => (
            <Link key={r.id} href={`/route-descriptions/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-teal-soft/40">
              <span>
                {r.destination || r.title} · {r.district.name} · {r.kind === "emergency_quote" ? "Emergency quote" : "Bid"} · {r.lines.length || r.routeNumbers} routes
              </span>
              <StatusChip name={r.statusName} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
