import Link from "next/link";
import { CollapsibleBlock } from "@/components/collapsible";
import { DistrictForm } from "@/components/district-form";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

function addressPreview(district: { street: string | null; city: string | null; state: string | null; zip: string | null }) {
  const parts = [district.street, district.city, district.state, district.zip].filter(Boolean);
  return parts.length ? parts.join(", ") : "No letter address yet";
}

export default async function DistrictsPage() {
  const rows = await prisma.district.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-4">
      <PageHeader
        title="Districts"
        hint="Click a district to change its name, letter contact, or mailing address. Click it again to close it."
        actions={<Button href="/districts/new">Add district</Button>}
      />
      {rows.length === 0 ? (
        <EmptyState title="No districts" body="Add the first district." action={<Button href="/districts/new">Add district</Button>} />
      ) : (
        rows.map((district) => (
          <CollapsibleBlock key={district.id} title={district.name} hint={addressPreview(district)}>
            <DistrictForm district={district} returnTo="/districts" />
            <p className="text-sm text-muted">
              <Link className="text-teal" href={`/districts/${district.id}`}>
                Open the full district page
              </Link>
            </p>
          </CollapsibleBlock>
        ))
      )}
    </div>
  );
}
