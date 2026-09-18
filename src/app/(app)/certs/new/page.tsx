import { CertForm } from "@/components/cert-form";
import { Card, PageHeader } from "@/components/ui";
import { activeContractors, getSchoolYear, getStatuses } from "@/lib/data";

export default async function NewCertPage({
  searchParams,
}: {
  searchParams: Promise<{ contractorId?: string }>;
}) {
  const { contractorId } = await searchParams;
  const [contractors, schoolYear, statuses] = await Promise.all([
    activeContractors(),
    getSchoolYear(),
    getStatuses("cert"),
  ]);
  return (
    <div>
      <PageHeader
        title="New annual certification"
        backHref="/certs"
        hint="Track status only. Do not upload driver packets. If a contractor has terminals in more than one county, add one cert per county."
      />
      <Card>
        <CertForm
          contractors={contractors.map((c) => ({ id: c.id, legalName: c.legalName, county: c.county }))}
          statuses={statuses}
          schoolYear={schoolYear}
          defaultContractorId={contractorId}
        />
      </Card>
    </div>
  );
}
