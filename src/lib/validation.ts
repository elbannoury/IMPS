import { z } from "zod";
import { PROPERTY_STATUSES, SOURCING_STAGES, LEAD_STATUSES, APPOINTMENT_STATUSES } from "./status";

const optionalString = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : undefined;
  });

const optionalFloat = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  });

const checkbox = z
  .union([z.boolean(), z.string(), z.undefined()])
  .transform((v) => v === true || v === "on" || v === "true" || v === "1");

export const PHONE_RE = /^(\+?[0-9][0-9\s().-]{6,18})$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const propertyInputSchema = z
  .object({
    titleFr: z.string().trim().min(6, "TITLE_TOO_SHORT").max(140),
    titleAr: optionalString(140),
    descriptionFr: z.string().trim().min(40, "DESCRIPTION_TOO_SHORT").max(8000),
    descriptionAr: optionalString(8000),
    categoryId: z.string().min(1, "CATEGORY_REQUIRED"),
    transactionType: z.enum(["sale", "rent"]),
    cityId: z.string().min(1, "CITY_REQUIRED"),
    neighborhoodId: optionalString(40),
    addressLine: optionalString(200),
    locationPrecision: z.enum(["exact", "approximate", "city_only"]).default("approximate"),
    latitude: optionalFloat,
    longitude: optionalFloat,
    builtArea: optionalFloat,
    landArea: optionalFloat,
    bedrooms: optionalInt,
    bathrooms: optionalInt,
    floors: optionalInt,
    floorNumber: optionalInt,
    parkingSpaces: optionalInt,
    yearBuilt: optionalInt,
    condition: z.enum(["new", "excellent", "good", "needs_work"]).optional(),
    furnished: z
      .union([z.boolean(), z.string(), z.undefined()])
      .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
    streetFrontage: optionalFloat,
    occupancyStatus: optionalString(120),
    publicationPermission: z.enum(["none", "verbal", "written", "documented"]).default("none"),
    dataSource: optionalString(200),
    internalNotes: optionalString(4000),
    assignedToId: optionalString(40),
    metaTitleFr: optionalString(180),
    metaDescriptionFr: optionalString(320),
    metaTitleAr: optionalString(180),
    metaDescriptionAr: optionalString(320),
    price: z
      .union([z.string(), z.number()])
      .transform((v) => Number(String(v).replace(/[^\d.-]/g, "")))
      .refine((n) => Number.isFinite(n) && n > 0, "PRICE_REQUIRED"),
    rentPeriod: z.enum(["month", "day", "year"]).optional(),
    amenityIds: z.array(z.string()).default([]),
    isFeatured: checkbox.default(false),
  })
  .superRefine((data, ctx) => {
    if (data.transactionType === "rent" && !data.rentPeriod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rentPeriod"], message: "RENT_PERIOD_REQUIRED" });
    }
  });

export type PropertyInput = z.infer<typeof propertyInputSchema>;

/** Fields required before a listing may be published. */
export const PUBLISH_REQUIRED = [
  "titleFr",
  "descriptionFr",
  "categoryId",
  "cityId",
  "price",
  "publicationPermission",
] as const;

export function missingPublishFields(p: {
  titleFr?: string | null;
  descriptionFr?: string | null;
  categoryId?: string | null;
  cityId?: string | null;
  price?: number | null;
  publicationPermission?: string | null;
  mediaCount: number;
  verificationLevel?: string | null;
}): string[] {
  const missing: string[] = [];
  if (!p.titleFr) missing.push("Titre (FR)");
  if (!p.descriptionFr || p.descriptionFr.length < 40) missing.push("Description (FR)");
  if (!p.categoryId) missing.push("Catégorie");
  if (!p.cityId) missing.push("Ville");
  if (!p.price || p.price <= 0) missing.push("Prix");
  if (!p.publicationPermission || p.publicationPermission === "none") missing.push("Autorisation de publier");
  if (p.mediaCount < 1) missing.push("Au moins une photo");
  if (!p.verificationLevel || p.verificationLevel === "unverified") missing.push("Disponibilité vérifiée");
  return missing;
}

export const inquirySchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().trim().min(2, "NAME_REQUIRED").max(120),
  phone: z.string().trim().regex(PHONE_RE, "INVALID_PHONE").max(24),
  email: z.string().trim().regex(EMAIL_RE, "INVALID_EMAIL").max(160).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "CONSENT_REQUIRED" }) }),
  locale: z.enum(["fr", "ar"]).default("fr"),
  website: z.string().max(0).optional(), // honeypot
});

export const viewingSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(PHONE_RE, "INVALID_PHONE").max(24),
  email: z.string().trim().regex(EMAIL_RE, "INVALID_EMAIL").max(160).optional().or(z.literal("")),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "INVALID_DATE"),
  requestedTime: z.string().regex(/^\d{2}:\d{2}$/, "INVALID_TIME"),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "CONSENT_REQUIRED" }) }),
  locale: z.enum(["fr", "ar"]).default("fr"),
  website: z.string().max(0).optional(),
});

export const reportSchema = z.object({
  propertyId: z.string().min(1),
  reason: z.enum(["price", "unavailable", "info", "other"]),
  details: z.string().trim().max(1000).optional(),
  email: z.string().trim().max(160).optional(),
  website: z.string().max(0).optional(),
});

export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);
export const propertyStatusSchema = z.enum(PROPERTY_STATUSES);
export const sourcingStageSchema = z.enum(SOURCING_STAGES);

export const leadUpdateSchema = z.object({
  leadId: z.string().min(1),
  status: leadStatusSchema.optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  followUpAt: z.string().optional(),
  note: z.string().trim().max(2000).optional(),
});

export const appointmentUpdateSchema = z.object({
  appointmentId: z.string().min(1),
  status: appointmentStatusSchema,
  assignedToId: z.string().optional(),
  staffNotes: z.string().trim().max(1000).optional(),
});

export const staffCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "INVALID_EMAIL").max(160),
  phone: z.string().trim().max(24).optional().or(z.literal("")),
  roleKey: z.enum(["manager", "collector", "reviewer", "crm", "editor", "analyst", "owner"]),
  password: z.string().min(10, "PASSWORD_TOO_SHORT").max(200),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "INVALID_EMAIL").max(160),
  password: z.string().min(8, "PASSWORD_TOO_SHORT").max(200),
  locale: z.enum(["fr", "ar"]).default("fr"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(160),
  password: z.string().min(1).max(200),
});

export const articleSchema = z.object({
  titleFr: z.string().trim().min(6).max(180),
  titleAr: optionalString(180),
  excerptFr: z.string().trim().min(20).max(400),
  excerptAr: optionalString(400),
  bodyFr: z.string().trim().min(100),
  bodyAr: optionalString(20000),
  categoryId: optionalString(40),
  cityId: optionalString(40),
  coverImage: optionalString(400),
  metaTitle: optionalString(180),
  metaDescription: optionalString(320),
});

export const categorySchema = z.object({
  id: optionalString(40),
  slug: optionalString(80),
  nameFr: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(1).max(80),
  kind: z.enum(["residential", "commercial", "land", "development"]),
  sortOrder: optionalInt,
  isActive: checkbox.default(true),
});

export const citySchema = z.object({
  id: optionalString(40),
  nameFr: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(1).max(80),
  region: optionalString(80),
  descriptionFr: optionalString(2000),
  descriptionAr: optionalString(2000),
  latitude: optionalFloat,
  longitude: optionalFloat,
  isPublished: checkbox.default(true),
  sortOrder: optionalInt,
});

export const neighborhoodSchema = z.object({
  id: optionalString(40),
  cityId: z.string().min(1),
  nameFr: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(1).max(80),
  descriptionFr: optionalString(2000),
  isPublished: checkbox.default(true),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
