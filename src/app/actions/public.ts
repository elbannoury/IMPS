"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { inquirySchema, viewingSchema, reportSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { done, fail, type ActionState } from "@/lib/action-state";
import { getT } from "@/lib/i18n";
import { notifyStaff, writeAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import crypto from "node:crypto";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function hashIp(value: string): string {
  return crypto.createHash("sha256").update(`${value}:${process.env.SESSION_SECRET ?? "dev"}`).digest("hex").slice(0, 40);
}

async function nextLeadCode(): Promise<string> {
  const count = await prisma.lead.count();
  return `LD-${String(count + 1).padStart(5, "0")}`;
}

function firstErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function submitInquiryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "fr");
  const t = getT(locale);
  const ip = await clientIp();
  if (!rateLimit(`inquiry:${ip}`, 5, 10 * 60_000).ok) return fail(t("form.error"));

  const parsed = inquirySchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    message: formData.get("message") ?? "",
    consent: formData.get("consent") === "on" ? true : formData.get("consent"),
    locale: locale === "ar" ? "ar" : "fr",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) return fail(t("form.error"), firstErrors(parsed.error));
  if (parsed.data.website) return done(t("form.successInquiry")); // honeypot: silently accept

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, status: { in: ["published", "reserved"] }, deletedAt: null },
    select: { id: true, reference: true, titleFr: true },
  });
  if (!property) return fail(t("form.error"));

  const lead = await prisma.lead.create({
    data: {
      code: await nextLeadCode(),
      propertyId: property.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      message: parsed.data.message || null,
      source: "website_form",
      locale: parsed.data.locale,
      status: "new",
      ipHash: hashIp(ip),
    },
  });

  await notifyStaff({
    type: "lead.new",
    title: "Nouvelle demande client",
    body: `${property.reference} — ${parsed.data.name}`,
    link: "/admin/crm",
  });
  await writeAudit({
    action: "lead.create",
    entityType: "lead",
    entityId: lead.id,
    summary: `Public inquiry received for ${property.reference}`,
  });

  const sessionUser = await getSessionUser();
  if (sessionUser) {
    await prisma.lead.update({ where: { id: lead.id }, data: { createdById: sessionUser.id } });
  }

  return done(t("form.successInquiry"));
}

export async function submitViewingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "fr");
  const t = getT(locale);
  const ip = await clientIp();
  if (!rateLimit(`viewing:${ip}`, 4, 10 * 60_000).ok) return fail(t("form.error"));

  const parsed = viewingSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    requestedDate: formData.get("requestedDate"),
    requestedTime: formData.get("requestedTime"),
    message: formData.get("message") ?? "",
    consent: formData.get("consent") === "on" ? true : formData.get("consent"),
    locale: locale === "ar" ? "ar" : "fr",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) return fail(t("form.error"), firstErrors(parsed.error));
  if (parsed.data.website) return done(t("form.successViewing"));

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, status: { in: ["published", "reserved"] }, deletedAt: null },
    select: { id: true, reference: true },
  });
  if (!property) return fail(t("form.error"));

  const requestedAt = new Date(`${parsed.data.requestedDate}T${parsed.data.requestedTime}:00`);
  if (Number.isNaN(requestedAt.getTime()) || requestedAt.getTime() < Date.now() - 86_400_000) {
    return fail(t("form.error"), { requestedDate: "INVALID_DATE" });
  }

  // Re-use an open lead for the same phone + property to avoid duplicates.
  const existingLead = await prisma.lead.findFirst({
    where: { propertyId: property.id, phone: parsed.data.phone, status: { notIn: ["converted", "lost"] } },
    orderBy: { createdAt: "desc" },
  });

  const lead =
    existingLead ??
    (await prisma.lead.create({
      data: {
        code: await nextLeadCode(),
        propertyId: property.id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        message: parsed.data.message || null,
        source: "viewing_form",
        locale: parsed.data.locale,
        status: "new",
        ipHash: hashIp(ip),
      },
    }));

  const duplicate = await prisma.viewingAppointment.findFirst({
    where: { propertyId: property.id, visitorPhone: parsed.data.phone, requestedAt, status: { notIn: ["cancelled"] } },
  });
  if (duplicate) return done(t("form.successViewing"));

  const appointment = await prisma.viewingAppointment.create({
    data: {
      leadId: lead.id,
      propertyId: property.id,
      visitorName: parsed.data.name,
      visitorPhone: parsed.data.phone,
      visitorEmail: parsed.data.email || null,
      requestedAt,
      status: "requested",
      staffNotes: parsed.data.message || null,
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: lead.status === "new" ? "new" : lead.status },
  });

  await notifyStaff({
    type: "viewing.requested",
    title: "Demande de visite",
    body: `${property.reference} — ${parsed.data.name}, ${parsed.data.requestedDate} ${parsed.data.requestedTime}`,
    link: "/admin/appointments",
  });
  await writeAudit({
    action: "viewing.request",
    entityType: "viewing_appointment",
    entityId: appointment.id,
    summary: `Viewing requested for ${property.reference} (status: requested, not confirmed)`,
  });

  return done(t("form.successViewing"));
}

export async function submitContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "fr");
  const t = getT(locale);
  const ip = await clientIp();
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60_000).ok) return fail(t("form.error"));

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const honeypot = String(formData.get("website") ?? "");
  if (honeypot) return done(t("form.successInquiry"));
  if (name.length < 2 || message.length < 5) return fail(t("form.error"), { name: "NAME_REQUIRED", message: "MESSAGE_REQUIRED" });
  if (!phone && !email) return fail(t("form.error"), { phone: "CONTACT_REQUIRED" });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(t("form.error"), { email: "INVALID_EMAIL" });

  const lead = await prisma.lead.create({
    data: {
      code: await nextLeadCode(),
      name,
      phone: phone || null,
      email: email || null,
      message,
      source: "website_form",
      locale,
      status: "new",
      ipHash: hashIp(ip),
    },
  });
  await notifyStaff({
    type: "lead.new",
    title: "Message via la page contact",
    body: `${name}${phone ? ` — ${phone}` : ""}`,
    link: `/admin/crm/${lead.id}`,
  });
  return done(t("form.successInquiry"));
}

export async function submitReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "fr");
  const t = getT(locale);
  const ip = await clientIp();
  if (!rateLimit(`report:${ip}`, 5, 10 * 60_000).ok) return fail(t("form.error"));

  const parsed = reportSchema.safeParse({
    propertyId: formData.get("propertyId"),
    reason: formData.get("reason"),
    details: formData.get("details") ?? "",
    email: formData.get("email") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) return fail(t("form.error"));
  if (parsed.data.website) return done(t("report.success"));

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, deletedAt: null },
    select: { id: true, reference: true },
  });
  if (!property) return fail(t("form.error"));

  const reasons: Record<string, string> = {
    price: "Prix incorrect",
    unavailable: "Bien déjà vendu ou loué",
    info: "Information inexacte",
    other: "Autre",
  };

  const lead = await prisma.lead.create({
    data: {
      code: await nextLeadCode(),
      propertyId: property.id,
      name: "Signalement public",
      email: parsed.data.email || null,
      message: `${reasons[parsed.data.reason] ?? parsed.data.reason}${parsed.data.details ? ` — ${parsed.data.details}` : ""}`,
      source: "report",
      locale,
      status: "new",
      priority: "high",
      ipHash: hashIp(ip),
    },
  });

  await notifyStaff({
    type: "report.received",
    title: "Signalement d'annonce",
    body: `${property.reference} — ${reasons[parsed.data.reason] ?? parsed.data.reason}`,
    link: `/admin/crm/${lead.id}`,
  });

  return done(t("report.success"));
}
