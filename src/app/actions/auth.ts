"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  hashToken,
  randomToken,
  requireStaffAction,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema, registerSchema, staffCreateSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { fail, type ActionState } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { getT } from "@/lib/i18n";

async function ip(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function staffLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "fr");
  const t = getT(locale);
  const limit = rateLimit(`staff-login:${await ip()}`, 8, 5 * 60_000);
  if (!limit.ok) return fail(t("form.error"));

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(t("admin.login.failed"));

  const profile = await prisma.profile.findUnique({
    where: { email: parsed.data.email },
    include: { role: true },
  });
  if (!profile || !profile.isStaff || !profile.isActive || !profile.role) {
    return fail(t("admin.login.failed"));
  }
  const valid = await verifyPassword(parsed.data.password, profile.passwordHash);
  if (!valid) return fail(t("admin.login.failed"));

  await createSession(profile.id);
  await prisma.profile.update({ where: { id: profile.id }, data: { lastLoginAt: new Date() } });
  redirect("/admin");
}

export async function staffLogoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

export async function customerRegisterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "fr");
  const t = getT(locale);
  const limit = rateLimit(`register:${await ip()}`, 5, 10 * 60_000);
  if (!limit.ok) return fail(t("form.error"));

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    locale: locale === "ar" ? "ar" : "fr",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return fail(t("form.error"), fieldErrors);
  }

  const existing = await prisma.profile.findUnique({ where: { email: parsed.data.email } });
  if (existing) return fail(t("form.error"), { email: "EMAIL_TAKEN" });

  const profile = await prisma.profile.create({
    data: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      passwordHash: await hashPassword(parsed.data.password),
      locale: parsed.data.locale,
      isStaff: false,
    },
  });

  // Verification token. Until an email provider is configured, the link is
  // logged server-side and the UI states that email is not configured.
  const token = randomToken(24);
  await prisma.emailToken.create({
    data: {
      tokenHash: hashToken(token),
      profileId: profile.id,
      type: "verify_email",
      expiresAt: new Date(Date.now() + 2 * 86_400_000),
    },
  });
  console.log(`[IMPS] email verification link: /${locale}/verify?token=${token}`);
  await createSession(profile.id);
  redirect(`/${locale}/account?registered=1`);
}

export async function customerLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "fr");
  const t = getT(locale);
  const limit = rateLimit(`login:${await ip()}`, 10, 5 * 60_000);
  if (!limit.ok) return fail(t("form.error"));

  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail(t("auth.invalid"));

  const profile = await prisma.profile.findUnique({ where: { email: parsed.data.email } });
  if (!profile || !profile.isActive) return fail(t("auth.invalid"));
  const valid = await verifyPassword(parsed.data.password, profile.passwordHash);
  if (!valid) return fail(t("auth.invalid"));

  await createSession(profile.id);
  redirect(profile.isStaff ? "/admin" : `/${locale}/account`);
}

export async function customerLogoutAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr");
  await destroySession();
  redirect(`/${locale}`);
}

export async function verifyEmailAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const locale = String(formData.get("locale") ?? "fr");
  const row = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (row && row.type === "verify_email" && !row.usedAt && row.expiresAt > new Date()) {
    await prisma.$transaction([
      prisma.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      prisma.profile.update({ where: { id: row.profileId }, data: { emailVerifiedAt: new Date() } }),
    ]);
  }
  redirect(`/${locale}/account?verified=${row ? 1 : 0}`);
}

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "fr");
  const user = await getSessionUser();
  if (!user || user.isStaff) redirect(`/${locale}`);
  await prisma.profile.update({
    where: { id: user.id },
    data: {
      isActive: false,
      email: `deleted+${user.id}@invalid.local`,
      fullName: "Compte supprimé",
      passwordHash: await hashPassword(randomToken()),
    },
  });
  await prisma.savedProperty.deleteMany({ where: { profileId: user.id } });
  await prisma.savedSearch.deleteMany({ where: { profileId: user.id } });
  await prisma.session.deleteMany({ where: { profileId: user.id } });
  await destroySession();
  redirect(`/${locale}?deleted=1`);
}

export async function createStaffAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("staff.manage");

  const parsed = staffCreateSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    roleKey: formData.get("roleKey"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/admin/staff?error=INVALID");

  if (parsed.data.roleKey === "owner" && user.roleKey !== "owner") {
    redirect("/admin/staff?error=FORBIDDEN_ROLE");
  }
  const existing = await prisma.profile.findUnique({ where: { email: parsed.data.email } });
  if (existing) redirect("/admin/staff?error=EMAIL_TAKEN");

  const role = await prisma.role.findUnique({ where: { key: parsed.data.roleKey } });
  if (!role) redirect("/admin/staff?error=INVALID");

  const profile = await prisma.profile.create({
    data: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      passwordHash: await hashPassword(parsed.data.password),
      isStaff: true,
      isActive: true,
      emailVerifiedAt: new Date(),
      roleId: role.id,
      locale: "fr",
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "staff.create",
    entityType: "profile",
    entityId: profile.id,
    summary: `Staff account created: ${profile.email} (${role.key})`,
  });
  redirect("/admin/staff?created=1");
}

export async function updateStaffRoleAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("staff.manage");
  const profileId = String(formData.get("profileId") ?? "");
  const roleKey = String(formData.get("roleKey") ?? "");
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, include: { role: true } });
  if (!profile) redirect("/admin/staff?error=NOT_FOUND");
  if (profile.role?.key === "owner") redirect("/admin/staff?error=OWNER_PROTECTED");
  if (profile.id === user.id) redirect("/admin/staff?error=SELF_ROLE");
  const role = await prisma.role.findUnique({ where: { key: roleKey } });
  if (!role) redirect("/admin/staff?error=INVALID");
  if (role.key === "owner" && user.roleKey !== "owner") redirect("/admin/staff?error=FORBIDDEN_ROLE");

  await prisma.profile.update({ where: { id: profileId }, data: { roleId: role.id } });
  await writeAudit({
    actorId: user.id,
    action: "staff.role_change",
    entityType: "profile",
    entityId: profileId,
    summary: `Role changed for ${profile.email}: ${profile.role?.key ?? "—"} → ${role.key}`,
    before: { role: profile.role?.key },
    after: { role: role.key },
  });
  redirect("/admin/staff?role=1");
}

export async function setStaffActiveAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("staff.manage");
  const profileId = String(formData.get("profileId") ?? "");
  const activate = String(formData.get("activate") ?? "") === "1";
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, include: { role: true } });
  if (!profile) redirect("/admin/staff?error=NOT_FOUND");
  if (profile.role?.key === "owner") redirect("/admin/staff?error=OWNER_PROTECTED");
  if (profile.id === user.id) redirect("/admin/staff?error=SELF_ROLE");

  await prisma.$transaction([
    prisma.profile.update({ where: { id: profileId }, data: { isActive: activate } }),
    ...(activate ? [] : [prisma.session.deleteMany({ where: { profileId } })]),
  ]);
  await writeAudit({
    actorId: user.id,
    action: activate ? "staff.activate" : "staff.deactivate",
    entityType: "profile",
    entityId: profileId,
    summary: `${profile.email} ${activate ? "reactivated" : "deactivated"}`,
  });
  redirect("/admin/staff?active=1");
}
