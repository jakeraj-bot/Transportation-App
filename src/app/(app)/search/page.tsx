import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { formatCompanyNames } from "@/lib/contract-intake";
import { prisma } from "@/lib/prisma";
import { textContains, textMatches } from "@/lib/text-match";

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
  const has = textContains(term);
  const [contracts, extraCompanyContracts, contractors, districts, routeRows, extraRouteRows, routeLines, routePackets] = await Promise.all([
    prisma.contract.findMany({
      where: {
        deletedAt: null,
        OR: [
          { multiContractNumber: has },
          { bidNumber: has },
          { renewalNumber: has },
          { parentName: has },
          { notes: has },
          { contractor: { legalName: has } },
        ],
      },
      include: { district: true, contractor: true, extraContractors: { include: { contractor: true } } },
      take: 20,
    }),
    prisma.contract.findMany({
      where: {
        deletedAt: null,
        extraContractors: { some: { contractor: { legalName: has } } },
      },
      include: { district: true, contractor: true, extraContractors: { include: { contractor: true } } },
      take: 20,
    }),
    prisma.contractor.findMany({
      where: {
        deletedAt: null,
        OR: [
          { legalName: has },
          { vendorCode: has },
          { dba: has },
          { ospCode: has },
          { county: has },
        ],
      },
      take: 20,
    }),
    prisma.district.findMany({
      where: { deletedAt: null, name: has },
      take: 20,
    }),
    prisma.route.findMany({
      where: { contract: { deletedAt: null } },
      select: {
        id: true,
        number: true,
        destination: true,
        contractId: true,
        contract: { select: { multiContractNumber: true, district: { select: { name: true } } } },
      },
    }),
    prisma.extraPacket.findMany({
      where: { contract: { deletedAt: null } },
      select: {
        id: true,
        routeNumber: true,
        contractId: true,
        contract: { select: { multiContractNumber: true, district: { select: { name: true } } } },
      },
    }),
    prisma.routeLine.findMany({
      select: {
        id: true,
        routeNumber: true,
        destination: true,
        packet: { select: { id: true, title: true, deletedAt: true, district: { select: { name: true } } } },
      },
    }),
    prisma.routeDescription.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true, routeNumbers: true, destination: true, district: { select: { name: true } } },
    }),
  ]);
  const routeHits: Array<{ key: string; href: string; label: string; detail: string; contractId?: string }> = [];
  for (const route of routeRows) {
    if (!textMatches(route.number, term) && !textMatches(route.destination, term)) continue;
    routeHits.push({
      key: `route-${route.id}`,
      href: `/contracts/${route.contractId}/routes/${route.id}`,
      label: `Route ${route.number}`,
      detail: [route.contract.multiContractNumber, route.contract.district.name, route.destination].filter(Boolean).join(" · "),
      contractId: route.contractId,
    });
  }
  for (const packet of extraRouteRows) {
    if (!textMatches(packet.routeNumber, term)) continue;
    routeHits.push({
      key: `extra-${packet.id}`,
      href: `/contracts/${packet.contractId}`,
      label: `Route ${packet.routeNumber}`,
      detail: [packet.contract.multiContractNumber, packet.contract.district.name].filter(Boolean).join(" · "),
      contractId: packet.contractId,
    });
  }
  for (const line of routeLines) {
    if (line.packet.deletedAt) continue;
    if (!textMatches(line.routeNumber, term) && !textMatches(line.destination, term)) continue;
    routeHits.push({
      key: `line-${line.id}`,
      href: `/route-descriptions/${line.packet.id}`,
      label: `Route ${line.routeNumber}`,
      detail: [line.packet.title, line.packet.district.name, line.destination].filter(Boolean).join(" · "),
    });
  }
  const shownPackets = new Set(routeHits.filter((hit) => hit.key.startsWith("line-")).map((hit) => hit.href));
  for (const packet of routePackets) {
    const href = `/route-descriptions/${packet.id}`;
    if (shownPackets.has(href)) continue;
    if (!textMatches(packet.routeNumbers, term) && !textMatches(packet.title, term) && !textMatches(packet.destination, term)) continue;
    routeHits.push({
      key: `desc-${packet.id}`,
      href,
      label: packet.routeNumbers ? `Routes ${packet.routeNumbers}` : packet.title,
      detail: [packet.title, packet.district.name, packet.destination].filter(Boolean).join(" · "),
    });
  }
  const routes = routeHits.slice(0, 20);
  const routeContractIds = [...new Set(routes.map((hit) => hit.contractId).filter((id): id is string => Boolean(id)))];
  const contractsFromRoutes = routeContractIds.length
    ? await prisma.contract.findMany({
        where: { deletedAt: null, id: { in: routeContractIds } },
        include: { district: true, contractor: true, extraContractors: { include: { contractor: true } } },
      })
    : [];
  const contractMap = new Map([...contracts, ...extraCompanyContracts, ...contractsFromRoutes].map((row) => [row.id, row]));
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
        {routes.length === 0 ? <p className="text-muted">None</p> : routes.map((route) => (
          <p key={route.key}><Link className="text-teal" href={route.href}>{route.label}</Link>{route.detail ? ` · ${route.detail}` : ""}</p>
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
