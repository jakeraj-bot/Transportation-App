import { CONTRACT_TYPES, splitRoutes } from "./utils";

export const INTAKE_TYPES = [
  {
    value: "renewal",
    title: "Renewals",
    hint: "District, bus company, multi-contract numbers, routes, bid number, and renewal number.",
  },
  {
    value: "original",
    title: "Originals",
    hint: "District, bus company, multi-contract number, routes, and bid number.",
  },
  {
    value: "quote",
    title: "Quotes",
    hint: "District, bus company, multi-contract number, and routes.",
  },
  {
    value: "parental",
    title: "Parentals",
    hint: "District, parent name, multi-contract number, and routes.",
  },
  {
    value: "joint",
    title: "Joint agreements",
    hint: "Host district, joiner district, bus company, multi-contract number, and routes.",
  },
  {
    value: "addendum",
    title: "Addendums",
    hint: "Find an existing multi-contract number and route, then confirm before linking.",
  },
] as const;

export type IntakeType = (typeof INTAKE_TYPES)[number]["value"];

export function isIntakeType(value: string | null | undefined): value is IntakeType {
  return INTAKE_TYPES.some((row) => row.value === value);
}

export function allowsMultipleCompanies(type: string) {
  return type === "original" || type === "renewal" || type === "joint";
}

export function allowsMultiplePackets(type: string) {
  return type === "renewal";
}

export function showsBidNumber(type: string) {
  return type === "original" || type === "renewal" || type === "addendum";
}

export function showsRenewalNumber(type: string) {
  return type === "renewal" || type === "addendum";
}

export function usesParentName(type: string) {
  return type === "parental";
}

export function usesHostJoiner(type: string) {
  return type === "joint";
}

export function usesBusCompany(type: string) {
  return type !== "parental" && type !== "addendum";
}

export type PacketRow = {
  multiContractNumber: string;
  routeNumber: string;
  renewalNumber: string;
};

export function parsePacketRows(form: FormData): PacketRow[] {
  const packets = zipFields(form, ["packetMulti", "packetRoute", "packetRenewal"]).map(([multi, route, renewal]) => ({
    multiContractNumber: multi,
    routeNumber: route,
    renewalNumber: renewal,
  }));
  if (packets.some((row) => row.multiContractNumber || row.routeNumber || row.renewalNumber)) {
    return packets.filter((row) => row.multiContractNumber);
  }
  const extras = zipFields(form, ["extraMultiContractNumber", "extraRouteNumber", "extraRenewalNumber"]).map(
    ([multi, route, renewal]) => ({
      multiContractNumber: multi,
      routeNumber: route,
      renewalNumber: renewal,
    })
  );
  const primary: PacketRow = {
    multiContractNumber: String(form.get("multiContractNumber") ?? "").trim(),
    routeNumber: String(form.get("routes") ?? "").trim(),
    renewalNumber: String(form.get("renewalNumber") ?? "").trim(),
  };
  return [primary, ...extras].filter((row) => row.multiContractNumber);
}

export function primaryAndExtraPackets(rows: PacketRow[]) {
  const [primary, ...rest] = rows;
  return {
    primary: primary ?? { multiContractNumber: "", routeNumber: "", renewalNumber: "" },
    extras: rest.filter((row) => row.multiContractNumber && row.routeNumber),
    routeNumbers: rows.flatMap((row) => splitRoutes(row.routeNumber)),
  };
}

export function parseContractorIds(form: FormData) {
  return [...new Set(form.getAll("contractorId").map((value) => String(value ?? "").trim()).filter(Boolean))];
}

export function parseJoinerDistricts(form: FormData) {
  const names = form
    .getAll("joinerDistrictName")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return names.join("; ") || String(form.get("joinerDistricts") ?? "").trim() || null;
}

export function formatCompanyNames(names: Array<string | null | undefined>) {
  const clean = names.map((name) => (name ?? "").trim()).filter(Boolean);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
}

export function intakeTypeLabel(type: string) {
  return INTAKE_TYPES.find((row) => row.value === type)?.title ?? CONTRACT_TYPES.find((row) => row.value === type)?.label ?? type;
}

function zipFields(form: FormData, names: [string, string, string]) {
  const a = form.getAll(names[0]).map((value) => String(value ?? "").trim());
  const b = form.getAll(names[1]).map((value) => String(value ?? "").trim());
  const c = form.getAll(names[2]).map((value) => String(value ?? "").trim());
  const length = Math.max(a.length, b.length, c.length);
  return Array.from({ length }, (_, index) => [a[index] ?? "", b[index] ?? "", c[index] ?? ""] as const);
}
