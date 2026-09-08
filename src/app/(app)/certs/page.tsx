import { CertList } from "@/components/cert-list";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { getSchoolYear, getStatuses } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function CertsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; county?: string; open?: string }>;
}) {
  const { q = "", status = "", county = "", open } = await searchParams;
  const [schoolYear, statuses] = await Promise.all([getSchoolYear(), getStatuses("cert")]);
  const statusColor = Object.fromEntries(statuses.map((row) => [row.name, row.color]));
  const rows = await prisma.annualCert.findMany({
    where: { deletedAt: null, schoolYear },
    include: { contractor: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        title="Annual certifications"
        hint={`Status only for ${schoolYear}. Search by bus company or OSP code, or filter by status and county. Driver packets stay in the paper file. Due August 15.`}
        actions={<Button href="/certs/new">New annual cert</Button>}
      />
      {rows.length === 0 ? (
        <EmptyState title="No certs entered this year" body="Add a contractor’s cert status when the packet arrives." action={<Button href="/certs/new">New annual cert</Button>} />
      ) : (
        <CertList
          initialQ={q}
          initialStatus={status}
          initialCounty={county}
          initialOpen={open === "1" || open === "true"}
          statuses={statuses.map((row) => ({ name: row.name, color: row.color }))}
          rows={rows.map((c) => ({
            id: c.id,
            statusName: c.statusName,
            statusColor: statusColor[c.statusName],
            notes: c.notes,
            receivedDateLabel: formatDate(c.receivedDate),
            contractorName: c.contractor.legalName,
            dba: c.contractor.dba,
            ospCode: c.contractor.ospCode,
            vendorCode: c.contractor.vendorCode,
            county: c.contractor.county,
          }))}
        />
      )}
    </div>
  );
}
