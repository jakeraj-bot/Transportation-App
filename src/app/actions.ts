"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { can, requireSession } from "@/lib/auth";
import { isSuperAdmin, ROLE_PERMISSIONS } from "@/lib/roles";
import { ALL_PERMISSION_KEYS, ensurePermissions } from "@/lib/permissions";
import { parseHomePrefs } from "@/lib/home-prefs";
import { parseRoutePacket } from "@/lib/extract-routes";
import { writeAudit } from "@/lib/audit";
import { ensureChecklist, getSetting, refreshContractFlags } from "@/lib/data";
import {
  contractLetterTemplateKey,
  contractTypeLabel,
  nameControlFrom,
  parseDate,
  parseMoney,
  parsePercent,
  splitRoutes,
} from "@/lib/utils";
import { buildLabelPdf, mergePdfs, type LabelKind } from "@/lib/labels";
import {
  contractLetterFields,
  defaultLetterDocx,
  fillDocx,
} from "@/lib/docx";
import { readStoredFile, saveStoredFile } from "@/lib/storage";
import { sendOutlookMail } from "@/lib/email";
import { extractBidSpec, fileToText } from "@/lib/extract-bid-spec";

function formString(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
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
    notes: formString(form, "notes") || null,
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
    incomplete: false,
    notes: formString(form, "notes") || null,
  };
  const row = id
    ? await prisma.contractor.update({ where: { id }, data })
    : await prisma.contractor.create({
        data: { ...data, brcVerifiedAt: data.brcVerifiedAt ?? null },
      });
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

export async function addQuickContractor(legalName: string) {
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
    if (!wanted.has(route.number) && route.addenda.length === 0) {
      await prisma.route.delete({ where: { id: route.id } });
    }
  }
  for (const number of numbers) {
    if (!existing.some((r) => r.number === number)) {
      await prisma.route.create({ data: { contractId, number } });
    }
  }
}

async function syncExtraPackets(
  contractId: string,
  packets: Array<{ multiContractNumber: string; routeNumber: string }>
) {
  await prisma.extraPacket.deleteMany({ where: { contractId } });
  const rows = packets.filter((p) => p.multiContractNumber && p.routeNumber);
  if (!rows.length) return;
  await prisma.extraPacket.createMany({
    data: rows.map((packet, sortOrder) => ({
      contractId,
      multiContractNumber: packet.multiContractNumber,
      routeNumber: packet.routeNumber,
      sortOrder,
    })),
  });
}

function extraPacketsFromForm(form: FormData) {
  const multis = form.getAll("extraMultiContractNumber").map((value) => String(value ?? "").trim());
  const routes = form.getAll("extraRouteNumber").map((value) => String(value ?? "").trim());
  return multis.map((multiContractNumber, index) => ({
    multiContractNumber,
    routeNumber: routes[index] ?? "",
  }));
}

export async function saveContract(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const mode = formString(form, "mode") || "intake";
  const routes = splitRoutes(formString(form, "routes"));
  const statusName = formString(form, "statusName") || "Need Review";
  const schoolYear = formString(form, "schoolYear");
  const type = formString(form, "type");
  const extras = extraPacketsFromForm(form);

  if (!id && type === "addendum") {
    const multi = formString(form, "multiContractNumber");
    const districtId = formString(form, "districtId");
    const existing = await prisma.contract.findFirst({
      where: {
        multiContractNumber: multi,
        schoolYear,
        deletedAt: null,
        ...(districtId ? { districtId } : {}),
      },
      include: { routes: { include: { addenda: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: "asc" },
    });
    if (!existing) {
      redirect(
        "/contracts/new?error=" +
          encodeURIComponent(
            "No existing contract has that multi-contract number and school year. An addendum has to attach to a route that is already on file."
          )
      );
    }
    const wanted = routes.map((number) => number.toLowerCase());
    const matched = existing.routes.filter((route) => wanted.includes(route.number.toLowerCase()));
    if (!matched.length) {
      redirect(
        `/contracts/new?error=` +
          encodeURIComponent(
            `Contract ${existing.multiContractNumber} is on file, but none of those route numbers match. Open that contract and add the route first, then try the addendum again.`
          )
      );
    }
    const previousCount = matched.reduce((sum, route) => sum + route.addenda.length, 0);
    for (const route of matched) {
      await prisma.routeAddendum.create({
        data: {
          routeId: route.id,
          reason: formString(form, "notes") || `Addendum ${route.addenda.length + 1}`,
          receivedDate: parseDate(formString(form, "receivedDate")),
          notes: formString(form, "notes") || null,
        },
      });
    }
    const nextCount = previousCount + matched.length;
    await writeAudit({
      userId: user.id,
      action: "create",
      entityType: "addendum",
      entityId: existing.id,
      summary: `Linked addendum to ${existing.multiContractNumber} (${nextCount} addendum${nextCount === 1 ? "" : "s"} on matching routes)`,
    });
    revalidateAll();
    redirect(
      `/contracts/${existing.id}?addendumLinked=1&addendumCount=${nextCount}&routeCount=${matched.length}`
    );
  }

  const intake = {
    districtId: formString(form, "districtId"),
    contractorId: formString(form, "contractorId"),
    schoolYear,
    type,
    multiContractNumber: formString(form, "multiContractNumber"),
    receivedDate: parseDate(formString(form, "receivedDate")),
    statusName,
    notes: formString(form, "notes") || null,
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
          ...(type === "joint"
            ? {
                hostDistrictId: formString(form, "hostDistrictId") || null,
                joinerDistricts: formString(form, "joinerDistricts") || null,
              }
            : {}),
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
  await syncExtraPackets(row.id, extras);

  if (mode === "review" && type === "original") {
    const linkedRoutes = form.getAll("routeDescriptionIds").map(String).filter(Boolean);
    await prisma.contractRouteDescription.deleteMany({ where: { contractId: row.id } });
    for (const routeDescriptionId of linkedRoutes) {
      await prisma.contractRouteDescription.create({
        data: { contractId: row.id, routeDescriptionId },
      });
    }
  }

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

export async function saveCert(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const id = formString(form, "id");
  const data = {
    contractorId: formString(form, "contractorId"),
    schoolYear: formString(form, "schoolYear"),
    statusName: formString(form, "statusName") || "Need review",
    notes: formString(form, "notes") || null,
  };
  const row = id
    ? await prisma.annualCert.update({ where: { id }, data })
    : await prisma.annualCert.upsert({
        where: {
          contractorId_schoolYear: {
            contractorId: data.contractorId,
            schoolYear: data.schoolYear,
          },
        },
        update: data,
        create: data,
      });
  await ensureChecklist("cert", row.id);
  await writeAudit({
    userId: user.id,
    action: id ? "update" : "create",
    entityType: "cert",
    entityId: row.id,
    summary: `Updated annual cert for ${data.schoolYear}`,
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
    color: formString(form, "color") || "teal",
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
    })
  );
  await prisma.user.update({
    where: { id: user.id },
    data: { homePrefs: JSON.stringify(prefs) },
  });
  revalidateAll();
  redirect("/settings?homeSaved=1");
}

export async function uploadTemplate(form: FormData) {
  try {
    const user = await requireSession();
    if (!can(user, "manage_templates") || !isSuperAdmin(user.role)) {
      redirect("/settings?uploadError=" + encodeURIComponent("Your login cannot change letter templates. Ask Super Admin."));
    }
    const key = formString(form, "key");
    const file = form.get("file") as File | null;
    if (!file || file.size === 0) {
      redirect("/settings?uploadError=" + encodeURIComponent("Please choose a Word document."));
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
      redirect("/settings?uploadError=" + encodeURIComponent("Please upload a Word .docx file, not a PDF or older .doc file."));
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      redirect(
        "/settings?uploadError=" +
          encodeURIComponent("That Word file is too large for the live site (about 4 MB). In Word use File → Compress Pictures, then try again.")
      );
    }
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
    redirect("/settings?uploaded=1");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("uploadTemplate failed", error);
    redirect(
      "/settings?uploadError=" +
        encodeURIComponent("The live site could not save that letter. Try a smaller .docx, or wait a moment and upload again.")
    );
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
  const typed = contractLetterTemplateKey(key, contractType);
  const generic = `contract_${key}`;
  const lookups = typed === generic ? [generic] : [typed, generic];
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
      routes: { include: { addenda: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } } },
    },
  });
  if (contracts.length !== ids.length) throw new Error("One of those contracts could not be found.");
  const first = contracts[0];
  if (contracts.some((row) => row.type !== first.type)) {
    throw new Error("All contracts on one letter must be the same type.");
  }
  if (contracts.some((row) => row.districtId !== first.districtId)) {
    throw new Error("All contracts on one letter must be for the same district.");
  }
  if (contracts.some((row) => row.schoolYear !== first.schoolYear)) {
    throw new Error("All contracts on one letter must be for the same school year.");
  }
  const ordered = ids.map((id) => contracts.find((row) => row.id === id)!);
  const notes = formString(form, "notes");
  const fields = contractLetterFields({
    letterDate,
    district: first.district,
    schoolYear: first.schoolYear,
    type: contractTypeLabel(first.type),
    decision: kind === "approved" ? "approved" : "disapproved",
    notes,
    rows: ordered.flatMap((row) => [
      {
        multiContractNumber: row.multiContractNumber,
        contractorName: row.contractor.legalName,
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
        contractorName: row.contractor.legalName,
        vendorCode: row.contractor.vendorCode,
        routes: packet.routeNumber ? [packet.routeNumber] : [],
        addendumNumbers: [] as string[],
        hostDistrictName: row.hostDistrict?.name,
        jointDistrict: row.joinerDistricts,
        receivedDate: row.receivedDate,
      })),
    ]),
  });
  const buf = fillDocx(await templateBuffer(kind, first.type), fields);
  const fileName = `${kind}-${first.district.name}-${first.type}-${ordered.length}-${Date.now()}.docx`.replace(/\s+/g, "_");
  await saveStoredFile(`letters/${fileName}`, buf);
  const statusName = kind === "approved" ? "Approved" : "Disapproved";
  for (const row of ordered) {
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
      summary: `${kind === "approved" ? "Approved" : "Disapproved"} contract ${row.multiContractNumber}${ordered.length > 1 ? ` on a ${ordered.length}-contract letter` : ""}`,
    });
  }
  revalidateAll();
  return `/api/files?path=${encodeURIComponent(`letters/${fileName}`)}`;
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
  if (!file || file.size === 0) {
    redirect(`/contracts/${id}`);
  }
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
  redirect(`/contracts/${id}`);
}

export async function addContractComment(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const contractId = formString(form, "contractId");
  const body = formString(form, "body");
  if (!body) redirect(`/contracts/${contractId}`);
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
  redirect(`/contracts/${contractId}`);
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
  redirect(`/contracts/${comment.contractId}`);
}

export async function generatePt4AndEmail(form: FormData) {
  const user = await requireSession();
  if (!can(user, "send_email")) throw new Error("You do not have permission.");
  const entityType = formString(form, "entityType");
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
  let districtForLetter: { name: string; street?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null =
    null;
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
  } else if (entityType === "cert") {
    const cert = await prisma.annualCert.findUniqueOrThrow({
      where: { id: entityId },
      include: { contractor: true },
    });
    contractor = cert.contractor.legalName;
    schoolYear = cert.schoolYear;
    type = "Annual certification";
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
  const { NJ_KNOWLEDGE } = await import("@/lib/nj-knowledge");
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are the Passaic County transportation office assistant. Answer only from the New Jersey transportation materials provided. Cite N.J.A.C. or N.J.S.A. sections. Use short, clear sentences for county staff. If you are not sure, say so.",
          },
          { role: "system", content: NJ_KNOWLEDGE },
          { role: "user", content: question },
        ],
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content || "I could not get an answer just now.";
    }
  }

  const q = question.toLowerCase();
  const chunks = NJ_KNOWLEDGE.split("\n## ").map((c, i) => (i === 0 ? c : `## ${c}`));
  const scored = chunks
    .map((chunk) => {
      const words = q.split(/\W+/).filter((w) => w.length > 3);
      const score = words.reduce((n, w) => n + (chunk.toLowerCase().includes(w) ? 1 : 0), 0);
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored.filter((s) => s.score > 0).slice(0, 2);
  if (!best.length) {
    return "I can answer from N.J.A.C. 6A:27 and N.J.S.A. 18A:39. Try asking about contracts, renewals, quotes, insurance, annual certifications, or bid specs. Add an OpenAI key in .env for fuller answers.";
  }
  return `From the New Jersey transportation materials we keep in this office:\n\n${best.map((b) => b.chunk.trim()).join("\n\n")}`;
}

export async function importContractors(form: FormData) {
  const user = await requireSession();
  if (!can(user, "create") && !can(user, "edit")) throw new Error("You do not have permission.");
  const file = form.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Please choose a CSV file.");
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) throw new Error("That file did not have any contractor rows.");
  let created = 0;
  for (const row of rows) {
    const legalName = row.legalName || row.name || row.contractor || "";
    if (!legalName) continue;
    await prisma.contractor.create({
      data: {
        legalName,
        dba: row.dba || null,
        vendorCode: row.vendorCode || row.vendor || null,
        ospCode: row.ospCode || row.osp || null,
        busLocation: row.busLocation || row.location || null,
        contactName: row.contactName || row.contact || null,
        phone: row.phone || null,
        email: row.email || null,
        brcNumber: row.brcNumber || row.certificateNumber || null,
        brcNameControl: nameControlFrom(row.brcNameControl || legalName) || null,
        brcStatus: "Not on file",
      },
    });
    created += 1;
  }
  await writeAudit({
    userId: user.id,
    action: "create",
    entityType: "contractor",
    summary: `Imported ${created} contractors from a list`,
  });
  revalidateAll();
  redirect("/contractors");
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [] as Array<Record<string, string>>;
  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/[^a-zA-Z0-9]/g, ""));
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (cells[i] || "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
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
  redirect(`/contracts/${id}`);
}
