import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Button, Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { certificatesCoverContract } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function InsurancePage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string }>;
}) {
  noStore();
  const { flag } = await searchParams;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const [allCerts, contracts] = await Promise.all([
    prisma.insuranceCertificate.findMany({
      where: { deletedAt: null },
      include: { contractor: true, district: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.contract.findMany({
      where: { deletedAt: null },
      select: { contractorId: true, districtId: true, startsOn: true, endsOn: true },
    }),
  ]);
  const rows =
    flag === "expired" ? allCerts.filter((row) => row.expiresAt && row.expiresAt < soon) : allCerts;
  return (
    <div>
      <PageHeader
        title="Insurance"
        hint="File every certificate by contractor and district. An updated policy stays with the current one. Together, the dates need to cover the full run."
        actions={<Button href="/insurance/new">Add certificate</Button>}
      />
      {rows.length === 0 ? (
        <EmptyState title="No insurance files yet" body="Upload a certificate when it arrives." action={<Button href="/insurance/new">Add certificate</Button>} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Contractor</th>
                <th className="px-5 py-3 font-medium">District named</th>
                <th className="px-5 py-3 font-medium">Coverage</th>
                <th className="px-5 py-3 font-medium">Coverage check</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pair = allCerts.filter(
                  (cert) => cert.contractorId === r.contractorId && cert.districtId === r.districtId
                );
                const pairContracts = contracts.filter(
                  (contract) => contract.contractorId === r.contractorId && contract.districtId === r.districtId
                );
                const problem = pairContracts
                  .map((contract) =>
                    certificatesCoverContract({
                      certificates: pair,
                      contractStart: contract.startsOn,
                      contractEnd: contract.endsOn,
                      districtName: r.district.name,
                    })
                  )
                  .find((result) => result.kind === "gap" || result.kind === "missing" || result.kind === "mismatch");
                const covered = pairContracts.some((contract) => contract.startsOn || contract.endsOn);
                const chip = problem
                  ? { name: problem.label, color: "rose" as const }
                  : { name: covered ? "Covered" : "On file", color: "sage" as const };
                return (
                  <tr key={r.id} className="border-b border-line/70">
                    <td className="px-5 py-3"><Link className="text-teal" href={`/insurance/${r.id}`}>{r.contractor.legalName}</Link></td>
                    <td className="px-5 py-3">{r.district.name}</td>
                    <td className="px-5 py-3">{formatDate(r.startsOn)} – {formatDate(r.expiresAt)}</td>
                    <td className="px-5 py-3"><StatusChip name={chip.name} color={chip.color} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
