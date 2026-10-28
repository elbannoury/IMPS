import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { can, permissionsForRole, type Permission } from "./rbac";

export const SESSION_COOKIE = "imps_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  locale: string;
  roleKey: string | null;
  isStaff: boolean;
  permissions: Permission[];
};

export class AuthzError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "AuthzError";
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 11);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
    ip: forwarded?.split(",")[0]?.trim() ?? null,
  };
}

export async function createSession(profileId: string): Promise<void> {
  const token = randomToken(32);
  const meta = await requestMeta();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), profileId, expiresAt, ...meta },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Session lookup, deduplicated per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { profile: { include: { role: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  const profile = session.profile;
  if (!profile.isActive) return null;
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    locale: profile.locale,
    roleKey: profile.role?.key ?? null,
    isStaff: profile.isStaff,
    permissions: permissionsForRole(profile.role?.key),
  };
});

export function hasPermission(user: SessionUser | null, permission: Permission): boolean {
  return !!user && user.isStaff && can(user.roleKey, permission);
}

/** Page-level guard: redirects instead of throwing. */
export async function requireStaffPage(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !user.isStaff) redirect("/admin/login");
  if (permission && !hasPermission(user, permission)) redirect("/admin?denied=1");
  return user;
}

/** Action-level guard: throws so the caller can surface a structured error. */
export async function requireStaffAction(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !user.isStaff) throw new AuthzError("NOT_AUTHENTICATED");
  if (permission && !hasPermission(user, permission)) throw new AuthzError("FORBIDDEN");
  return user;
}

export async function requireUserAction(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthzError("NOT_AUTHENTICATED");
  return user;
}
