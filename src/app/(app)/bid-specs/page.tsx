import Link from "next/link";
import { Button, Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function BidSpecsPage() {
  const rows = await prisma.bidSpec.findMany({
    where: { deletedAt: null },
    include: { district: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Bid specifications" hint="Review specs before advertisement. Scan them so insurance and bond type can be highlighted." actions={<Button href="/bid-specs/new">New bid spec</Button>} />
      {rows.length === 0 ? (
        <EmptyState title="No bid specs yet" body="Add a spec when a district sends it for review." action={<Button href="/bid-specs/new">New bid spec</Button>} />
      ) : (
        <Card className="divide-y divide-line p-0">
          {rows.map((r) => (
            <Link key={r.id} href={`/bid-specs/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-teal-soft/40">
              <span>{r.title} · {r.district.name}</span>
              <StatusChip name={r.statusName} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
