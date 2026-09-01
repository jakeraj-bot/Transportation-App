import { ContractForm } from "@/components/contract-form";
import { Card, PageHeader } from "@/components/ui";
import { activeContractors, activeDistricts, getSchoolYear, getStatuses } from "@/lib/data";

export default async function NewContractPage() {
  const [schoolYear, districts, contractors, statuses] = await Promise.all([
    getSchoolYear(),
    activeDistricts(),
    activeContractors(),
    getStatuses("contract"),
  ]);

  return (
    <div>
      <PageHeader
        title="New contract"
        backHref="/contracts"
        hint="Enter only what identifies the packet when it arrives. Cost, insurance, bonds, and links are added when someone starts the review."
      />
      <Card>
        <ContractForm
          mode="intake"
          schoolYear={schoolYear}
          districts={districts}
          contractors={contractors}
          statuses={statuses}
        />
      </Card>
    </div>
  );
}
