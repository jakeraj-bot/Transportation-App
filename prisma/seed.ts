import bcrypt from "bcryptjs";
import { PERMISSIONS } from "../src/lib/permissions";
import { CONTRACT_STATUSES } from "../src/lib/roles";
import { currentSchoolYear } from "../src/lib/utils";
import { prisma } from "../src/lib/prisma";
import { seedDemo, shouldSeedDemo } from "./demo-data";

const DISTRICTS = [
  "Bloomingdale",
  "Clifton",
  "Haledon",
  "Hawthorne",
  "Lakeland Regional",
  "Little Falls",
  "Manchester Regional",
  "North Haledon",
  "Passaic",
  "Passaic County Vocational (PCTI)",
  "Passaic County Educational Services Commission",
  "Passaic Valley Regional",
  "Paterson",
  "Pompton Lakes",
  "Prospect Park",
  "Ringwood",
  "Totowa",
  "Wanaque",
  "Wayne",
  "West Milford",
  "Woodland Park",
];

const ENTITY_STATUSES: Record<string, Array<[string, string]>> = {
  contract: CONTRACT_STATUSES.map((s) => [s.name, s.color]),
  cert: [
    ["Not received", "rose"],
    ["Need review", "amber"],
    ["Pending documents or changes", "blue"],
    ["Approved", "sage"],
    ["Disapproved", "rose"],
  ],
  bid_spec: [
    ["Need review", "amber"],
    ["Pending documents or changes", "blue"],
    ["Approved", "sage"],
    ["Disapproved", "rose"],
  ],
  route_description: [
    ["Need review", "amber"],
    ["Pending documents or changes", "blue"],
    ["Approved", "sage"],
    ["Disapproved", "rose"],
  ],
  emergency_quote: [
    ["Need review", "amber"],
    ["Pending documents or changes", "blue"],
    ["Approved", "sage"],
    ["Disapproved", "rose"],
  ],
  insurance: [
    ["On file", "sage"],
    ["Needs update", "amber"],
  ],
};

const CHECKLISTS: Array<{
  entityType: string;
  contractType?: string;
  name: string;
  items: string[];
}> = [
  {
    entityType: "contract",
    contractType: "original",
    name: "Original / bid contract",
    items: [
      "PT-1 form",
      "Bid specifications",
      "Approved route description on file and linked",
      "Certified board minutes (contractor, routes, and costs)",
      "Summary of all bids received",
      "Newspaper bid advertisement",
      "Insurance certificate naming this district",
      "Consent of surety",
      "Bidder's guarantee",
      "Performance bond with multi-contract or route numbers",
      "Affirmative action material",
      "Stockholder / ownership disclosure",
      "Non-collusion statement",
      "Bid sheet of successful bidder",
      "Business registration certificate",
      "Investment activities in Iran disclosure",
      "If not lowest bidder: board attorney statement",
    ],
  },
  {
    entityType: "contract",
    contractType: "renewal",
    name: "Renewal contract",
    items: [
      "PT-1 form",
      "Certified board minutes",
      "Insurance certificate naming this district",
      "Performance bond",
      "Affirmative action material",
      "Original was competitively bid",
      "Increase does not exceed CPI (unless bid-allowed aide, route change, or safety)",
      "School destination is the same as the original",
    ],
  },
  {
    entityType: "contract",
    contractType: "quote",
    name: "Quoted / emergency contract",
    items: [
      "PT-1 form",
      "Certified board minutes",
      "Insurance certificate naming this district",
      "Performance bond (if required)",
      "Evidence of three quotes",
      "Business registration certificate",
      "Emergency quote approved and linked",
      "Board acted at the next meeting after the quote",
    ],
  },
  {
    entityType: "contract",
    contractType: "parental",
    name: "Parental contract",
    items: [
      "PT-1 form",
      "Certified board minutes",
      "Parent automobile insurance",
      "Copy of a valid driver's license",
      "Copy of current vehicle registration",
    ],
  },
  {
    entityType: "contract",
    contractType: "addendum",
    name: "Contract addendum",
    items: [
      "PT-1 / addendum form",
      "Certified board minutes authorizing the adjustment",
      "Additional performance bond if the cost increased",
      "Adjustment follows the original bid (per mile / per student / per vehicle)",
    ],
  },
  {
    entityType: "contract",
    contractType: "joint",
    name: "Joint transportation agreement",
    items: [
      "Commissioner joint agreement form",
      "Host district certified minutes",
      "Joiner district certified minutes",
      "PT-1 form",
      "Host insurance or host contract on file",
    ],
  },
  {
    entityType: "cert",
    name: "Annual certification",
    items: [
      "Annual certification transmittal with contractor / vendor code",
      "Packet received by August 15",
      "Driver and aide packets complete (kept in paper file)",
      "Contractor is not debarred",
    ],
  },
  {
    entityType: "bid_spec",
    name: "Bid specification review",
    items: [
      "Submitted before advertisement",
      "Insurance limits are stated",
      "Bond type and amount are stated",
      "Route descriptions are included",
      "Adjustment / increase-decrease clause is included",
      "Business registration certificate is required",
    ],
  },
  {
    entityType: "route_description",
    name: "Route description review",
    items: [
      "Each route has a number (ROUTE NO.)",
      "Destination is stated",
      "Hours / start and end time are stated",
      "THE STARTING DATE OF THIS ROUTE IS is filled in",
      "Stops and schedule are described",
      "Vehicle capacity is stated where required",
    ],
  },
  {
    entityType: "emergency_quote",
    name: "Emergency quote review",
    items: [
      "Service was unanticipated",
      "Three quotes were sought",
      "Quoted on a per diem basis",
      "Amount compared to the bid threshold",
    ],
  },
];

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label },
      create: { key: p.key, label: p.label },
    });
  }

  const passwordHash = await bcrypt.hash("Passaic2026!", 10);
  const existing =
    (await prisma.user.findUnique({ where: { email: "jjacobs@doe.nj.gov" } })) ??
    (await prisma.user.findUnique({ where: { email: "jakera@passaic.nj.us" } }));
  const admin = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name: "Jakera Jacobs", email: "jjacobs@doe.nj.gov", passwordHash, role: "super_admin", active: true, deletedAt: null },
      })
    : await prisma.user.create({
        data: {
          name: "Jakera Jacobs",
          email: "jjacobs@doe.nj.gov",
          passwordHash,
          role: "super_admin",
        },
      });
  for (const p of PERMISSIONS) {
    await prisma.userPermission.upsert({
      where: { userId_permissionKey: { userId: admin.id, permissionKey: p.key } },
      update: {},
      create: { userId: admin.id, permissionKey: p.key },
    });
  }

  for (const [entityType, rows] of Object.entries(ENTITY_STATUSES)) {
    let order = 0;
    for (const [name, color] of rows) {
      await prisma.status.upsert({
        where: { entityType_name: { entityType, name } },
        update: { color, sortOrder: order },
        create: { entityType, name, color, sortOrder: order },
      });
      order += 1;
    }
  }

  await prisma.contract.updateMany({
    where: { statusName: "Need review" },
    data: { statusName: "Need Review" },
  });
  await prisma.contract.updateMany({
    where: { statusName: "Pending documents or changes" },
    data: { statusName: "1st review missing items" },
  });
  await prisma.status.updateMany({
    where: {
      entityType: "contract",
      name: { in: ["Need review", "Pending documents or changes"] },
    },
    data: { deletedAt: new Date() },
  });

  for (const name of DISTRICTS) {
    const existing = await prisma.district.findFirst({ where: { name, deletedAt: null } });
    if (!existing) {
      await prisma.district.create({
        data: { name, email: "" },
      });
    }
  }

  if ((await prisma.checklistTemplate.count()) === 0) {
    for (const list of CHECKLISTS) {
      await prisma.checklistTemplate.create({
        data: {
          entityType: list.entityType,
          contractType: list.contractType ?? null,
          name: list.name,
          items: {
            create: list.items.map((label, sortOrder) => ({ label, sortOrder })),
          },
        },
      });
    }
  }

  const year = currentSchoolYear();
  const settings: Record<string, string> = {
    schoolYear: year,
    cpi: "2.50",
    bidThreshold: "7500",
    officeName: "Passaic County Superintendent of Schools",
    officeEmail: "transportation@passaic.nj.us",
    secondReviewAlertOn: "off",
    secondReviewAlertHours: "48",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  if (shouldSeedDemo()) {
    await seedDemo(prisma, { adminId: admin.id, year, passwordHash });
    console.log("Seeded the local demo office.");
    console.log("Sign in: jjacobs@doe.nj.gov  /  Passaic2026!");
    console.log("Other demo logins use the same password: tanisha@passaic.nj.us, mary@passaic.nj.us, debby@passaic.nj.us");
  } else {
    await prisma.setting.upsert({
      where: { key: "demoMode" },
      update: { value: "off" },
      create: { key: "demoMode", value: "off" },
    });
    console.log("Seeded an empty office. Add real contracts after you sign in.");
    console.log("Sign in: jjacobs@doe.nj.gov  /  Passaic2026!");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
