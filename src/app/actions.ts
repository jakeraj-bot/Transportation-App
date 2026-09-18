"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { can, requireSession, requireSuperAdmin } from "@/lib/auth";
import { isSuperAdmin, ROLE_PERMISSIONS } from "@/lib/roles";
import { ALL_PERMISSION_KEYS, ensurePermissions } from "@/lib/permissions";
import { parseHomePrefs } from "@/lib/home-prefs";
import { sanitizeStatusColor } from "@/lib/status-color";
import { parseRoutePacket } from "@/lib/extract-routes";
import { writeAudit } from "@/lib/audit";
import { ensureChecklist, getSchoolYear, getSetting, refreshContractFlags } from "@/lib/data";
import {
  contractTypeLabel,
  letterTemplateLookups,
  nameControlFrom,
  normalizeSchoolYear,
  parseDate,
  parseMoney,
  parsePercent,
  schoolYearDates,
  splitRoutes,
} from "@/lib/utils";
import { parseReviewerChoice } from "@/lib/reviewers";
import {
  describeSpreadsheet,
  mapContractType,
  parseCsvText,
  parseFlexibleDate,
  parseSpreadsheetFile,
} from "@/lib/import-records";
import { matchNjCounty, resolveCertCounty } from "@/lib/nj-counties";
import { buildLabelPdf, mergePdfs, type LabelKind } from "@/lib/labels";
import {
  contractLetterFields,
  defaultLetterDocx,
  fillDocx,
  zipFiles,
  type DistrictAddressInput,
} from "@/lib/docx";
import { groupByLetter } from "@/lib/letter-groups";
import { readStoredFile, saveStoredFile } from "@/lib/storage";
import { sendOutlookMail } from "@/lib/email";
import { extractBidSpec, fileToText } from "@/lib/extract-bid-spec";
import {
  formatCompanyNames,
  intakeTypeLabel,
  parsePacketRows,
  primaryAndExtraPackets,
  usesHostJoiner,
  usesParentName,
} from "@/lib/contract-intake";

function formString(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function isUniqueConflict(err: unknown) {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002");
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function canEditDistricts(user: { role: string; permissions: string[] }) {
  return isSuperAdmin(user.role) || user.permissions.includes("edit_districts");
}

export async function saveDistrict(form: FormData) {
  const user = await requireSession();
  if (!canEditDistricts(user)) throw new Error("You do not have permission to change district information.");
  const id = formString(form, "id");
  const data = {
    name: formString(form, "name"),
    code: formString(form, "code") || null,
    email: formString(form, "email") || null,
    phone: formString(form, "phone") || null,
    contactName: formString(form, "contactName") || null,
    contactPosition: formString(form, "contactPosition") || null,
    street: formString(form, "street") || null,
    city: formString(form, "city") || null,
    state: formString(form, "state") || null,
    zip: formString(form, "zip") || null,
    addressBlock: formString(form, "addressBlock") || null,
    notes: formString(form, "notes") || null,
    county: matchNjCounty(formString(form, "county") || null),
  };
  const row = id
    ? await prisma.district.update({ where: { id }, data })
    : await prisma.district.create({ data });
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "district",
    entityId: row.id,
    summary: `${id ? "Updated" : "Added"} district ${row.name}`,
  });
  revalidateAll();
  const returnTo = formString(form, "returnTo");
  redirect(returnTo === "/districts" ? "/districts" : `/districts/${row.id}`);
}

export async function saveContractor(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const data = {
    legalName: formString(form, "legalName"),
    dba: formString(form, "dba") || null,
    vendorCode: formString(form, "vendorCode") || null,
    ospCode: formString(form, "ospCode") || null,
    busLocation: formString(form, "busLocation") || null,
    contactName: formString(form, "contactName") || null,
    email: formString(form, "email") || null,
    phone: formString(form, "phone") || null,
    brcNumber: formString(form, "brcNumber") || null,
    brcNameControl:
      formString(form, "brcNameControl") || nameControlFrom(formString(form, "legalName")) || null,
    brcStatus: formString(form, "brcStatus") || "Not on file",
    brcVerifiedAt: form.get("markVerified") ? new Date() : undefined,
    debarred: form.get("debarred") === "on",
    county: matchNjCounty(formString(form, "county") || null),
    incomplete: false,
    notes: formString(form, "notes") || null,
  };
  const row = id
    ? await prisma.contractor.update({ where: { id }, data })
    : await prisma.contractor.create({
        data: { ...data, brcVerifiedAt: data.brcVerifiedAt ?? null },
      });
  if (row.county) {
    await prisma.annualCert.updateMany({
      where: { contractorId: row.id, county: "" },
      data: { county: row.county },
    });
  }
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "contractor",
    entityId: row.id,
    summary: `${id ? "Updated" : "Added"} contractor ${row.legalName}`,
  });
  revalidateAll();
  redirect(`/contractors/${row.id}`);
}

export async function addQuickDistrict(name: string, county?: string) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter the district name.");
  const existing = await prisma.district.findFirst({ where: { name: trimmed, deletedAt: null } });
  if (existing) {
    return { id: existing.id, name: existing.name, county: existing.county };
  }
  const row = await prisma.district.create({
    data: {
      name: trimmed,
      email: "",
      county: matchNjCounty(county || null) || "Passaic",
    },
  });
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "district",
    entityId: row.id,
    summary: `Added district ${row.name}${row.county && row.county !== "Passaic" ? ` (${row.county})` : ""}`,
  });
  revalidateAll();
  return { id: row.id, name: row.name, county: row.county };
}

export async function addQuickReviewerName(name: string) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter the reviewer name.");
  const existing = await prisma.reviewerName.findFirst({ where: { name: trimmed, deletedAt: null } });
  if (existing) return { name: existing.name };
  const row = await prisma.reviewerName.create({ data: { name: trimmed } });
  revalidateAll();
  return { name: row.name };
}

export async function addQuickContractor(legalName: string, county?: string) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const name = legalName.trim();
  if (!name) throw new Error("Enter the contractor’s name.");
  const row = await prisma.contractor.create({
    data: {
      legalName: name,
      incomplete: true,
      brcStatus: "Not on file",
      brcNameControl: nameControlFrom(name) || null,
      county: matchNjCounty(county || null),
    },
  });
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "contractor",
    entityId: row.id,
    summary: `Added contractor name ${row.legalName} (details still needed)`,
  });
  revalidateAll();
  return { id: row.id, legalName: row.legalName, incomplete: true };
}

async function syncRoutes(contractId: string, numbers: string[]) {
  const existing = await prisma.route.findMany({
    where: { contractId },
    include: { addenda: true },
  });
  const wanted = new Set(numbers);
  for (const route of existing) {
    if (wanted.has(route.number)) continue;
    if (route.addenda.length > 0 || route.cancelledAt) continue;
    await prisma.route.delete({ where: { id: route.id } });
  }
  for (const number of numbers) {
    if (!existing.some((r) => r.number === number)) {
      await prisma.route.create({ data: { contractId, number } });
    }
  }
}

export async function addContractRoutes(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const contractId = formString(form, "contractId");
  const numbers = splitRoutes(formString(form, "routes"));
  if (!contractId) throw new Error("That contract is missing.");
  if (!numbers.length) throw new Error("Enter at least one route number.");
  const contract = await prisma.contract.findFirst({ where: { id: contractId, deletedAt: null } });
  if (!contract) throw new Error("That contract is no longer on file.");
  const existing = await prisma.route.findMany({ where: { contractId } });
  const added: string[] = [];
  for (const number of numbers) {
    if (existing.some((route) => route.number === number)) continue;
    await prisma.route.create({ data: { contractId, number } });
    added.push(number);
  }
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "contract",
    entityId: contractId,
    summary: added.length
      ? `Added route${added.length === 1 ? "" : "s"} ${added.join(", ")} to ${contract.multiContractNumber}`
      : `No new routes added to ${contract.multiContractNumber}`,
  });
  revalidateAll();
  redirect(`/contracts/${contractId}?routesAdded=1`);
}

export async function cancelContractRoute(form: FormData) {
  const user = await requireSession();
  if (!can(user, "edit")) throw new Error("You do not have permission.");
  const contractId = formString(form, "contractId");
  const routeId = formString(form, "routeId");
  const route = await prisma.route.findFirst({
    where: { id: routeId, contractId },
    include: { contract: true },
  });
  if (!route) throw new Error("That route is no longer on file.");
  await prisma.route.update({
    where: { id: route.id },
    data: {
      cancelledAt: parseDate(formString(form, "cancelledAt")) || parseFlexibleDate(formString(form, "cancelledAt")) || new Date(),
      cancelNote: formString(form, "cancelNote") || null,
    },
  });
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "contract",
    entityId: contractId,
    summary: `Cancelled route ${route.number} on ${route.contract.multiContractNumber}`,
  });
  revalidateAll();
  redirect(`/contracts/${contractId}?routeCancelled=${encodeURIComponent(route.number)}`);
}

export async function restoreContractRoute(form: FormData) {
  const user = await requireSession();
  if (!can(user, "edit")) throw new Error("You do not have permission.");
  const contractId = formString(form, "contractId");
  const routeId = formString(form, "routeId");
  const route = await prisma.route.findFirst({
    where: { id: routeId, contractId },
    include: { contract: true },
  });
  if (!route) throw new Error("That route is no longer on file.");
  await prisma.route.update({
    where: { id: route.id },
    data: { cancelledAt: null, cancelNote: null },
  });
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "contract",
    entityId: contractId,
    summary: `Restored route ${route.number} on ${route.contract.multiContractNumber}`,
  });
  revalidateAll();
  redirect(`/contracts/${contractId}?routeRestored=${encodeURIComponent(route.number)}`);
}

async function syncExtraPackets(
  contractId: string,
  packets: Array<{ multiContractNumber: string; routeNumber: string; renewalNumber?: string }>
) {
  await prisma.extraPacket.deleteMany({ where: { contractId } });
  const rows = packets.filter((p) => p.multiContractNumber && p.routeNumber);
  if (!rows.length) return;
  await prisma.extraPacket.createMany({
    data: rows.map((packet, sortOrder) => ({
      contractId,
      multiContractNumber: packet.multiContractNumber,
      routeNumber: packet.routeNumber,
      renewalNumber: packet.renewalNumber || null,
      sortOrder,
    })),
  });
}

async function syncContractContractors(contractId: string, contractorIds: string[]) {
  const extraIds = [...new Set(contractorIds.slice(1))].filter((id) => id && id !== contractorIds[0]);
  await prisma.contractContractor.deleteMany({ where: { contractId } });
  if (!extraIds.length) return;
  await prisma.contractContractor.createMany({
    data: extraIds.map((contractorId, sortOrder) => ({ contractId, contractorId, sortOrder })),
  });
}

async function resolveContractorIdsFromForm(form: FormData) {
  const selected = form.getAll("contractorId").map((value) => String(value ?? "").trim());
  const names = form.getAll("newContractorName").map((value) => String(value ?? "").trim());
  const counties = form.getAll("newContractorCounty").map((value) => String(value ?? "").trim());
  const ids: string[] = [];
  const length = Math.max(selected.length, names.length, 1);
  for (let index = 0; index < length; index += 1) {
    if (selected[index]) {
      ids.push(selected[index]);
      continue;
    }
    if (!names[index]) continue;
    const created = await prisma.contractor.create({
      data: {
        legalName: names[index],
        incomplete: true,
        brcStatus: "Not on file",
        brcNameControl: nameControlFrom(names[index]) || null,
        county: matchNjCounty(counties[index] || null),
      },
    });
    ids.push(created.id);
  }
  const fromSingleName = formString(form, "newContractorName");
  const fromSingleId = formString(form, "contractorId");
  if (!ids.length && fromSingleId) ids.push(fromSingleId);
  if (!ids.length && fromSingleName && !names.length) {
    const created = await prisma.contractor.create({
      data: {
        legalName: fromSingleName,
        incomplete: true,
        brcStatus: "Not on file",
        brcNameControl: nameControlFrom(fromSingleName) || null,
        county: matchNjCounty(formString(form, "newContractorCounty") || null),
      },
    });
    ids.push(created.id);
  }
  return [...new Set(ids)];
}

async function resolveParentContractorId(parentName: string) {
  const name = parentName.trim();
  if (!name) throw new Error("Enter the parent name.");
  const existing = await prisma.contractor.findMany({
    where: { deletedAt: null },
    select: { id: true, legalName: true },
  });
  const match = existing.find((row) => row.legalName.toLowerCase() === name.toLowerCase());
  if (match) return match.id;
  const created = await prisma.contractor.create({
    data: {
      legalName: name,
      incomplete: true,
      brcStatus: "Not on file",
      brcNameControl: nameControlFrom(name) || null,
    },
  });
  return created.id;
}

function intakeErrorPath(form: FormData, type: string, message: string) {
  const source = formString(form, "source") || "incoming";
  const base = source === "current" ? "/settings/current-records" : "/contracts/new";
  return `${base}?type=${encodeURIComponent(type)}&error=${encodeURIComponent(message)}`;
}

async function ensureDistrictByName(name: string, county?: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = await prisma.district.findFirst({ where: { name: trimmed, deletedAt: null } });
  if (existing) return existing;
  return prisma.district.create({
    data: {
      name: trimmed,
      email: "",
      county: matchNjCounty(county || null) || "Passaic",
    },
  });
}

async function resolveDistrictIdFromForm(form: FormData, field = "districtId") {
  const selected = formString(form, field);
  if (selected) return selected;
  const prefix = field === "hostDistrictId" ? "newHostDistrict" : "newDistrict";
  const newName = formString(form, `${prefix}Name`);
  if (!newName) return "";
  const row = await ensureDistrictByName(newName, formString(form, `${prefix}County`) || undefined);
  return row?.id ?? "";
}

async function resolveJoinerDistrictsFromForm(form: FormData) {
  const selected = form.getAll("joinerDistrictName").map((value) => String(value ?? "").trim());
  const typed = form.getAll("newJoinerName").map((value) => String(value ?? "").trim());
  const counties = form.getAll("newJoinerCounty").map((value) => String(value ?? "").trim());
  const names: string[] = [];
  const length = Math.max(selected.length, typed.length);
  for (let index = 0; index < length; index += 1) {
    const name = typed[index] || selected[index];
    if (!name) continue;
    await ensureDistrictByName(name, counties[index] || undefined);
    names.push(name);
  }
  return names.join("; ") || String(form.get("joinerDistricts") ?? "").trim() || null;
}

function parseReviewersFromForm(form: FormData) {
  const first = parseReviewerChoice(
    formString(form, "firstReviewerChoice"),
    formString(form, "firstReviewerTyped")
  );
  const second = parseReviewerChoice(
    formString(form, "secondReviewerChoice"),
    formString(form, "secondReviewerTyped")
  );
  return {
    firstReviewerId: first.userId,
    firstReviewerName: first.name,
    secondReviewerId: second.userId,
    secondReviewerName: second.name,
  };
}

async function rememberReviewerNames(names: Array<string | null | undefined>) {
  for (const name of names) {
    const trimmed = (name ?? "").trim();
    if (!trimmed) continue;
    const existing = await prisma.reviewerName.findFirst({ where: { name: trimmed, deletedAt: null } });
    if (!existing) await prisma.reviewerName.create({ data: { name: trimmed } });
  }
}

export async function findContractForAddendum({
  schoolYear,
  multiContractNumber,
  districtId,
}: {
  schoolYear: string;
  multiContractNumber: string;
  districtId?: string;
}) {
  await requireSession();
  const multi = multiContractNumber.trim();
  const year = schoolYear.trim();
  if (!multi || !year) throw new Error("Enter the school year and multi-contract number.");
  const rows = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      schoolYear: year,
      type: { not: "addendum" },
      ...(districtId ? { districtId } : {}),
      OR: [
        { multiContractNumber: multi },
        { extraPackets: { some: { multiContractNumber: multi } } },
      ],
    },
    include: {
      district: true,
      contractor: true,
      extraContractors: { include: { contractor: true }, orderBy: { sortOrder: "asc" } },
      routes: { orderBy: { number: "asc" } },
    },
    orderBy: { createdAt: "asc" },
    take: 8,
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    typeLabel: intakeTypeLabel(row.type),
    schoolYear: row.schoolYear,
    multiContractNumber: row.multiContractNumber,
    districtName: row.district.name,
    contractorNames: formatCompanyNames([
      row.parentName || row.contractor.legalName,
      ...row.extraContractors.map((link) => link.contractor.legalName),
    ]),
    statusName: row.statusName,
    routes: row.routes.map((route) => ({ id: route.id, number: route.number })),
  }));
}

async function linkAddendumFromForm(form: FormData, userId: string) {
  const type = "addendum";
  if (formString(form, "confirmAddendumLink") !== "yes") {
    redirect(intakeErrorPath(form, type, "Confirm that this addendum should be linked to the contract we found before saving."));
  }
  const linkedId = formString(form, "linkedContractId");
  const existing = await prisma.contract.findFirst({
    where: { id: linkedId, deletedAt: null },
    include: { routes: { include: { addenda: { where: { deletedAt: null } } } }, extraContractors: true },
  });
  if (!existing) {
    redirect(intakeErrorPath(form, type, "That contract is no longer on file. Find it again, then confirm before linking."));
  }
  const pickedRouteIds = form.getAll("addendumRouteId").map((value) => String(value ?? "").trim()).filter(Boolean);
  const wantedNumbers = splitRoutes(formString(form, "routes"));
  const matched = existing.routes.filter(
    (route) => pickedRouteIds.includes(route.id) || wantedNumbers.includes(route.number)
  );
  if (!matched.length) {
    redirect(
      intakeErrorPath(
        form,
        type,
        `Contract ${existing.multiContractNumber} is on file, but you have to pick a route that is already on that contract.`
      )
    );
  }
  const bidNumber = formString(form, "bidNumber") || null;
  const renewalNumber = formString(form, "renewalNumber") || null;
  const notes = formString(form, "notes") || null;
  const previousCount = matched.reduce((sum, route) => sum + route.addenda.length, 0);
  for (const route of matched) {
    await prisma.routeAddendum.create({
      data: {
        routeId: route.id,
        reason: notes || `Addendum ${route.addenda.length + 1}`,
        receivedDate: parseDate(formString(form, "receivedDate")) || parseFlexibleDate(formString(form, "receivedDate")),
        bidNumber,
        renewalNumber,
        notes,
      },
    });
  }
  const statusName = formString(form, "statusName");
  const reviewers = parseReviewersFromForm(form);
  const sentToDistrictAt = parseDate(formString(form, "sentToDistrictAt")) || parseFlexibleDate(formString(form, "sentToDistrictAt"));
  await rememberReviewerNames([reviewers.firstReviewerName, reviewers.secondReviewerName]);
  await prisma.contract.update({
    where: { id: existing.id },
    data: {
      ...(statusName ? { statusName } : {}),
      firstReviewerId: reviewers.firstReviewerId,
      firstReviewerName: reviewers.firstReviewerName,
      secondReviewerId: reviewers.secondReviewerId,
      secondReviewerName: reviewers.secondReviewerName,
      ...(sentToDistrictAt ? { sentToDistrictAt } : {}),
    },
  });
  const insuranceExpiresAt = parseFlexibleDate(formString(form, "insuranceExpiresAt"));
  if (insuranceExpiresAt) {
    const contractorIds = [existing.contractorId, ...existing.extraContractors.map((link) => link.contractorId)];
    await upsertInsuranceExpiration({
      contractorIds,
      districtId: existing.districtId,
      schoolYear: existing.schoolYear,
      expiresAt: insuranceExpiresAt,
    });
  }
  const nextCount = previousCount + matched.length;
  await writeAudit({
    userId,
    action: "create",
    entityType: "addendum",
    entityId: existing.id,
    summary: `Linked addendum to ${existing.multiContractNumber} (${nextCount} addendum${nextCount === 1 ? "" : "s"} on matching routes)`,
  });
  revalidateAll();
  const source = formString(form, "source") || "incoming";
  if (source === "current") {
    redirect(
      `/settings/current-records?type=addendum&saved=addendum&number=${encodeURIComponent(existing.multiContractNumber)}`
    );
  }
  redirect(`/contracts/${existing.id}?addendumLinked=1&addendumCount=${nextCount}&routeCount=${matched.length}`);
}

async function upsertInsuranceExpiration({
  contractorIds,
  districtId,
  schoolYear,
  expiresAt,
}: {
  contractorIds: string[];
  districtId: string;
  schoolYear: string;
  expiresAt: Date;
}) {
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  const expired = expiresAt < new Date();
  for (const contractorId of [...new Set(contractorIds)]) {
    const existing = await prisma.insuranceCertificate.findFirst({
      where: { contractorId, districtId, deletedAt: null },
      orderBy: { expiresAt: "desc" },
    });
    const insData = {
      schoolYear,
      expiresAt,
      namedDistrict: district?.name ?? null,
      statusName: expired ? "Needs update" : "On file",
    };
    if (existing) {
      await prisma.insuranceCertificate.update({ where: { id: existing.id }, data: insData });
    } else {
      await prisma.insuranceCertificate.create({
        data: { contractorId, districtId, ...insData },
      });
    }
  }
}

export async function saveContract(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const mode = formString(form, "mode") || "intake";
  const statusName = formString(form, "statusName") || "Need Review";
  const schoolYear = normalizeSchoolYear(formString(form, "schoolYear"), await getSchoolYear());
  const type = mapContractType(formString(form, "type"));
  const packets = primaryAndExtraPackets(parsePacketRows(form));
  const routes = packets.routeNumbers.length ? packets.routeNumbers : splitRoutes(formString(form, "routes"));

  if (!id && type === "addendum") {
    await linkAddendumFromForm(form, user.id);
  }

  const contractorIds = usesParentName(type)
    ? [await resolveParentContractorId(formString(form, "parentName"))]
    : await resolveContractorIdsFromForm(form);
  if (!contractorIds.length) {
    redirect(intakeErrorPath(form, type, "Choose a bus company or type a new name."));
  }

  const hostDistrictId = usesHostJoiner(type) ? (await resolveDistrictIdFromForm(form, "hostDistrictId")) || null : null;
  const districtId = usesHostJoiner(type)
    ? hostDistrictId || (await resolveDistrictIdFromForm(form))
    : await resolveDistrictIdFromForm(form);
  if (!districtId) {
    redirect(intakeErrorPath(form, type, usesHostJoiner(type) ? "Choose the host district." : "Choose a district."));
  }

  const intake = {
    districtId,
    contractorId: contractorIds[0],
    schoolYear,
    type,
    multiContractNumber: packets.primary.multiContractNumber || formString(form, "multiContractNumber"),
    bidNumber: formString(form, "bidNumber") || null,
    renewalNumber: packets.primary.renewalNumber || formString(form, "renewalNumber") || null,
    parentName: usesParentName(type) ? formString(form, "parentName") || null : null,
    receivedDate: parseDate(formString(form, "receivedDate")),
    statusName,
    notes: formString(form, "notes") || null,
    ...(usesHostJoiner(type)
      ? {
          hostDistrictId,
          joinerDistricts: await resolveJoinerDistrictsFromForm(form),
        }
      : {}),
  };
  const review =
    mode === "review"
      ? {
          cost: parseMoney(formString(form, "cost")),
          bondAmount: parseMoney(formString(form, "bondAmount")),
          bondType: formString(form, "bondType") || "none",
          insuranceAmount: parseMoney(formString(form, "insuranceAmount")),
          boardMeetingDate: parseDate(formString(form, "boardMeetingDate")),
          startsOn: parseDate(formString(form, "startsOn")),
          endsOn: parseDate(formString(form, "endsOn")),
          sentToDistrictAt: parseDate(formString(form, "sentToDistrictAt")),
          ...(type === "renewal" ? { priorYearCost: parseMoney(formString(form, "priorYearCost")) } : {}),
          ...(type === "original" ? { bidSpecId: formString(form, "bidSpecId") || null } : {}),
          ...(type === "quote" ? { routePacketId: formString(form, "routePacketId") || null } : {}),
        }
      : {};

  let firstReviewerId: string | undefined;
  let secondReviewStartedAt: Date | null | undefined;
  if (mode === "review") {
    const current = id ? await prisma.contract.findUnique({ where: { id } }) : null;
    if (!current?.firstReviewerId && ["1st review missing items", "2nd review"].includes(statusName)) {
      firstReviewerId = user.id;
    }
    if (statusName === "2nd review" && !current?.secondReviewStartedAt) {
      secondReviewStartedAt = new Date();
    }
  }

  const data = { ...intake, ...review, ...(firstReviewerId ? { firstReviewerId } : {}), ...(secondReviewStartedAt ? { secondReviewStartedAt } : {}) };

  const row = id
    ? await prisma.contract.update({ where: { id }, data })
    : await prisma.contract.create({ data: intake });

  await syncRoutes(row.id, routes);
  await syncExtraPackets(row.id, packets.extras);
  await syncContractContractors(row.id, contractorIds);

  if (mode === "review" && type === "original") {
    const linkedRoutes = form.getAll("routeDescriptionIds").map(String).filter(Boolean);
    await prisma.contractRouteDescription.deleteMany({ where: { contractId: row.id } });
    for (const routeDescriptionId of linkedRoutes) {
      await prisma.contractRouteDescription.create({
        data: { contractId: row.id, routeDescriptionId },
      });
    }
  }

  await syncIntakeNoteComment(row.id, user.id, formString(form, "notes"));
  await ensureChecklist("contract", row.id, row.type);
  await refreshContractFlags(row.id);
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "contract",
    entityId: row.id,
    summary: `${id ? "Updated" : "Entered"} contract ${row.multiContractNumber}`,
  });
  revalidateAll();
  redirect(`/contracts/${row.id}`);
}

export async function saveCurrentContract(form: FormData) {
  const user = await requireSuperAdmin();
  const type = mapContractType(formString(form, "type"));
  if (type === "addendum") {
    await linkAddendumFromForm(form, user.id);
  }
  const schoolYear = normalizeSchoolYear(formString(form, "schoolYear"), await getSchoolYear());
  const defaults = schoolYearDates(schoolYear);
  const packets = primaryAndExtraPackets(parsePacketRows(form));
  const routes = packets.routeNumbers.length ? packets.routeNumbers : splitRoutes(formString(form, "routes"));
  const statusName = formString(form, "statusName") || "Need Review";
  const contractorIds = usesParentName(type)
    ? [await resolveParentContractorId(formString(form, "parentName"))]
    : await resolveContractorIdsFromForm(form);
  if (!contractorIds.length) {
    redirect(intakeErrorPath(form, type, "Choose a bus company or type a new name."));
  }
  const hostDistrictId = usesHostJoiner(type) ? (await resolveDistrictIdFromForm(form, "hostDistrictId")) || null : null;
  const districtId = usesHostJoiner(type)
    ? hostDistrictId || (await resolveDistrictIdFromForm(form))
    : await resolveDistrictIdFromForm(form);
  if (!districtId) {
    redirect(intakeErrorPath(form, type, usesHostJoiner(type) ? "Choose the host district." : "Choose a district."));
  }
  const reviewers = parseReviewersFromForm(form);
  await rememberReviewerNames([reviewers.firstReviewerName, reviewers.secondReviewerName]);
  const sentToDistrictAt = parseFlexibleDate(formString(form, "sentToDistrictAt"));
  const insuranceExpiresAt = parseFlexibleDate(formString(form, "insuranceExpiresAt"));

  const row = await prisma.contract.create({
    data: {
      districtId,
      contractorId: contractorIds[0],
      schoolYear,
      type,
      multiContractNumber: packets.primary.multiContractNumber || formString(form, "multiContractNumber"),
      bidNumber: formString(form, "bidNumber") || null,
      renewalNumber: packets.primary.renewalNumber || formString(form, "renewalNumber") || null,
      parentName: usesParentName(type) ? formString(form, "parentName") || null : null,
      hostDistrictId,
      joinerDistricts: usesHostJoiner(type) ? await resolveJoinerDistrictsFromForm(form) : null,
      receivedDate: parseFlexibleDate(formString(form, "receivedDate")),
      statusName,
      firstReviewerId: reviewers.firstReviewerId,
      firstReviewerName: reviewers.firstReviewerName,
      secondReviewerId: reviewers.secondReviewerId,
      secondReviewerName: reviewers.secondReviewerName,
      sentToDistrictAt,
      secondReviewStartedAt: statusName === "2nd review" ? new Date() : null,
      startsOn: defaults.start,
      endsOn: defaults.end,
      notes: formString(form, "notes") || "Entered from the current-system list.",
    },
  });
  await syncRoutes(row.id, routes);
  await syncExtraPackets(row.id, packets.extras);
  await syncContractContractors(row.id, contractorIds);

  if (insuranceExpiresAt) {
    await upsertInsuranceExpiration({
      contractorIds,
      districtId,
      schoolYear,
      expiresAt: insuranceExpiresAt,
    });
  }

  await syncIntakeNoteComment(row.id, user.id, formString(form, "notes"));
  await ensureChecklist("contract", row.id, row.type);
  await refreshContractFlags(row.id);
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "contract",
    entityId: row.id,
    summary: `Entered current contract ${row.multiContractNumber}`,
  });
  revalidateAll();
  redirect(
    `/settings/current-records?type=${encodeURIComponent(type)}&saved=contract&number=${encodeURIComponent(row.multiContractNumber)}`
  );
}

export async function saveCert(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const contractorId = formString(form, "contractorId");
  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor) throw new Error("Choose a contractor.");
  const county = resolveCertCounty(formString(form, "county"), contractor.county);
  if (!county) throw new Error("Choose the county this certification is for.");
  const data = {
    contractorId,
    schoolYear: formString(form, "schoolYear"),
    county,
    statusName: formString(form, "statusName") || "Need review",
    notes: formString(form, "notes") || null,
    receivedDate: parseDate(formString(form, "receivedDate")),
    reviewedDate: parseDate(formString(form, "reviewedDate")),
  };
  let row;
  try {
    row = id
      ? await prisma.annualCert.update({ where: { id }, data })
      : await prisma.annualCert.upsert({
          where: {
            contractorId_schoolYear_county: {
              contractorId: data.contractorId,
              schoolYear: data.schoolYear,
              county: data.county,
            },
          },
          update: data,
          create: data,
        });
  } catch (err) {
    if (isUniqueConflict(err)) {
      throw new Error(
        "This contractor already has an annual cert for that county this school year. Open that one instead of adding another."
      );
    }
    throw err;
  }
  await ensureChecklist("cert", row.id);
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "cert",
    entityId: row.id,
    summary: `Updated annual cert for ${data.schoolYear}${data.county ? ` · ${data.county}` : ""}`,
  });
  revalidateAll();
  redirect(`/certs/${row.id}`);
}

export async function saveInsurance(form: FormData) {
  const user = await requireSession();
  if (!can(user, "upload_files") && !can(user, "create")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const file = form.get("file") as File | null;
  let filePath: string | undefined;
  if (file && file.size > 0) {
    const name = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    filePath = `insurance/${name}`;
    await saveStoredFile(filePath, Buffer.from(await file.arrayBuffer()));
  }
  const data = {
    contractorId: formString(form, "contractorId"),
    districtId: formString(form, "districtId"),
    schoolYear: formString(form, "schoolYear"),
    policyNumber: formString(form, "policyNumber") || null,
    amount: parseMoney(formString(form, "amount")),
    startsOn: parseDate(formString(form, "startsOn")),
    expiresAt: parseDate(formString(form, "expiresAt")),
    namedDistrict: formString(form, "namedDistrict") || null,
    statusName: "On file",
    ...(filePath ? { filePath } : {}),
  };
  const row = id
    ? await prisma.insuranceCertificate.update({ where: { id }, data })
    : await prisma.insuranceCertificate.create({ data });
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "insurance",
    entityId: row.id,
    summary: `Saved insurance for a contractor/district pair`,
  });
  revalidateAll();
  redirect(`/insurance/${row.id}`);
}

export async function saveRouteDescription(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const statusName = formString(form, "statusName") || "Need Review";
  const destination = formString(form, "destination");
  const kind = formString(form, "kind") || "bid";
  const file = form.get("file") as File | null;
  let filePath: string | undefined;
  let extractedText: string | undefined;
  if (file && file.size > 0) {
    const name = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const buf = Buffer.from(await file.arrayBuffer());
    filePath = `route-descriptions/${name}`;
    await saveStoredFile(filePath, buf);
    extractedText = fileToText(buf, file.name);
  }
  const content = formString(form, "content") || extractedText || null;
  const parsed = parseRoutePacket(content || "");
  const routeNumbers =
    formString(form, "routeNumbers") || parsed.map((line) => line.routeNumber).join(", ");
  const data = {
    districtId: formString(form, "districtId"),
    schoolYear: formString(form, "schoolYear"),
    kind,
    destination,
    title: destination || formString(form, "title") || "Route packet",
    routeNumbers,
    content,
    statusName,
    approvedAt: statusName === "Approved" ? new Date() : null,
    ...(filePath ? { filePath } : {}),
    ...(extractedText ? { extractedText } : {}),
  };
  const row = id
    ? await prisma.routeDescription.update({ where: { id }, data })
    : await prisma.routeDescription.create({ data });

  if (parsed.length) {
    await prisma.routeLine.deleteMany({ where: { packetId: row.id } });
    await prisma.routeLine.createMany({
      data: parsed.map((line, sortOrder) => ({
        packetId: row.id,
        routeNumber: line.routeNumber,
        destination: line.destination || null,
        startTime: line.startTime || null,
        endTime: line.endTime || null,
        startDate: line.startDate || null,
        endDate: line.endDate || null,
        sortOrder,
      })),
    });
  }

  await ensureChecklist("route_description", row.id);
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "route_description",
    entityId: row.id,
    summary: `${statusName === "Approved" ? "Approved" : "Saved"} ${kind === "emergency_quote" ? "emergency quote" : "route description"} ${row.destination || row.title}`,
  });
  revalidateAll();
  redirect(`/route-descriptions/${row.id}`);
}

export async function saveEmergencyQuote(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const statusName = formString(form, "statusName") || "Need review";
  const data = {
    districtId: formString(form, "districtId"),
    contractorId: formString(form, "contractorId") || null,
    schoolYear: formString(form, "schoolYear"),
    title: formString(form, "title"),
    quoteDate: parseDate(formString(form, "quoteDate")),
    approvedAt: parseDate(formString(form, "approvedAt")) || (statusName === "Approved" ? new Date() : null),
    amount: parseMoney(formString(form, "amount")),
    notes: formString(form, "notes") || null,
    statusName,
  };
  const row = id
    ? await prisma.emergencyQuote.update({ where: { id }, data })
    : await prisma.emergencyQuote.create({ data });
  await ensureChecklist("emergency_quote", row.id);
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "emergency_quote",
    entityId: row.id,
    summary: `Saved emergency quote ${row.title}`,
  });
  revalidateAll();
  redirect(`/emergency-quotes/${row.id}`);
}

export async function saveBidSpec(form: FormData) {
  const user = await requireSession();
  if (!can(user, "upload_files") && !can(user, "create")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const file = form.get("file") as File | null;
  let filePath: string | undefined;
  let extractedText: string | undefined;
  let insuranceAmount: number | null | undefined;
  let bondType: string | null | undefined;
  let highlightsJson: string | undefined;

  if (file && file.size > 0) {
    const name = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const buf = Buffer.from(await file.arrayBuffer());
    filePath = `bid-specs/${name}`;
    await saveStoredFile(filePath, buf);
    const text = fileToText(buf, file.name);
    const extracted = await extractBidSpec(text);
    extractedText = extracted.extractedText;
    insuranceAmount = extracted.insuranceAmount;
    bondType = extracted.bondType;
    highlightsJson = JSON.stringify(extracted.highlights);
  }

  const data = {
    districtId: formString(form, "districtId"),
    schoolYear: formString(form, "schoolYear"),
    title: formString(form, "title"),
    statusName: formString(form, "statusName") || "Need review",
    insuranceAmount:
      parseMoney(formString(form, "insuranceAmount")) ?? insuranceAmount ?? undefined,
    bondType: formString(form, "bondType") || bondType || null,
    ...(filePath ? { filePath, extractedText, highlightsJson } : {}),
  };

  const row = id
    ? await prisma.bidSpec.update({ where: { id }, data })
    : await prisma.bidSpec.create({ data });
  await ensureChecklist("bid_spec", row.id);
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "bid_spec",
    entityId: row.id,
    summary: `Saved bid spec ${row.title}`,
  });
  revalidateAll();
  redirect(`/bid-specs/${row.id}`);
}

export async function updateChecklistItem(form: FormData) {
  const user = await requireSession();
  if (!can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  await prisma.checklistResponse.update({
    where: { id },
    data: {
      checked: form.get("checked") === "on" || form.get("checked") === "true",
      comment: formString(form, "comment") || null,
    },
  });
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "checklist",
    entityId: id,
    summary: "Updated a checklist item",
  });
  revalidateAll();
}

export async function softDelete(entityType: string, id: string, backTo: string) {
  const user = await requireSession();
  if (!can(user, "delete")) throw new Error("You do not have permission.");
  const data = { deletedAt: new Date() };
  switch (entityType) {
    case "district":
      await prisma.district.update({ where: { id }, data });
      break;
    case "contractor":
      await prisma.contractor.update({ where: { id }, data });
      break;
    case "contract":
      await prisma.contract.update({ where: { id }, data });
      break;
    case "cert":
      await prisma.annualCert.update({ where: { id }, data });
      break;
    case "insurance":
      await prisma.insuranceCertificate.update({ where: { id }, data });
      break;
    case "bid_spec":
      await prisma.bidSpec.update({ where: { id }, data });
      break;
    case "route_description":
      await prisma.routeDescription.update({ where: { id }, data });
      break;
    case "emergency_quote":
      await prisma.emergencyQuote.update({ where: { id }, data });
      break;
    case "status":
      await prisma.status.update({ where: { id }, data });
      break;
    case "user":
      await prisma.user.update({ where: { id }, data: { ...data, active: false } });
      break;
    default:
      throw new Error("Unknown record type.");
  }
  await writeAudit({
    userId: user.id,
    action: "delete",
    entityType,
    entityId: id,
    summary: `Removed a ${entityType}`,
  });
  revalidateAll();
  redirect(backTo);
}

export async function restoreDeleted(entityType: string, id: string) {
  const user = await requireSession();
  if (!isSuperAdmin(user.role) && !can(user, "delete")) throw new Error("You do not have permission.");
  const data = { deletedAt: null as Date | null };
  switch (entityType) {
    case "district":
      await prisma.district.update({ where: { id }, data });
      break;
    case "contractor":
      await prisma.contractor.update({ where: { id }, data });
      break;
    case "contract":
      await prisma.contract.update({ where: { id }, data });
      break;
    case "cert":
      await prisma.annualCert.update({ where: { id }, data });
      break;
    case "insurance":
      await prisma.insuranceCertificate.update({ where: { id }, data });
      break;
    case "bid_spec":
      await prisma.bidSpec.update({ where: { id }, data });
      break;
    case "route_description":
      await prisma.routeDescription.update({ where: { id }, data });
      break;
    case "emergency_quote":
      await prisma.emergencyQuote.update({ where: { id }, data });
      break;
    case "status":
      await prisma.status.update({ where: { id }, data });
      break;
    case "user":
      await prisma.user.update({ where: { id }, data: { deletedAt: null, active: true } });
      break;
    case "addendum":
      await prisma.routeAddendum.update({ where: { id }, data });
      break;
    default:
      throw new Error("That item cannot be restored.");
  }
  await writeAudit({
    userId: user.id,
    action: "restore",
    entityType,
    entityId: id,
    summary: `Restored a ${entityType.replace(/_/g, " ")}`,
  });
  revalidateAll();
}

export async function saveStatus(form: FormData) {
  const user = await requireSession();
  if (!isSuperAdmin(user.role) && !can(user, "manage_statuses")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const data = {
    entityType: formString(form, "entityType"),
    name: formString(form, "name"),
    color: sanitizeStatusColor(formString(form, "color")),
    sortOrder: Number(formString(form, "sortOrder") || 0),
  };
  if (id) await prisma.status.update({ where: { id }, data });
  else await prisma.status.create({ data });
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "status",
    summary: `${id ? "Updated" : "Added"} status ${data.name}`,
  });
  revalidateAll();
}

export async function saveSettings(form: FormData) {
  const user = await requireSession();
  if (!isSuperAdmin(user.role)) throw new Error("Only Super Admin can change office settings.");
  const values: Record<string, string> = {
    schoolYear: formString(form, "schoolYear"),
    cpi: parsePercent(formString(form, "cpi")),
    bidThreshold: String(parseMoney(formString(form, "bidThreshold")) ?? ""),
    officeName: formString(form, "officeName"),
    officeEmail: formString(form, "officeEmail"),
    secondReviewAlertOn: formString(form, "secondReviewAlertOn"),
    secondReviewAlertHours: formString(form, "secondReviewAlertHours"),
  };
  for (const [key, value] of Object.entries(values)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "settings",
    summary: "Updated office settings",
  });
  revalidateAll();
}

export async function saveUser(form: FormData) {
  const user = await requireSession();
  if (!isSuperAdmin(user.role) && !can(user, "manage_users")) throw new Error("You do not have permission.");
  await ensurePermissions();
  const { hashPassword } = await import("@/lib/auth");
  const id = formString(form, "id");
  const password = formString(form, "password");
  const role = formString(form, "role") || "staff";
  const data = {
    name: formString(form, "name"),
    email: formString(form, "email").toLowerCase(),
    role,
    active: form.get("active") !== "off",
  };
  const passwordValue = password || (!id ? "Passaic2026!" : "");
  const passwordFields = passwordValue
    ? { passwordHash: await hashPassword(passwordValue), adminSetPassword: passwordValue }
    : {};
  const row = id
    ? await prisma.user.update({
        where: { id },
        data: { ...data, ...passwordFields },
      })
    : await prisma.user.create({
        data: {
          ...data,
          passwordHash: await hashPassword(passwordValue || "Passaic2026!"),
          adminSetPassword: passwordValue || "Passaic2026!",
        },
      });
  const selected = ALL_PERMISSION_KEYS.filter((key) => form.get(`perm_${key}`) === "on");
  const perms = selected.length ? selected : ROLE_PERMISSIONS[role] ?? ["view"];
  await prisma.userPermission.deleteMany({ where: { userId: row.id } });
  await prisma.userPermission.createMany({
    data: perms.map((permissionKey) => ({ userId: row.id, permissionKey })),
  });
  const districtIds = form.getAll("districtIds").map(String).filter(Boolean);
  await prisma.userDistrict.deleteMany({ where: { userId: row.id } });
  if (districtIds.length) {
    await prisma.userDistrict.createMany({
      data: districtIds.map((districtId) => ({ userId: row.id, districtId })),
    });
  }
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "user",
    entityId: row.id,
    summary: `${id ? "Updated" : "Added"} user ${row.name}`,
  });
  revalidateAll();
  redirect("/settings/users");
}

export async function sendUserLoginEmail(form: FormData) {
  const user = await requireSession();
  if (!isSuperAdmin(user.role) && !can(user, "manage_users")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) throw new Error("That user could not be found.");
  const password = target.adminSetPassword;
  if (!password) throw new Error("Set a password on this account first so it can be included in the email.");
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const subject = "Your Passaic County Transportation login";
  const body = `Hello ${target.name},\n\nAn account was created for you in the Passaic County Transportation office app.\n\nEmail: ${target.email}\nPassword: ${password}\n${appUrl ? `\nSign in: ${appUrl}\n` : ""}\nPlease sign in and keep this password somewhere safe.\n\nThank you,\nPassaic County Transportation`;
  let status = "drafted";
  let error: string | null = null;
  try {
    const result = await sendOutlookMail({
      to: target.email,
      subject,
      body,
    });
    status = result.sent ? "sent" : "drafted";
    if (!result.sent) error = result.reason;
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : "Send failed";
  }
  await prisma.emailLog.create({
    data: {
      toAddress: target.email,
      subject,
      body,
      kind: "login",
      status,
      error,
      sentAt: status === "sent" ? new Date() : null,
      sentById: user.id,
    },
  });
  await writeAudit({
    userId: user.id,
    action: "email",
    entityType: "user",
    entityId: target.id,
    summary: `Login details ${status} for ${target.name}`,
  });
  revalidateAll();
  redirect(`/settings/users?loginEmail=${status}${error ? `&loginError=${encodeURIComponent(error)}` : ""}`);
}

export async function saveHomePrefs(form: FormData) {
  const user = await requireSession();
  const hiddenTiles = form.getAll("hiddenTiles").map(String);
  const prefs = parseHomePrefs(
    JSON.stringify({
      layout: formString(form, "layout") === "compact" ? "compact" : "regular",
      accent: formString(form, "accent") || "teal",
      showStatusBar: form.get("showStatusBar") === "on",
      showAttentionTiles: form.get("showAttentionTiles") === "on",
      showSecondReview: form.get("showSecondReview") === "on",
      showRecent: form.get("showRecent") === "on",
      hiddenTiles,
      font: formString(form, "font") || "sans",
      headingFont: formString(form, "headingFont") || "serif",
      fontSize: formString(form, "fontSize") || "md",
      background: formString(form, "background"),
      text: formString(form, "text"),
      muted: formString(form, "muted"),
      nav: formString(form, "nav"),
      navText: formString(form, "navText"),
      btnPrimary: formString(form, "btnPrimary"),
      btnSecondary: formString(form, "btnSecondary"),
      btnDanger: formString(form, "btnDanger"),
      btnHelp: formString(form, "btnHelp"),
      btnSignOut: formString(form, "btnSignOut"),
      btnNewContract: formString(form, "btnNewContract"),
      btnNewCert: formString(form, "btnNewCert"),
      btnViewAll: formString(form, "btnViewAll"),
      scroll: formString(form, "scroll"),
    })
  );
  await prisma.user.update({
    where: { id: user.id },
    data: { homePrefs: JSON.stringify(prefs) },
  });
  revalidateAll();
}

export async function uploadTemplate(form: FormData) {
  const user = await requireSession();
  if (!can(user, "manage_templates") || !isSuperAdmin(user.role)) {
    return { ok: false as const, error: "Your login cannot change letter templates. Ask Super Admin." };
  }
  const key = formString(form, "key");
  const file = form.get("file") as File | null;
  if (!file || file.size === 0) {
    return { ok: false as const, error: "Please choose a Word document." };
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { ok: false as const, error: "Please upload a Word .docx file, not a PDF or older .doc file." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false as const,
      error: "That Word file is too large for the live site (about 4 MB). In Word use File → Compress Pictures, then try again.",
    };
  }
  try {
    const name = `${key}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = `templates/${name}`;
    await saveStoredFile(filePath, Buffer.from(await file.arrayBuffer()));
    await prisma.templateFile.upsert({
      where: { key },
      update: { filePath, originalName: file.name },
      create: { key, filePath, originalName: file.name },
    });
    await writeAudit({
      userId: user.id,
      action: "update",
      entityType: "template",
      summary: `Uploaded template ${key}`,
    });
    revalidateAll();
    return { ok: true as const, originalName: file.name };
  } catch (error) {
    console.error("uploadTemplate failed", error);
    return {
      ok: false as const,
      error: "The live site could not save that letter. Try a smaller .docx, or wait a moment and upload again.",
    };
  }
}

async function readTemplateFile(key: string) {
  const row = await prisma.templateFile.findUnique({ where: { key } });
  if (!row) return null;
  return readStoredFile(row.filePath);
}

async function templateBuffer(key: "approved" | "disapproved" | "pt4", contractType?: string) {
  if (key === "pt4") {
    return (await readTemplateFile("pt4")) ?? defaultLetterDocx("pt4");
  }
  const lookups = letterTemplateLookups(key, contractType);
  for (const lookup of lookups) {
    const buf = await readTemplateFile(lookup);
    if (buf) return buf;
  }
  return defaultLetterDocx(key, contractType);
}

async function certTemplateBuffer(kind: "approved" | "disapproved") {
  const key = kind === "approved" ? "cert_approved" : "cert_disapproved";
  return (await readTemplateFile(key)) ?? defaultLetterDocx(kind);
}

export async function generateContractLetter(form: FormData) {
  const user = await requireSession();
  if (!can(user, "approve")) throw new Error("You do not have permission.");
  const kind = formString(form, "kind") as "approved" | "disapproved";
  const letterDate = parseDate(formString(form, "letterDate")) || new Date();
  const ids = Array.from(
    new Set(
      [...form.getAll("ids"), form.get("id")]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
  if (!ids.length) throw new Error("Choose at least one contract.");
  const contracts = await prisma.contract.findMany({
    where: { id: { in: ids }, deletedAt: null },
    include: {
      district: true,
      contractor: true,
      hostDistrict: true,
      extraPackets: { orderBy: { sortOrder: "asc" } },
      extraContractors: { include: { contractor: true } },
      routes: { include: { addenda: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } } },
    },
  });
  if (contracts.length !== ids.length) throw new Error("One of those contracts could not be found.");
  const first = contracts[0];
  if (contracts.some((row) => row.type !== first.type)) {
    throw new Error("All contracts on one letter must be the same type.");
  }
  if (first.type !== "joint" && contracts.some((row) => row.districtId !== first.districtId)) {
    throw new Error("All contracts on one letter must be for the same district.");
  }
  if (contracts.some((row) => row.schoolYear !== first.schoolYear)) {
    throw new Error("All contracts on one letter must be for the same school year.");
  }
  const ordered = ids.map((id) => contracts.find((row) => row.id === id)!);
  const groups = groupByLetter(ordered, (row) => ({
    type: row.type,
    districtId: row.districtId,
    schoolYear: row.schoolYear,
    hostDistrictId: row.hostDistrictId,
    joinerDistricts: row.joinerDistricts,
    receivedDate: row.receivedDate,
  }));
  const notes = formString(form, "notes");
  const statusName = kind === "approved" ? "Approved" : "Disapproved";
  const files: Array<{ name: string; data: Buffer }> = [];

  for (const group of groups) {
    const lead = group[0];
    const addressDistrict = lead.type === "joint" && lead.hostDistrict ? lead.hostDistrict : lead.district;
    const fields = contractLetterFields({
      letterDate,
      district: addressDistrict,
      schoolYear: lead.schoolYear,
      type: contractTypeLabel(lead.type),
      decision: kind === "approved" ? "approved" : "disapproved",
      notes,
      rows: group.flatMap((row) => {
        const contractorName = formatCompanyNames([
          row.parentName || row.contractor.legalName,
          ...row.extraContractors.map((link) => link.contractor.legalName),
        ]);
        return [
          {
            multiContractNumber: row.multiContractNumber,
            contractorName,
            parentName: row.parentName,
            vendorCode: row.contractor.vendorCode,
            routes: row.routes.map((route) => route.number),
            addendumNumbers: row.routes.flatMap((route) =>
              route.addenda.map((addendum, index) => addendum.reason || String(index + 1))
            ),
            hostDistrictName: row.hostDistrict?.name,
            jointDistrict: row.joinerDistricts,
            receivedDate: row.receivedDate,
          },
          ...row.extraPackets.map((packet) => ({
            multiContractNumber: packet.multiContractNumber,
            contractorName,
            parentName: row.parentName,
            vendorCode: row.contractor.vendorCode,
            routes: packet.routeNumber ? [packet.routeNumber] : [],
            addendumNumbers: [] as string[],
            hostDistrictName: row.hostDistrict?.name,
            jointDistrict: row.joinerDistricts,
            receivedDate: row.receivedDate,
          })),
        ];
      }),
    });
    const buf = fillDocx(await templateBuffer(kind, lead.type), fields);
    const hostBit =
      lead.type === "joint" ? `${lead.hostDistrict?.name || "host"}-${lead.joinerDistricts || "joiner"}` : lead.district.name;
    const fileName = `${kind}-${hostBit}-${lead.type}-${group.length}-${Date.now()}-${files.length}.docx`.replace(/\s+/g, "_");
    await saveStoredFile(`letters/${fileName}`, buf);
    files.push({ name: fileName, data: buf });
    for (const row of group) {
      await prisma.letter.create({
        data: {
          entityType: "contract",
          entityId: row.id,
          kind,
          letterDate,
          filePath: `letters/${fileName}`,
          createdById: user.id,
        },
      });
      await prisma.contract.update({
        where: { id: row.id },
        data: { statusName, letterDate },
      });
      await writeAudit({
        userId: user.id,
        action: kind,
        entityType: "contract",
        entityId: row.id,
        summary: `${kind === "approved" ? "Approved" : "Disapproved"} contract ${row.multiContractNumber}${
          groups.length > 1 ? ` on 1 of ${groups.length} letters` : group.length > 1 ? ` on a ${group.length}-contract letter` : ""
        }`,
      });
    }
  }

  revalidateAll();
  if (files.length === 1) {
    return `/api/files?path=${encodeURIComponent(`letters/${files[0].name}`)}`;
  }
  const zipName = `${kind}-letters-${files.length}-${Date.now()}.zip`;
  await saveStoredFile(`letters/${zipName}`, zipFiles(files));
  return `/api/files?path=${encodeURIComponent(`letters/${zipName}`)}`;
}

export async function generateCertLetter(form: FormData) {
  const user = await requireSession();
  if (!can(user, "approve")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const kind = formString(form, "kind") as "approved" | "disapproved";
  const letterDate = parseDate(formString(form, "letterDate")) || new Date();
  const cert = await prisma.annualCert.findUniqueOrThrow({
    where: { id },
    include: { contractor: true },
  });
  const fields = contractLetterFields({
    letterDate,
    district: { name: "All districts served by this contractor" },
    schoolYear: cert.schoolYear,
    type: "Annual certification",
    decision: kind === "approved" ? "approved" : "disapproved",
    notes: formString(form, "notes"),
    rows: [
      {
        multiContractNumber: "Annual certification",
        contractorName: cert.contractor.legalName,
        vendorCode: cert.contractor.vendorCode,
        routes: [],
      },
    ],
  });
  const buf = fillDocx(await certTemplateBuffer(kind), fields);
  const fileName = `cert-${kind}-${cert.contractor.vendorCode || cert.id}-${Date.now()}.docx`;
  await saveStoredFile(`letters/${fileName}`, buf);
  await prisma.letter.create({
    data: {
      entityType: "cert",
      entityId: id,
      kind,
      letterDate,
      filePath: `letters/${fileName}`,
      createdById: user.id,
    },
  });
  await prisma.annualCert.update({
    where: { id },
    data: {
      statusName: kind === "approved" ? "Approved" : "Disapproved",
      letterDate,
    },
  });
  if (kind === "approved") await ensureChecklist("cert", id);
  await writeAudit({
    userId: user.id,
    action: kind,
    entityType: "cert",
    entityId: id,
    summary: `${kind === "approved" ? "Approved" : "Disapproved"} annual cert for ${cert.contractor.legalName}`,
  });
  revalidateAll();
  return `/api/files?path=${encodeURIComponent(`letters/${fileName}`)}`;
}

export async function generateLabels(contractId: string, kind: LabelKind = "both") {
  const form = new FormData();
  form.append("ids", contractId);
  form.set("kind", kind);
  return generatePrintPacket(form);
}

export async function generatePrintPacket(form: FormData) {
  const user = await requireSession();
  const kind = (formString(form, "kind") || "both") as LabelKind;
  const ids = Array.from(new Set(form.getAll("ids").map((value) => String(value ?? "").trim()).filter(Boolean)));
  if (!ids.length) throw new Error("Choose at least one contract.");
  const contracts = await prisma.contract.findMany({
    where: { id: { in: ids }, deletedAt: null },
    include: { district: true, contractor: true, routes: true },
  });
  if (!contracts.length) throw new Error("Those contracts could not be found.");
  const ordered = ids.map((id) => contracts.find((row) => row.id === id)).filter(Boolean) as typeof contracts;
  const buffers = await Promise.all(
    ordered.map((contract) =>
      buildLabelPdf(
        {
          contractorName: contract.contractor.legalName,
          districtName: contract.district.name,
          schoolYear: contract.schoolYear,
          multiContractNumber: contract.multiContractNumber,
          routes: contract.routes.map((r) => r.number),
        },
        kind
      )
    )
  );
  const buf = buffers.length === 1 ? buffers[0] : await mergePdfs(buffers);
  const stamp = Date.now();
  const fileName = `${kind === "tab" ? "folder-tabs" : kind === "label" ? "labels" : "tabs-and-labels"}-${stamp}.pdf`;
  await saveStoredFile(`labels/${fileName}`, buf);
  const printedAt = new Date();
  for (const contract of ordered) {
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        ...(kind === "tab" || kind === "both" ? { folderTabPrintedAt: printedAt } : {}),
        ...(kind === "label" || kind === "both" ? { labelsPrintedAt: printedAt } : {}),
      },
    });
    await writeAudit({
      userId: user.id,
      action: "print",
      entityType: "contract",
      entityId: contract.id,
      summary:
        kind === "tab"
          ? `Printed folder tab for ${contract.multiContractNumber}`
          : kind === "label"
            ? `Printed file label for ${contract.multiContractNumber}`
            : `Printed folder tab and labels for ${contract.multiContractNumber}`,
    });
  }
  revalidateAll();
  return `/api/files?path=${encodeURIComponent(`labels/${fileName}`)}`;
}

export async function saveSignedApprovalLetter(form: FormData) {
  const user = await requireSession();
  if (!can(user, "upload_files") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const file = form.get("file") as File | null;
  if (!file || file.size === 0) return;
  const name = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = `signed-letters/${name}`;
  await saveStoredFile(filePath, Buffer.from(await file.arrayBuffer()));
  await prisma.contract.update({
    where: { id },
    data: { signedApprovalLetterPath: filePath },
  });
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "contract",
    entityId: id,
    summary: "Uploaded a signed approval letter",
  });
  revalidateAll();
}

async function syncIntakeNoteComment(contractId: string, userId: string, notesFromForm: string | null) {
  const body = notesFromForm?.trim();
  if (!body) return;
  const existing = await prisma.contractComment.findFirst({
    where: { contractId, body },
  });
  if (existing) return;
  await prisma.contractComment.create({
    data: { contractId, userId, body },
  });
}

export async function addContractComment(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const contractId = formString(form, "contractId");
  const body = formString(form, "body");
  if (!body) return;
  await prisma.contractComment.create({
    data: { contractId, userId: user.id, body },
  });
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "comment",
    entityId: contractId,
    summary: "Added a contract comment",
  });
  revalidateAll();
}

export async function deleteContractComment(form: FormData) {
  const user = await requireSession();
  if (!isSuperAdmin(user.role)) throw new Error("Only Super Admin can delete comments.");
  const id = formString(form, "id");
  const comment = await prisma.contractComment.findUniqueOrThrow({ where: { id } });
  await prisma.contractComment.delete({ where: { id } });
  await writeAudit({
    userId: user.id,
    action: "delete",
    entityType: "comment",
    entityId: comment.contractId,
    summary: "Deleted a contract comment",
  });
  revalidateAll();
}

export async function generatePt4AndEmail(form: FormData) {
  const user = await requireSession();
  if (!can(user, "send_email") && !can(user, "edit") && !can(user, "create")) {
    throw new Error("You do not have permission.");
  }
  const entityType = formString(form, "entityType");
  if (entityType === "cert") {
    throw new Error("PT-4s are for contracts, not annual certifications.");
  }
  const entityId = formString(form, "entityId");
  const items = await prisma.checklistResponse.findMany({
    where: { entityType, entityId },
  });
  const missing = items.filter((i) => !i.checked || i.comment);
  const missingText = missing
    .map((i) => `• ${i.itemLabel}${i.comment ? ` — ${i.comment}` : ""}`)
    .join("\n");

  let districtId: string | null = null;
  let districtEmail = "";
  let districtName = "";
  let districtForLetter: DistrictAddressInput | null = null;
  let contractor = "";
  let schoolYear = await getSetting("schoolYear");
  let multi = "";
  let type = entityType;
  let routes = "";

  if (entityType === "contract") {
    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: entityId },
      include: { district: true, contractor: true, routes: true },
    });
    districtId = contract.districtId;
    districtEmail = contract.district.email || "";
    districtName = contract.district.name;
    districtForLetter = contract.district;
    contractor = contract.contractor.legalName;
    schoolYear = contract.schoolYear;
    multi = contract.multiContractNumber;
    type = contractTypeLabel(contract.type);
    routes = contract.routes.map((r) => r.number).join(", ");
    await prisma.contract.update({
      where: { id: entityId },
      data: { statusName: "1st review missing items" },
    });
  }

  const to = formString(form, "to") || districtEmail;
  const subject =
    formString(form, "subject") ||
    `PT-4 additional information needed — ${districtName || contractor}`;
  const body =
    formString(form, "body") ||
    `Hello,\n\nThe Passaic County transportation office reviewed this submission and still needs the items on the attached PT-4.\n\n${missingText}\n\nPlease send the missing information so we can finish the review.\n\nThank you,\nPassaic County Transportation`;

  const fields = contractLetterFields({
    letterDate: new Date(),
    district: districtForLetter ?? { name: districtName },
    schoolYear,
    type,
    decision: "",
    notes: formString(form, "notes"),
    missingItems: missingText || "See comments on the checklist.",
    rows: [
      {
        multiContractNumber: multi || "PT-4",
        contractorName: contractor,
        routes: routes ? routes.split(", ").filter(Boolean) : [],
      },
    ],
  });
  const buf = fillDocx(await templateBuffer("pt4"), fields);
  const fileName = `PT4-${Date.now()}.docx`;
  await saveStoredFile(`letters/${fileName}`, buf);

  let status = "drafted";
  let error: string | null = null;
  try {
    const result = await sendOutlookMail({
      to,
      cc: formString(form, "cc") || undefined,
      subject,
      body,
      attachments: [
        {
          name: fileName,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          contentBytes: buf.toString("base64"),
        },
      ],
    });
    status = result.sent ? "sent" : "drafted";
    if (!result.sent) error = result.reason;
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : "Send failed";
  }

  await prisma.emailLog.create({
    data: {
      districtId,
      toAddress: to,
      ccAddress: formString(form, "cc") || null,
      subject,
      body,
      kind: "pt4",
      status,
      error,
      sentAt: status === "sent" ? new Date() : null,
      sentById: user.id,
    },
  });
  await prisma.letter.create({
    data: {
      entityType,
      entityId,
      kind: "pt4",
      letterDate: new Date(),
      filePath: `letters/${fileName}`,
      createdById: user.id,
    },
  });
  await writeAudit({
    userId: user.id,
    action: "email",
    entityType,
    entityId,
    summary: `Prepared PT-4 (${status})`,
  });
  revalidateAll();
  return { status, error, fileUrl: `/api/files?path=${encodeURIComponent(`letters/${fileName}`)}` };
}

export async function sendDistrictEmail(form: FormData) {
  const user = await requireSession();
  if (!can(user, "send_email")) throw new Error("You do not have permission.");
  const districtId = formString(form, "districtId") || null;
  const to = formString(form, "to");
  const subject = formString(form, "subject");
  const body = formString(form, "body");
  let status = "drafted";
  let error: string | null = null;
  try {
    const result = await sendOutlookMail({
      to,
      cc: formString(form, "cc") || undefined,
      subject,
      body,
    });
    status = result.sent ? "sent" : "drafted";
    if (!result.sent) error = result.reason;
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : "Send failed";
  }
  await prisma.emailLog.create({
    data: {
      districtId,
      toAddress: to,
      ccAddress: formString(form, "cc") || null,
      subject,
      body,
      kind: formString(form, "kind") || "followup",
      status,
      error,
      sentAt: status === "sent" ? new Date() : null,
      sentById: user.id,
    },
  });
  await writeAudit({
    userId: user.id,
    action: "email",
    entityType: "district",
    entityId: districtId,
    summary: `Email ${status}: ${subject}`,
  });
  revalidateAll();
  return { status, error };
}

export async function askNjAi(question: string) {
  await requireSession();
  const { answerNjTransportationQuestion } = await import("@/lib/nj-ask");
  return answerNjTransportationQuestion(question);
}

function importRedirect(redirectTo: string, params: Record<string, string>): never {
  const next = new URLSearchParams(params);
  redirect(`${redirectTo}?${next.toString()}`);
}

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function polishDistrictEmail(form: FormData) {
  await requireSession();
  const subject = formString(form, "subject");
  const body = formString(form, "body");
  const kind = formString(form, "kind") || "followup";
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      subject,
      body,
      note: "AI rewrite is not turned on (no OpenAI key). Copy this draft into your work email as-is.",
    };
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You write short emails for the Passaic County Superintendent transportation office. Keep the facts. Plain language. No legal advice. Do not invent missing documents or dates. Return JSON only: {\"subject\":\"...\",\"body\":\"...\"}. Body is plain text, signed Passaic County Transportation.",
        },
        {
          role: "user",
          content: `Kind: ${kind}\nSubject: ${subject}\n\n${body}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    return { subject, body, note: "Could not rewrite the email just now. Copy the draft you already have." };
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content || "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { subject, body, note: "Could not rewrite the email just now. Copy the draft you already have." };
  try {
    const parsed = JSON.parse(match[0]) as { subject?: string; body?: string };
    return {
      subject: parsed.subject?.trim() || subject,
      body: parsed.body?.trim() || body,
    };
  } catch {
    return { subject, body, note: "Could not rewrite the email just now. Copy the draft you already have." };
  }
}

export async function importContractors(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const redirectTo = formString(form, "redirectTo") || "/contractors";
  const file = form.get("file") as File | null;
  const pasted = formString(form, "pasted");
  if ((!file || file.size === 0) && !pasted) {
    importRedirect(redirectTo, { error: "Choose the tracker file, or paste the rows from Excel." });
  }
  let rows: Awaited<ReturnType<typeof parseSpreadsheetFile>> = [];
  try {
    rows = file && file.size > 0 ? await parseSpreadsheetFile(file) : parseCsvText(pasted);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : "That file could not be read.";
    importRedirect(redirectTo, {
      error: `The tracker could not be read. ${message} Try Excel .xlsx, CSV, or paste the rows.`,
    });
  }
  if (!rows.length) {
    importRedirect(redirectTo, {
      error: "No data rows were found. If the tracker has a title at the top, keep the header row (Bus Company, Contractor code, and the rest) and try again.",
    });
  }
  const { parsed: records, headers } = describeSpreadsheet(rows);
  if (!records.length) {
    const found = headers.filter(Boolean).slice(0, 12).join(", ") || "none";
    importRedirect(redirectTo, {
      error: `A Bus Company / contractor name column was not found. Columns seen: ${found}.`,
    });
  }
  const schoolYear = (await getSchoolYear()) || formString(form, "schoolYear");
  let created = 0;
  let updated = 0;
  let certs = 0;
  try {
    const existing = await prisma.contractor.findMany({ where: { deletedAt: null } });

    for (const parsed of records) {
      const match =
        (parsed.ospCode
          ? existing.find((c) => c.ospCode && c.ospCode.toLowerCase() === parsed.ospCode!.toLowerCase())
          : undefined) ??
        existing.find((c) => c.legalName.toLowerCase() === parsed.legalName.toLowerCase());

      const data = {
        legalName: parsed.legalName,
        dba: parsed.dba ?? match?.dba ?? null,
        vendorCode: parsed.vendorCode ?? match?.vendorCode ?? null,
        ospCode: parsed.ospCode ?? match?.ospCode ?? null,
        busLocation: parsed.busLocation ?? match?.busLocation ?? null,
        contactName: parsed.contactName ?? match?.contactName ?? null,
        phone: parsed.phone ?? match?.phone ?? null,
        email: parsed.email ?? match?.email ?? null,
        brcNumber: parsed.brcNumber ?? match?.brcNumber ?? null,
        brcNameControl: match?.brcNameControl || nameControlFrom(parsed.legalName) || null,
        county: match?.county || parsed.county || null,
      };

      const contractor = match
        ? await prisma.contractor.update({ where: { id: match.id }, data })
        : await prisma.contractor.create({
            data: { ...data, brcStatus: "Not on file" },
          });
      if (match) {
        Object.assign(match, contractor);
        updated += 1;
      } else {
        existing.push(contractor);
        created += 1;
      }

      if (parsed.hasCertInfo && schoolYear) {
        const certCounty = resolveCertCounty(parsed.county, contractor.county);
        const cert = await prisma.annualCert.upsert({
          where: {
            contractorId_schoolYear_county: {
              contractorId: contractor.id,
              schoolYear,
              county: certCounty,
            },
          },
          update: {
            statusName: parsed.statusName,
            notes: parsed.notes,
            receivedDate: parsed.receivedDate,
            reviewedDate: parsed.reviewedDate,
            letterDate: parsed.letterDate,
            deletedAt: null,
          },
          create: {
            contractorId: contractor.id,
            schoolYear,
            county: certCounty,
            statusName: parsed.statusName,
            notes: parsed.notes,
            receivedDate: parsed.receivedDate,
            reviewedDate: parsed.reviewedDate,
            letterDate: parsed.letterDate,
          },
        });
        await ensureChecklist("cert", cert.id);
        certs += 1;
      }
    }
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : "The database could not save those rows.";
    importRedirect(redirectTo, { error: `The tracker was read, but saving failed. ${message}` });
  }

  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "contractor",
    summary: `Imported contractors from a list (${created} added, ${updated} updated, ${certs} certs)`,
  });
  revalidateAll();
  importRedirect(redirectTo, {
    imported: String(created),
    updated: String(updated),
    certs: String(certs),
  });
}

export async function saveAddendum(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const routeId = formString(form, "routeId");
  const data = {
    routeId,
    reason: formString(form, "reason"),
    description: formString(form, "description") || null,
    costChange: parseMoney(formString(form, "costChange")),
    boardMeetingDate: parseDate(formString(form, "boardMeetingDate")),
    receivedDate: parseDate(formString(form, "receivedDate")),
    notes: formString(form, "notes") || null,
  };
  const row = id
    ? await prisma.routeAddendum.update({ where: { id }, data })
    : await prisma.routeAddendum.create({ data });
  const route = await prisma.route.findUniqueOrThrow({
    where: { id: routeId },
    include: { contract: true },
  });
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "addendum",
    entityId: row.id,
    summary: `${id ? "Updated" : "Added"} addendum for route ${route.number}`,
  });
  revalidateAll();
  redirect(`/contracts/${route.contractId}/routes/${route.id}`);
}

export async function markLetterSent(form: FormData) {
  const user = await requireSession();
  if (!can(user, "approve")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const sentToDistrictAt = parseDate(formString(form, "sentToDistrictAt")) || new Date();
  const contract = await prisma.contract.findUniqueOrThrow({ where: { id } });
  const finalStatus =
    contract.statusName === "Disapproved" || contract.statusName === "Final Disapproval"
      ? "Final Disapproval"
      : "Final Approval";
  await prisma.contract.update({
    where: { id },
    data: { statusName: finalStatus, sentToDistrictAt },
  });
  await writeAudit({
    userId: user.id,
    action: "update",
    entityType: "contract",
    entityId: id,
    summary: `Marked ${finalStatus.toLowerCase()} letter sent to the district`,
  });
  revalidateAll();
}
