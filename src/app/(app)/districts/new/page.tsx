import { DistrictForm } from "@/components/district-form";
import { Card, PageHeader } from "@/components/ui";

export default function NewDistrictPage() {
  return (
    <div>
      <PageHeader title="Add district" backHref="/districts" />
      <Card>
        <DistrictForm />
      </Card>
    </div>
  );
}
