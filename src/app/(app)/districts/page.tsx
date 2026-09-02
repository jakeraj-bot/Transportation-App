import Link from "next/link";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDistrictAddress } from "@/lib/docx";
import { prisma } from "@/lib/prisma";

export default async function DistrictsPage() {
  const rows = await prisma.district.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader title="Districts" hint="Passaic County districts we review packets for." actions={<Button href="/districts/new">Add district</Button>} />
      {rows.length === 0 ? (
        <EmptyState title="No districts" body="Add the first district." action={<Button href="/districts/new">Add district</Button>} />
      ) : (
        <Card className="divide-y divide-line p-0">
          {rows.map((d) => {
            const address = formatDistrictAddress(d);
            return (
            <Link key={d.id} href={`/districts/${d.id}`} className="block px-5 py-3 hover:bg-teal-soft/40">
              <p className="font-medium">{d.name}</p>
              <p className="text-sm text-muted">
                {d.email || "Add a transportation email so PT-4s can send"}
                {address ? ` · ${address.split("\n").join(" · ")}` : " · Add a letter address"}
              </p>
            </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
