import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { PermissionKey } from "./permissions";

const COOKIE = "pct_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: PermissionKey[];
  districtIds: string[];
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export const SESSION_COOKIE = COOKIE;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    districtIds: user.districtIds,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function createSession(user: SessionUser) {
  const token = await createSessionToken(user);
  const jar = await cookies();
  jar.set(COOKIE, token, sessionCookieOptions);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.sub),
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: String(payload.role ?? "staff"),
      permissions: (payload.permissions as PermissionKey[]) ?? [],
      districtIds: (payload.districtIds as string[]) ?? [],
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("You need to sign in.");
  return session;
}

export function can(user: SessionUser | null, key: PermissionKey) {
  return Boolean(user?.permissions.includes(key));
}

export async function loadUserSession(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, active: true },
    include: { permissions: true, assignedDistricts: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions.map((p) => p.permissionKey as PermissionKey),
    districtIds: user.assignedDistricts.map((d) => d.districtId),
  };
}
