import Link from "next/link";
import { Button, Card, EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { insuranceCoverage } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function InsurancePage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string }>;
}) {
  const { flag } = await searchParams;
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const rows = await prisma.insuranceCertificate.findMany({
    where: {
      deletedAt: null,
      ...(flag === "expired"
        ? { OR: [{ expiresAt: { lt: now } }, { expiresAt: { lt: soon } }] }
        : {}),
    },
    include: { contractor: true, district: true },
    orderBy: { expiresAt: "asc" },
  });
  return (
    <div>
      <PageHeader
        title="Insurance"
        hint="File certificates by contractor and district. One cert can cover every contract they have together if the dates cover the full run."
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
                const st = insuranceCoverage({
                  insStart: r.startsOn,
                  insEnd: r.expiresAt,
                  namedDistrict: r.namedDistrict,
                  districtName: r.district.name,
                });
                return (
                  <tr key={r.id} className="border-b border-line/70">
                    <td className="px-5 py-3"><Link className="text-teal" href={`/insurance/${r.id}`}>{r.contractor.legalName}</Link></td>
                    <td className="px-5 py-3">{r.district.name}</td>
                    <td className="px-5 py-3">{formatDate(r.startsOn)} – {formatDate(r.expiresAt)}</td>
                    <td className="px-5 py-3"><StatusChip name={st.kind === "covers" ? "On file" : st.label} color={st.kind === "covers" ? "sage" : "rose"} /></td>
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
