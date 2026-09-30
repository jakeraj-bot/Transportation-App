import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { formatCompanyNames } from "@/lib/contract-intake";
import { prisma } from "@/lib/prisma";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  if (!term) {
    return <PageHeader title="Search" backHref="/" hint="Type a district, contractor, parent name, multi-contract number, or route number." />;
  }
  const [contracts, extraCompanyContracts, contractors, districts, routes] = await Promise.all([
    prisma.contract.findMany({
      where: {
        deletedAt: null,
        OR: [
          { multiContractNumber: { contains: term } },
          { bidNumber: { contains: term } },
          { renewalNumber: { contains: term } },
          { parentName: { contains: term } },
          { notes: { contains: term } },
          { contractor: { legalName: { contains: term } } },
        ],
      },
      include: { district: true, contractor: true, extraContractors: { include: { contractor: true } } },
      take: 20,
    }),
    prisma.contract.findMany({
      where: {
        deletedAt: null,
        extraContractors: { some: { contractor: { legalName: { contains: term } } } },
      },
      include: { district: true, contractor: true, extraContractors: { include: { contractor: true } } },
      take: 20,
    }),
    prisma.contractor.findMany({
      where: {
        deletedAt: null,
        OR: [
          { legalName: { contains: term } },
          { vendorCode: { contains: term } },
          { dba: { contains: term } },
          { ospCode: { contains: term } },
          { county: { contains: term } },
        ],
      },
      take: 20,
    }),
    prisma.district.findMany({
      where: { deletedAt: null, name: { contains: term } },
      take: 20,
    }),
    prisma.route.findMany({
      where: { number: { contains: term } },
      include: { contract: { include: { district: true } } },
      take: 20,
    }),
  ]);
  const contractMap = new Map([...contracts, ...extraCompanyContracts].map((row) => [row.id, row]));
  const contractRows = [...contractMap.values()];
  return (
    <div className="space-y-6">
      <PageHeader title={`Results for “${term}”`} backHref="/" />
      <Card>
        <h2 className="serif mb-2 text-2xl">Contracts</h2>
        {contractRows.length === 0 ? <p className="text-muted">None</p> : contractRows.map((c) => (
          <p key={c.id}>
            <Link className="text-teal" href={`/contracts/${c.id}`}>{c.multiContractNumber}</Link>
            {" · "}
            {c.district.name}
            {" · "}
            {formatCompanyNames([
              c.parentName || c.contractor.legalName,
              ...c.extraContractors.map((link) => link.contractor.legalName),
            ])}
          </p>
        ))}
      </Card>
      <Card>
        <h2 className="serif mb-2 text-2xl">Routes</h2>
        {routes.length === 0 ? <p className="text-muted">None</p> : routes.map((r) => (
          <p key={r.id}><Link className="text-teal" href={`/contracts/${r.contractId}`}>Route {r.number}</Link> · {r.contract.multiContractNumber} · {r.contract.district.name}</p>
        ))}
      </Card>
      <Card>
        <h2 className="serif mb-2 text-2xl">Contractors</h2>
        {contractors.length === 0 ? <p className="text-muted">None</p> : contractors.map((c) => (
          <p key={c.id}><Link className="text-teal" href={`/contractors/${c.id}`}>{c.legalName}</Link>{c.county ? ` · ${c.county}` : ""}</p>
        ))}
      </Card>
      <Card>
        <h2 className="serif mb-2 text-2xl">Districts</h2>
        {districts.length === 0 ? <p className="text-muted">None</p> : districts.map((d) => (
          <p key={d.id}><Link className="text-teal" href={`/districts/${d.id}`}>{d.name}</Link></p>
        ))}
      </Card>
    </div>
  );
}
