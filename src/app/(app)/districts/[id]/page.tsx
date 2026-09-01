import { notFound } from "next/navigation";
import { softDelete } from "@/app/actions";
import { CollapsibleSection } from "@/components/collapsible";
import { DistrictForm } from "@/components/district-form";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function DistrictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const district = await prisma.district.findFirst({ where: { id, deletedAt: null } });
  if (!district) notFound();
  async function remove() {
    "use server";
    await softDelete("district", id, "/districts");
  }
  const address =
    [district.street, district.city, district.state, district.zip].filter(Boolean).join(", ") || "No letter address yet";
  return (
    <div className="space-y-4">
      <PageHeader
        title={district.name}
        backHref="/districts"
        hint="Click a heading to open it. Click it again to close it."
        actions={
          <form action={remove}>
            <button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">
              Remove
            </button>
          </form>
        }
      />
      <CollapsibleSection
        title="Name and contact"
        hint={district.contactName ? `${district.contactName}${district.contactPosition ? `, ${district.contactPosition}` : ""}` : "Add the person letters should be addressed to"}
      >
        <DistrictForm district={district} fields="identity" />
      </CollapsibleSection>
      <CollapsibleSection title="Letter address" hint={address}>
        <DistrictForm district={district} fields="address" />
      </CollapsibleSection>
    </div>
  );
}
