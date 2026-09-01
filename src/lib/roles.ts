import type { PermissionKey } from "./permissions";

export const ROLES = [
  {
    key: "super_admin",
    label: "Super Admin",
    hint: "Sees everything, including Activity. Assigns districts and users.",
  },
  {
    key: "reviewer",
    label: "Contract reviewer",
    hint: "Reviews and approves contracts. Can be assigned specific districts.",
  },
  {
    key: "intake",
    label: "Intake",
    hint: "Enters contracts when they arrive and handles annual certifications.",
  },
  {
    key: "office_manager",
    label: "Office manager",
    hint: "Watches status and progress. Can review a contract when needed.",
  },
  {
    key: "route_reviewer",
    label: "Route and bid spec reviewer",
    hint: "Works route descriptions (including emergency quotes) and bid specs.",
  },
  {
    key: "staff",
    label: "Staff",
    hint: "View-only unless you turn on extra permissions.",
  },
] as const;

export type RoleKey = (typeof ROLES)[number]["key"];

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  super_admin: [
    "view",
    "create",
    "edit",
    "delete",
    "approve",
    "send_email",
    "manage_users",
    "manage_statuses",
    "manage_templates",
    "upload_files",
  ],
  reviewer: ["view", "create", "edit", "approve", "send_email", "upload_files"],
  intake: ["view", "create", "edit", "upload_files"],
  office_manager: ["view", "edit", "approve"],
  route_reviewer: ["view", "create", "edit", "approve", "upload_files"],
  staff: ["view"],
};

export const CONTRACT_STATUSES = [
  { name: "Need Review", color: "amber" },
  { name: "1st review missing items", color: "blue" },
  { name: "2nd review", color: "teal" },
  { name: "Approved", color: "sage" },
  { name: "Disapproved", color: "rose" },
  { name: "Final Approval", color: "sage" },
  { name: "Final Disapproval", color: "rose" },
  { name: "Trenton Log", color: "blue" },
  { name: "Cancelled", color: "rose" },
  { name: "Sent Back to District", color: "amber" },
] as const;

export function isSuperAdmin(role?: string | null) {
  return role === "super_admin";
}
