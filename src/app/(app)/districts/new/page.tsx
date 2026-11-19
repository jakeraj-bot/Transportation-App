import { redirect } from "next/navigation";
import { DistrictForm } from "@/components/district-form";
import { Card, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { canEditDistricts } from "@/lib/roles";

export default async function NewDistrictPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canEditDistricts(session.role, session.permissions)) redirect("/districts");
  return (
    <div>
      <PageHeader title="Add district" backHref="/districts" />
      <Card>
        <DistrictForm />
      </Card>
    </div>
  );
}
