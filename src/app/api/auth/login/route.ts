import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { PermissionKey } from "@/lib/permissions";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, active: true },
    include: { permissions: true, assignedDistricts: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const token = await createSessionToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions.map((p) => p.permissionKey as PermissionKey),
    districtIds: user.assignedDistricts.map((d) => d.districtId),
  });

  await writeAudit({
    userId: user.id,
    action: "login",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} signed in`,
  });

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
