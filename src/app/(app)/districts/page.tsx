import Link from "next/link";
import { redirect } from "next/navigation";
import { CollapsibleBlock } from "@/components/collapsible";
import { DistrictForm } from "@/components/district-form";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditDistricts } from "@/lib/roles";

function addressPreview(district: { street: string | null; city: string | null; state: string | null; zip: string | null }) {
  const parts = [district.street, district.city, district.state, district.zip].filter(Boolean);
  return parts.length ? parts.join(", ") : "No letter address yet";
}

export default async function DistrictsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const canEdit = canEditDistricts(session.role, session.permissions);
  const rows = await prisma.district.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-4">
      <PageHeader
        title="Districts"
        hint={
          canEdit
            ? "Click a district to change its name, letter contact, or mailing address. Click it again to close it."
            : "You can view district information here. Changes are only allowed if Super Admin gives you permission."
        }
        actions={canEdit ? <Button href="/districts/new">Add district</Button> : undefined}
      />
      {rows.length === 0 ? (
        <EmptyState title="No districts" body="Add the first district." action={canEdit ? <Button href="/districts/new">Add district</Button> : undefined} />
      ) : (
        rows.map((district) => (
          <CollapsibleBlock key={district.id} title={district.name} hint={addressPreview(district)}>
            <DistrictForm district={district} returnTo="/districts" readOnly={!canEdit} />
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
