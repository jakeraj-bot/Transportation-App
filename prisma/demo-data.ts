import type { PrismaClient } from "@prisma/client";
import { ROLE_PERMISSIONS } from "../src/lib/roles";
import { schoolYearDates } from "../src/lib/utils";

export function shouldSeedDemo() {
  if (process.env.SEED_DEMO === "0") return false;
  if (process.env.SEED_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}

async function districtByName(prisma: PrismaClient, name: string) {
  const row = await prisma.district.findFirst({ where: { name, deletedAt: null } });
  if (!row) throw new Error(`Missing district ${name}`);
  return row;
}

async function ensureUser(
  prisma: PrismaClient,
  input: { name: string; email: string; role: string; passwordHash: string; districtNames?: string[] }
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name: input.name, role: input.role, active: true, deletedAt: null },
      })
    : await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash: input.passwordHash,
        },
      });
  const perms = ROLE_PERMISSIONS[input.role] ?? ["view"];
  await prisma.userPermission.deleteMany({ where: { userId: user.id } });
  await prisma.userPermission.createMany({
    data: perms.map((permissionKey) => ({ userId: user.id, permissionKey })),
  });
  if (input.districtNames?.length) {
    await prisma.userDistrict.deleteMany({ where: { userId: user.id } });
    for (const name of input.districtNames) {
      const district = await districtByName(prisma, name);
      await prisma.userDistrict.create({ data: { userId: user.id, districtId: district.id } });
    }
  }
  return user;
}

async function ensureContractor(
  prisma: PrismaClient,
  data: {
    legalName: string;
    dba?: string;
    vendorCode: string;
    ospCode: string;
    busLocation: string;
    contactName: string;
    phone: string;
    email: string;
    brcNumber: string;
  }
) {
  const existing = await prisma.contractor.findFirst({ where: { legalName: data.legalName } });
  if (existing) return existing;
  return prisma.contractor.create({
    data: {
      ...data,
      brcNameControl: data.legalName.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase(),
      brcStatus: "Valid",
      brcVerifiedAt: new Date(),
    },
  });
}

export async function seedDemo(
  prisma: PrismaClient,
  {
    adminId,
    year,
    passwordHash,
  }: { adminId: string; year: string; passwordHash: string }
) {
  await prisma.setting.upsert({
    where: { key: "demoMode" },
    update: { value: "on" },
    create: { key: "demoMode", value: "on" },
  });

  if ((await prisma.setting.findUnique({ where: { key: "demoSeeded" } }))?.value === "on") {
    return;
  }

  const tanisha = await ensureUser(prisma, {
    name: "Tanisha Williams",
    email: "tanisha@passaic.nj.us",
    role: "reviewer",
    passwordHash,
    districtNames: ["Hawthorne", "Totowa", "West Milford", "Woodland Park", "Little Falls"],
  });
  await ensureUser(prisma, {
    name: "Mary Santos",
    email: "mary@passaic.nj.us",
    role: "intake",
    passwordHash,
  });
  await ensureUser(prisma, {
    name: "Debby Chen",
    email: "debby@passaic.nj.us",
    role: "office_manager",
    passwordHash,
  });

  await prisma.userDistrict.deleteMany({ where: { userId: adminId } });
  for (const name of ["Paterson", "Clifton", "Passaic", "Wayne"]) {
    const district = await districtByName(prisma, name);
    await prisma.userDistrict.create({ data: { userId: adminId, districtId: district.id } });
  }

  const garden = await ensureContractor(prisma, {
    legalName: "Garden State Bus Company",
    dba: "Garden State Bus",
    vendorCode: "31-1008",
    ospCode: "OSP-1008",
    busLocation: "Paterson",
    contactName: "Alex Rivera",
    phone: "973-555-0142",
    email: "office@gardenstatebus.example",
    brcNumber: "2040576",
  });
  const first = await ensureContractor(prisma, {
    legalName: "First Choice Transit",
    vendorCode: "31-2214",
    ospCode: "OSP-2214",
    busLocation: "Wayne",
    contactName: "Pat Nguyen",
    phone: "973-555-0188",
    email: "dispatch@firstchoicetransit.example",
    brcNumber: "1884401",
  });
  const omar = await ensureContractor(prisma, {
    legalName: "Omar Transportation LLC",
    vendorCode: "31-3099",
    ospCode: "OSP-3099",
    busLocation: "Clifton",
    contactName: "Omar Hassan",
    phone: "973-555-0110",
    email: "omar@omartransport.example",
    brcNumber: "2040576",
  });

  const paterson = await districtByName(prisma, "Paterson");
  const clifton = await districtByName(prisma, "Clifton");
  const nresc = await districtByName(prisma, "Passaic County Educational Services Commission");
  const wayne = await districtByName(prisma, "Wayne");
  const hawthorne = await districtByName(prisma, "Hawthorne");
  const totowa = await districtByName(prisma, "Totowa");
  const westMilford = await districtByName(prisma, "West Milford");
  const littleFalls = await districtByName(prisma, "Little Falls");
  const woodland = await districtByName(prisma, "Woodland Park");
  const passaic = await districtByName(prisma, "Passaic");

  await prisma.district.update({
    where: { id: paterson.id },
    data: { email: "transportation@paterson.k12.nj.us" },
  });

  const dates = schoolYearDates(year);
  const start = dates.start ?? new Date(`${year.slice(0, 4)}-09-01`);
  const end = dates.end ?? new Date(`${Number(year.slice(0, 4)) + 1}-06-30`);

  for (const cert of [
    { contractorId: garden.id, statusName: "Approved", notes: "[Demo] Packet reviewed." },
    { contractorId: first.id, statusName: "Need review", notes: "[Demo] Waiting on Mary." },
    { contractorId: omar.id, statusName: "Not received", notes: "[Demo] Reminder needed." },
  ]) {
    await prisma.annualCert.upsert({
      where: { contractorId_schoolYear: { contractorId: cert.contractorId, schoolYear: year } },
      update: {},
      create: { ...cert, schoolYear: year },
    });
  }

  for (const ins of [
    {
      contractorId: garden.id,
      districtId: paterson.id,
      policyNumber: "GSB-26-901",
      expiresAt: new Date("2027-07-01"),
      namedDistrict: "Paterson Public Schools",
      statusName: "On file",
    },
    {
      contractorId: first.id,
      districtId: wayne.id,
      policyNumber: "FCT-26-440",
      expiresAt: new Date("2027-03-03"),
      namedDistrict: "Wayne Township",
      statusName: "Needs update",
    },
    {
      contractorId: omar.id,
      districtId: clifton.id,
      policyNumber: "OMR-26-110",
      expiresAt: new Date("2027-07-01"),
      namedDistrict: "Clifton Board of Education",
      statusName: "On file",
    },
  ]) {
    const existing = await prisma.insuranceCertificate.findFirst({
      where: { contractorId: ins.contractorId, districtId: ins.districtId, schoolYear: year, deletedAt: null },
    });
    if (!existing) {
      await prisma.insuranceCertificate.create({
        data: {
          ...ins,
          schoolYear: year,
          amount: 5000000,
          startsOn: new Date("2026-07-01"),
        },
      });
    }
  }

  const bidSpec = await prisma.bidSpec.create({
    data: {
      districtId: paterson.id,
      schoolYear: year,
      title: "Paterson special education bid specs",
      insuranceAmount: 5000000,
      bondType: "corporate",
      statusName: "Approved",
    },
  });
  const routePacket = await prisma.routeDescription.create({
    data: {
      districtId: paterson.id,
      schoolYear: year,
      kind: "bid",
      title: "John F. Kennedy High School",
      destination: "John F. Kennedy High School",
      routeNumbers: "P12, P14, P18",
      content: "ROUTE NO. P12 DESTINATION(S) John F. Kennedy High School Hours 7:30AM-2:45PM THE STARTING DATE OF THIS ROUTE IS 09/01/2026-06/30/2027",
      statusName: "Approved",
      lines: {
        create: [
          { routeNumber: "P12", destination: "John F. Kennedy High School", startTime: "7:30AM", endTime: "2:45PM", startDate: "09/01/2026", endDate: "06/30/2027", sortOrder: 0 },
          { routeNumber: "P14", destination: "John F. Kennedy High School", startTime: "7:40AM", endTime: "2:50PM", startDate: "09/01/2026", endDate: "06/30/2027", sortOrder: 1 },
          { routeNumber: "P18", destination: "John F. Kennedy High School", startTime: "8:00AM", endTime: "3:00PM", startDate: "09/01/2026", endDate: "06/30/2027", sortOrder: 2 },
        ],
      },
    },
  });
  const quotePacket = await prisma.routeDescription.create({
    data: {
      districtId: wayne.id,
      schoolYear: year,
      kind: "emergency_quote",
      title: "New Beginnings",
      destination: "New Beginnings",
      routeNumbers: "W4Q",
      content: "ROUTE NO. W4Q DESTINATION(S) New Beginnings Hours 8:00AM-3:00PM THE STARTING DATE OF THIS ROUTE IS 08/26/2026-12/04/2026",
      statusName: "Approved",
      lines: {
        create: [
          { routeNumber: "W4Q", destination: "New Beginnings", startTime: "8:00AM", endTime: "3:00PM", startDate: "08/26/2026", endDate: "12/04/2026", sortOrder: 0 },
        ],
      },
    },
  });

  const samples: Array<{
    districtId: string;
    contractorId: string;
    type: string;
    multi: string;
    status: string;
    routes: string[];
    firstReviewerId?: string;
    secondReviewStartedAt?: Date;
    sentToDistrictAt?: Date;
    hostDistrictId?: string;
    joinerDistricts?: string;
    receivedDate?: Date;
    priorYearCost?: number;
    bidSpecId?: string;
    routePacketId?: string;
    addendumRoute?: string;
  }> = [
    { districtId: paterson.id, contractorId: garden.id, type: "original", multi: "26-27-P-101", status: "Need Review", routes: ["P12", "P14", "P18"], bidSpecId: bidSpec.id },
    { districtId: clifton.id, contractorId: omar.id, type: "renewal", multi: "26-27-C-204", status: "1st review missing items", routes: ["C3", "C7"], firstReviewerId: adminId, priorYearCost: 84200 },
    { districtId: wayne.id, contractorId: first.id, type: "quote", multi: "26-27-W-088", status: "2nd review", routes: ["W4Q"], firstReviewerId: tanisha.id, secondReviewStartedAt: new Date(Date.now() - 36 * 60 * 60 * 1000), routePacketId: quotePacket.id },
    { districtId: hawthorne.id, contractorId: garden.id, type: "original", multi: "26-27-H-033", status: "Approved", routes: ["H2"], firstReviewerId: tanisha.id },
    { districtId: totowa.id, contractorId: first.id, type: "quote", multi: "26-27-T-019", status: "Disapproved", routes: ["T1Q"], firstReviewerId: adminId },
    { districtId: westMilford.id, contractorId: garden.id, type: "renewal", multi: "26-27-WM-410", status: "Final Approval", routes: ["WM8"], firstReviewerId: tanisha.id, sentToDistrictAt: new Date("2026-08-18"), priorYearCost: 61000 },
    { districtId: littleFalls.id, contractorId: omar.id, type: "original", multi: "26-27-LF-012", status: "Final Disapproval", routes: ["LF5"], firstReviewerId: adminId, sentToDistrictAt: new Date("2026-08-15") },
    { districtId: woodland.id, contractorId: first.id, type: "original", multi: "26-27-WP-055", status: "Trenton Log", routes: ["WP1", "WP2"], firstReviewerId: tanisha.id },
    { districtId: passaic.id, contractorId: garden.id, type: "joint", multi: "26-27-PA-901", status: "Sent Back to District", routes: ["PA6"], hostDistrictId: passaic.id, joinerDistricts: "Haledon" },
    { districtId: nresc.id, contractorId: garden.id, type: "joint", multi: "26-27-JA-101", status: "Need Review", routes: ["JA1"], hostDistrictId: nresc.id, joinerDistricts: "Paterson", receivedDate: new Date("2026-06-25") },
    { districtId: nresc.id, contractorId: omar.id, type: "joint", multi: "26-27-JA-102", status: "Need Review", routes: ["JA2"], hostDistrictId: nresc.id, joinerDistricts: "Paterson", receivedDate: new Date("2026-06-25") },
    { districtId: nresc.id, contractorId: first.id, type: "joint", multi: "26-27-JA-201", status: "Need Review", routes: ["JA3"], hostDistrictId: nresc.id, joinerDistricts: "Clifton", receivedDate: new Date("2026-06-25") },
    { districtId: nresc.id, contractorId: garden.id, type: "joint", multi: "26-27-JA-202", status: "Need Review", routes: ["JA4"], hostDistrictId: nresc.id, joinerDistricts: "Clifton", receivedDate: new Date("2026-06-25") },
    { districtId: nresc.id, contractorId: omar.id, type: "joint", multi: "26-27-JA-203", status: "Need Review", routes: ["JA5"], hostDistrictId: nresc.id, joinerDistricts: "Clifton", receivedDate: new Date("2026-06-25") },
    { districtId: nresc.id, contractorId: first.id, type: "joint", multi: "26-27-JA-301", status: "Need Review", routes: ["JA6"], hostDistrictId: nresc.id, joinerDistricts: "Paterson", receivedDate: new Date("2026-06-24") },
    { districtId: paterson.id, contractorId: first.id, type: "original", multi: "26-27-P-077", status: "Cancelled", routes: ["P22"], addendumRoute: "P22" },
  ];

  for (const sample of samples) {
    const existing = await prisma.contract.findFirst({
      where: { multiContractNumber: sample.multi, deletedAt: null },
    });
    if (existing) continue;
    const contract = await prisma.contract.create({
      data: {
        districtId: sample.districtId,
        contractorId: sample.contractorId,
        schoolYear: year,
        type: sample.type,
        multiContractNumber: sample.multi,
        statusName: sample.status,
        receivedDate: sample.receivedDate ?? new Date("2026-08-10"),
        boardMeetingDate: new Date("2026-07-28"),
        startsOn: start,
        endsOn: end,
        cost: 87500,
        priorYearCost: sample.priorYearCost,
        bondType: sample.type === "original" ? "corporate" : "none",
        bondAmount: sample.type === "original" ? 87500 : null,
        insuranceAmount: 5000000,
        hostDistrictId: sample.hostDistrictId,
        joinerDistricts: sample.joinerDistricts,
        bidSpecId: sample.bidSpecId,
        routePacketId: sample.routePacketId,
        firstReviewerId: sample.firstReviewerId,
        secondReviewStartedAt: sample.secondReviewStartedAt,
        sentToDistrictAt: sample.sentToDistrictAt,
        notes: "[Demo] Sample packet for training and screens.",
        routes: {
          create: sample.routes.map((number) => ({ number, destination: "Demo destination" })),
        },
      },
    });
    if (sample.multi === "26-27-P-101") {
      await prisma.contractRouteDescription.create({
        data: { contractId: contract.id, routeDescriptionId: routePacket.id },
      });
    }
    if (sample.addendumRoute) {
      const route = await prisma.route.findFirst({
        where: { contractId: contract.id, number: sample.addendumRoute },
      });
      if (route) {
        await prisma.routeAddendum.create({
          data: {
            routeId: route.id,
            reason: "Stop change",
            description: "[Demo] Added an afternoon stop at the community center.",
            receivedDate: new Date("2026-08-12"),
            boardMeetingDate: new Date("2026-08-11"),
          },
        });
      }
    }
  }

  await prisma.setting.upsert({
    where: { key: "demoSeeded" },
    update: { value: "on" },
    create: { key: "demoSeeded", value: "on" },
  });
}
