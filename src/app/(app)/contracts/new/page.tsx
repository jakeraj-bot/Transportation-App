import { ContractForm } from "@/components/contract-form";
import { Card, Flag, PageHeader } from "@/components/ui";
import { activeContractors, activeDistricts, getSchoolYear, getStatuses } from "@/lib/data";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
        hint="Enter only what identifies the packet when it arrives. If the contractor is new, add the name only. Cost, insurance, bonds, and dates are added when someone starts the review."
      />
      {error ? <Flag tone="rose">{error}</Flag> : null}
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
