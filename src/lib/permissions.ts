export const PERMISSIONS = [
  { key: "view", label: "View records" },
  { key: "create", label: "Create records" },
  { key: "edit", label: "Edit records" },
  { key: "delete", label: "Delete records" },
  { key: "approve", label: "Approve or disapprove" },
  { key: "send_email", label: "Send email to districts" },
  { key: "manage_users", label: "Manage users and permissions" },
  { key: "manage_statuses", label: "Add, edit, or delete statuses" },
  { key: "manage_templates", label: "Manage letter and PT-4 templates" },
  { key: "upload_files", label: "Upload insurance and bid specs" },
  { key: "edit_districts", label: "Edit district names and letter addresses" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export async function ensurePermissions() {
  const { prisma } = await import("./prisma");
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label },
      create: { key: p.key, label: p.label },
    });
  }
}
