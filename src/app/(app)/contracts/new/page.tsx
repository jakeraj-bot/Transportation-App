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
        hint="Choose the type first. A parental asks for the parent name and does not ask for a bus company. Quotes ask for one bus company. Originals, renewals, and joint agreements can have more than one. Addendums find a contract already on file and ask you to confirm before linking."
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
