import { ContractorForm } from "@/components/contractor-form";
import { Card, PageHeader } from "@/components/ui";

export default function NewContractorPage() {
  return (
    <div>
      <PageHeader
        title="Add contractor"
        backHref="/contractors"
        hint="Vendor code, Office of Student Protection code, bus location, contact, and Business Registration Certificate."
      />
      <Card>
        <ContractorForm />
      </Card>
    </div>
  );
}
