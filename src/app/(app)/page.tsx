import Link from "next/link";
import { Button, Card, PageHeader, StatusChip } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getSchoolYear, getSetting, getStatuses } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { hoursInSecondReview, insuranceCoverage } from "@/lib/flags";
import { parseHomePrefs, type HomeTileKey } from "@/lib/home-prefs";
import { statusFillStyle } from "@/lib/status-color";
import { formatDate } from "@/lib/utils";

const HOME_STATUSES = [
  { name: "Need Review", label: "Need review", color: "amber" },
  { name: "1st review missing items", label: "1st review missing", color: "blue" },
  { name: "2nd review", label: "2nd review", color: "teal" },
  { name: "Approved", label: "Approved", color: "sage" },
  { name: "Disapproved", label: "Disapproved", color: "rose" },
  { name: "Final Approval", label: "Final approved", color: "sage" },
  { name: "Final Disapproval", label: "Final disapproved", color: "rose" },
  { name: "Trenton Log", label: "Trenton log", color: "plum" },
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const [schoolYear, session, alertOn, alertHoursRaw, dbStatuses] = await Promise.all([
    getSchoolYear(),
    getSession(),
    getSetting("secondReviewAlertOn", "off"),
    getSetting("secondReviewAlertHours", "48"),
    getStatuses("contract"),
  ]);
  const statusColor = Object.fromEntries(dbStatuses.map((row) => [row.name, row.color]));
  const alertHours = Number(alertHoursRaw) || 48;
  const assigned = session?.districtIds ?? [];
  const showMine = Boolean(assigned.length) && view !== "all";
  const districtFilter = showMine ? { districtId: { in: assigned } } : {};
  const me = session ? await prisma.user.findUnique({ where: { id: session.id } }) : null;
  const prefs = parseHomePrefs(me?.homePrefs);
  const compact = prefs.layout === "compact";

  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const whereYear = { deletedAt: null, schoolYear, ...districtFilter };

  const [statusCounts, total, late, quotes, expiredIns, openCerts, missing, secondReview, recent] =
    await Promise.all([
      Promise.all(
        HOME_STATUSES.map(async (status) => ({
          ...status,
          color: statusColor[status.name] || status.color,
          count: await prisma.contract.count({ where: { ...whereYear, statusName: status.name } }),
        }))
      ),
      prisma.contract.count({ where: whereYear }),
      prisma.contract.count({ where: { ...whereYear, rationaleNeeded: true } }),
      prisma.contract.count({ where: { ...whereYear, nextMeetingFlag: true } }),
      prisma.insuranceCertificate.count({
        where: { deletedAt: null, OR: [{ expiresAt: { lt: now } }, { expiresAt: { lt: soon } }] },
      }),
      prisma.annualCert.count({
        where: { deletedAt: null, schoolYear, statusName: { not: "Approved" } },
      }),
      prisma.contract.count({
        where: { ...whereYear, statusName: "1st review missing items" },
      }),
      prisma.contract.findMany({
        where: { ...whereYear, statusName: "2nd review" },
        include: { district: true, contractor: true, firstReviewer: true },
        orderBy: { secondReviewStartedAt: "asc" },
      }),
      prisma.contract.findMany({
        where: whereYear,
        include: { district: true, contractor: true },
        orderBy: { updatedAt: "desc" },
        take: compact ? 5 : 8,
      }),
    ]);

  const gapCount = await countInsuranceGaps(schoolYear);
  const overdueSecond = secondReview.filter(
    (c) => hoursInSecondReview(c.secondReviewStartedAt) >= alertHours
  );

  const tiles: Array<{ key: HomeTileKey; href: string; label: string; value: number; hint: string }> = [
    { key: "secondReview", href: "/contracts?status=2nd%20review", label: "Waiting on 2nd review", value: secondReview.length, hint: "First review is done. These need the other reviewer." },
    { key: "rationale", href: "/contracts?flag=late", label: "Need a rationale letter", value: late, hint: "Received 30 or more days after the board meeting" },
    { key: "quotes", href: "/contracts?flag=meeting", label: "Quote timing flags", value: quotes, hint: "Board may have waited past the next meeting" },
    { key: "insurance", href: "/insurance?flag=expired", label: "Insurance to update", value: expiredIns + gapCount, hint: "Expired, expiring, or does not cover the full contract" },
    { key: "certs", href: "/certs", label: "Certs not approved yet", value: openCerts, hint: `Due August 15 for ${schoolYear}` },
    { key: "missing", href: "/contracts?status=1st%20review%20missing%20items", label: "1st review missing items", value: missing, hint: "PT-4 sent or packet still needs fixing" },
  ];
  const visibleTiles = tiles.filter((tile) => !prefs.hiddenTiles.includes(tile.key));

  return (
    <div className={`home-screen ${compact ? "home-compact" : ""}`}>
      <PageHeader
        title="What needs attention today"
        hint={showMine
          ? "Showing contracts for your assigned districts. Use View all to see the rest of the office."
          : "These counts are for the current school year unless noted. Change layout and colors under Settings."}
        actions={
          <>
            {assigned.length ? (
              <Button href={showMine ? "/?view=all" : "/"} variant="secondary" className="btn-view-all">
                {showMine ? "View all contracts" : "View my districts"}
              </Button>
            ) : null}
            <Button href="/contracts/new" className="btn-new-contract">New contract</Button>
            <Button href="/certs/new" variant="secondary" className="btn-new-cert">New annual cert</Button>
          </>
        }
      />

      {prefs.showStatusBar ? (
        <div className="mb-6 flex w-full gap-2 overflow-x-auto lg:overflow-visible">
          {statusCounts.map((status) => (
            <Link
              key={status.name}
              href={`/contracts?status=${encodeURIComponent(status.name)}`}
              className="home-stat flex w-24 shrink-0 flex-col items-center justify-center rounded-xl px-1.5 py-2 text-center lg:w-auto lg:min-w-0 lg:flex-1"
              style={statusFillStyle(status.color)}
            >
              <span className="text-xl font-semibold leading-none">{status.count}</span>
              <span className="mt-1 text-[10px] leading-tight opacity-95 sm:text-[11px]">{status.label}</span>
            </Link>
          ))}
          <Link href="/contracts" className="home-stat flex w-24 shrink-0 flex-col items-center justify-center rounded-xl px-1.5 py-2 text-center stat-navy lg:w-auto lg:min-w-0 lg:flex-1">
            <span className="text-xl font-semibold leading-none">{total}</span>
            <span className="mt-1 text-[10px] leading-tight opacity-95 sm:text-[11px]">Total contracts</span>
          </Link>
        </div>
      ) : null}

      {alertOn === "on" && overdueSecond.length ? (
        <Card className="mb-6 bg-amber-soft">
          <p className="font-medium">
            {overdueSecond.length} contract{overdueSecond.length === 1 ? "" : "s"} {overdueSecond.length === 1 ? "has" : "have"} been in 2nd review longer than {alertHours} hours.
          </p>
          <p className="mt-1 text-sm text-muted">Turn this alert off in Settings if you do not want it on the Home screen.</p>
        </Card>
      ) : null}

      {prefs.showAttentionTiles ? (
        <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${compact ? "gap-3" : ""}`}>
          {visibleTiles.map((tile) => (
            <Link key={tile.label} href={tile.href}>
              <Card className={`home-tile h-full hover:ring-2 hover:ring-teal/20 ${compact ? "p-4" : ""}`}>
                <p className="text-sm text-muted">{tile.label}</p>
                <p className={`serif mt-1 ${compact ? "text-3xl" : "text-4xl"}`}>{tile.value}</p>
                {compact ? null : <p className="mt-2 text-sm text-muted">{tile.hint}</p>}
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {prefs.showSecondReview ? (
        <div className="mt-8">
          <h2 className="serif mb-3 text-2xl">Contracts in 2nd review</h2>
          {secondReview.length === 0 ? (
            <Card>
              <p className="text-muted">Nothing is waiting on a second review right now.</p>
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-left">
                <thead className="border-b border-line text-sm text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Multi-contract</th>
                    <th className="px-5 py-3 font-medium">District</th>
                    <th className="px-5 py-3 font-medium">First reviewer</th>
                    <th className="px-5 py-3 font-medium">Waiting</th>
                  </tr>
                </thead>
                <tbody>
                  {secondReview.map((c) => {
                    const hours = hoursInSecondReview(c.secondReviewStartedAt);
                    const waiting = hours >= 24 ? `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h` : `${Math.max(1, Math.round(hours))}h`;
                    return (
                      <tr key={c.id} className="border-b border-line/70 last:border-0">
                        <td className="px-5 py-3">
                          <Link className="text-teal hover:underline" href={`/contracts/${c.id}`}>
                            {c.multiContractNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3">{c.district.name}</td>
                        <td className="px-5 py-3">{c.firstReviewer?.name ?? "—"}</td>
                        <td className="px-5 py-3">{waiting}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ) : null}

      {prefs.showRecent ? (
        <div className="mt-8">
          <h2 className="serif mb-3 text-2xl">Recently updated contracts</h2>
          {recent.length === 0 ? (
            <Card>
              <p className="text-muted">No contracts yet. Click New contract to enter the first one.</p>
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-left">
                <thead className="border-b border-line text-sm text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Multi-contract</th>
                    <th className="px-5 py-3 font-medium">District</th>
                    <th className="px-5 py-3 font-medium">Contractor</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-3">
                        <Link className="text-teal hover:underline" href={`/contracts/${c.id}`}>
                          {c.multiContractNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">{c.district.name}</td>
                      <td className="px-5 py-3">{c.contractor.legalName}</td>
                      <td className="px-5 py-3"><StatusChip name={c.statusName} color={statusColor[c.statusName]} /></td>
                      <td className="px-5 py-3 text-muted">{formatDate(c.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}

async function countInsuranceGaps(schoolYear: string) {
  const contracts = await prisma.contract.findMany({
    where: { deletedAt: null, schoolYear, startsOn: { not: null }, endsOn: { not: null } },
    select: { contractorId: true, districtId: true, startsOn: true, endsOn: true, district: { select: { name: true } } },
  });
  const certs = await prisma.insuranceCertificate.findMany({
    where: { deletedAt: null },
  });
  let gaps = 0;
  for (const contract of contracts) {
    const cert = certs.find(
      (c) => c.contractorId === contract.contractorId && c.districtId === contract.districtId
    );
    const result = insuranceCoverage({
      insStart: cert?.startsOn,
      insEnd: cert?.expiresAt,
      contractStart: contract.startsOn,
      contractEnd: contract.endsOn,
      namedDistrict: cert?.namedDistrict,
      districtName: contract.district.name,
    });
    if (result.kind === "gap" || result.kind === "missing") gaps += 1;
  }
  return gaps;
}
