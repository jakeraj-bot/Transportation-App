import { ContractIntakeForm } from "@/components/contract-intake-form";
import { ContractTypePicker } from "@/components/contract-type-picker";
import { Card, Flag, PageHeader } from "@/components/ui";
import { activeContractors, activeDistricts, getSchoolYear, getStatuses } from "@/lib/data";
import { isIntakeType } from "@/lib/contract-intake";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; type?: string }>;
}) {
  const { error, type } = await searchParams;
  const [schoolYear, districts, contractors, statuses] = await Promise.all([
    getSchoolYear(),
    activeDistricts(),
    activeContractors(),
    getStatuses("contract"),
  ]);
  const selectedType = isIntakeType(type) ? type : null;

  return (
    <div>
      <PageHeader
        title="New contract"
        backHref="/contracts"
        hint="Choose the type of packet first. Enter what identifies it, including contract dates when you know them. Cost, insurance amounts, and bonds are added during review."
      />
      {error ? <Flag tone="rose">{error}</Flag> : null}
      <Card>
        {selectedType ? (
          <ContractIntakeForm
            source="incoming"
            type={selectedType}
            schoolYear={schoolYear}
            districts={districts}
            contractors={contractors}
            statuses={statuses}
            changeTypeHref="/contracts/new"
          />
        ) : (
          <ContractTypePicker
            basePath="/contracts/new"
            hint="What kind of contract is this packet?"
          />
        )}
      </Card>
    </div>
  );
}
