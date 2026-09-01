import Link from "next/link";
import { Button, Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { getSchoolYear } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function CertsPage() {
  const schoolYear = await getSchoolYear();
  const rows = await prisma.annualCert.findMany({
    where: { deletedAt: null, schoolYear },
    include: { contractor: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        title="Annual certifications"
        hint={`Status only for ${schoolYear}. Driver packets stay in the paper file. Due August 15.`}
        actions={<Button href="/certs/new">New annual cert</Button>}
      />
      {rows.length === 0 ? (
        <EmptyState title="No certs entered this year" body="Add a contractor’s cert status when the packet arrives." action={<Button href="/certs/new">New annual cert</Button>} />
      ) : (
        <Card className="divide-y divide-line p-0">
          {rows.map((c) => (
            <Link key={c.id} href={`/certs/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-teal-soft/40">
              <span>{c.contractor.legalName} · {c.contractor.vendorCode || "no code"}</span>
              <StatusChip name={c.statusName} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
