import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { AuthzError } from "@/lib/auth";

/**
 * Server-action tests: these call the real action functions (permission checks,
 * publication gate, audit trail, state transitions) with Next's request
 * primitives mocked, so the flow is exercised end to end below the HTTP layer.
 */

let currentToken = "";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "imps_session" && currentToken ? { value: currentToken } : undefined),
    set: () => {},
    delete: () => {},
  }),
  headers: async () =>
    new Headers({
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "vitest",
    }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { reviewDecisionAction, changeStatusAction, updatePropertyAction } = await import("@/app/actions/properties");
const { submitInquiryAction, submitViewingAction } = await import("@/app/actions/public");
const { updateLeadAction } = await import("@/app/actions/crm");

let reviewerToken = "";
let collectorToken = "";
let crmToken = "";
let propertyId = "";
let cityId = "";
let categoryId = "";
let amenityId = "";

async function seedAccess() {
  const reviewerRole = await prisma.role.upsert({ where: { key: "reviewer" }, update: {}, create: { key: "reviewer", nameFr: "Reviewer", nameAr: "مراجع" } });
  const collectorRole = await prisma.role.upsert({ where: { key: "collector" }, update: {}, create: { key: "collector", nameFr: "Collector", nameAr: "جامع" } });
  const crmRole = await prisma.role.upsert({ where: { key: "crm" }, update: {}, create: { key: "crm", nameFr: "CRM", nameAr: "علاقات" } });

  const reviewer = await prisma.profile.create({
    data: { email: "reviewer@test.local", fullName: "Reviewer Test", passwordHash: "x", isStaff: true, roleId: reviewerRole.id },
  });
  const collector = await prisma.profile.create({
    data: { email: "collector@test.local", fullName: "Collector Test", passwordHash: "x", isStaff: true, roleId: collectorRole.id },
  });
  const crm = await prisma.profile.create({
    data: { email: "crm@test.local", fullName: "CRM Test", passwordHash: "x", isStaff: true, roleId: crmRole.id },
  });

  const crypto = await import("node:crypto");
  const make = async (profileId: string) => {
    const token = crypto.randomBytes(24).toString("base64url");
    await prisma.session.create({
      data: {
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        profileId,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    return token;
  };
  reviewerToken = await make(reviewer.id);
  collectorToken = await make(collector.id);
  crmToken = await make(crm.id);
}

beforeAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.publicationReview.deleteMany();
  await prisma.propertyVerification.deleteMany();
  await prisma.propertyStatusHistory.deleteMany();
  await prisma.propertyMedia.deleteMany();
  await prisma.propertyOffer.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.viewingAppointment.deleteMany();
  await prisma.property.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.propertyCategory.deleteMany();
  await prisma.city.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profile.deleteMany();

  await seedAccess();

  const city = await prisma.city.create({ data: { slug: "action-city", nameFr: "Ville", nameAr: "مدينة" } });
  cityId = city.id;
  const category = await prisma.propertyCategory.create({
    data: { slug: "action-apartment", nameFr: "Appartement", nameAr: "شقة", kind: "residential" },
  });
  categoryId = category.id;
  const amenity = await prisma.amenity.create({ data: { slug: "pool", labelFr: "Piscine", labelAr: "مسبح", group: "outdoor" } });
  amenityId = amenity.id;

  const property = await prisma.property.create({
    data: {
      reference: "ACT-0001",
      slug: "bien-action",
      titleFr: "Bien pour test d'action",
      descriptionFr: "Description suffisamment longue pour satisfaire les règles de publication du catalogue IMPS.",
      categoryId,
      transactionType: "sale",
      cityId,
      status: "in_review",
      publicationPermission: "written",
      verificationLevel: "availability_confirmed",
      availabilityConfirmedAt: new Date(),
      primaryPrice: 1_200_000,
      offers: { create: { transactionType: "sale", price: 1_200_000, isActive: true } },
      media: { create: { url: "/media/test.jpg", kind: "image", visibility: "public", isCover: true } },
      amenities: { create: { amenityId: amenity.id } },
    },
  });
  propertyId = property.id;
  await prisma.publicationReview.create({ data: { propertyId, decision: "pending" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(() => {
  currentToken = "";
});

describe("publication permissions", () => {
  it("refuses publication by a collector", async () => {
    currentToken = collectorToken;
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("decision", "approve");
    await expect(reviewDecisionAction(data)).rejects.toBeInstanceOf(AuthzError);

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(property?.status).toBe("in_review");
  });

  it("refuses an anonymous visitor entirely", async () => {
    currentToken = "";
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("decision", "approve");
    await expect(reviewDecisionAction(data)).rejects.toBeInstanceOf(AuthzError);
  });

  it("lets a reviewer approve and publish, with audit and history", async () => {
    currentToken = reviewerToken;
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("decision", "approve");
    data.set("notes", "Contrôles effectués (test)");

    await expect(reviewDecisionAction(data)).rejects.toMatchObject({ url: "/admin/review?published=1" });

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(property?.status).toBe("published");
    expect(property?.publishedAt).not.toBeNull();
    expect(property?.nextAvailabilityCheckAt).not.toBeNull();

    const review = await prisma.publicationReview.findFirst({ where: { propertyId, decision: "approved" } });
    expect(review).not.toBeNull();
    const audit = await prisma.auditLog.findFirst({ where: { entityId: propertyId, action: "property.publish" } });
    expect(audit).not.toBeNull();
  });

  it("blocks a price change by a collector", async () => {
    currentToken = collectorToken;
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("titleFr", property!.titleFr);
    data.set("descriptionFr", property!.descriptionFr);
    data.set("categoryId", categoryId);
    data.set("transactionType", "sale");
    data.set("cityId", cityId);
    data.set("price", "999999");
    data.set("publicationPermission", "written");
    data.set("locationPrecision", "approximate");
    data.set("amenityIds", amenityId);

    await expect(updatePropertyAction(data)).rejects.toBeInstanceOf(AuthzError);
    const unchanged = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(unchanged?.primaryPrice).toBe(1_200_000);
  });

  it("prevents a collector from marking a property sold", async () => {
    currentToken = collectorToken;
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("status", "sold");
    await expect(changeStatusAction(data)).rejects.toBeInstanceOf(AuthzError);
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(property?.status).toBe("published");
  });
});

describe("public form actions", () => {
  it("creates a lead from a public inquiry", async () => {
    currentToken = "";
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("name", "Visiteur Test");
    data.set("phone", "+212600112233");
    data.set("email", "visiteur@example.com");
    data.set("message", "Bonjour, ce bien est-il disponible ?");
    data.set("consent", "on");
    data.set("locale", "fr");

    const result = await submitInquiryAction(null, data);
    expect(result?.ok).toBe(true);

    const lead = await prisma.lead.findFirst({ where: { phone: "+212600112233" } });
    expect(lead).not.toBeNull();
    expect(lead?.status).toBe("new");
    expect(lead?.propertyId).toBe(propertyId);
  });

  it("stores a viewing request as requested, never as confirmed", async () => {
    currentToken = "";
    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("name", "Visiteur Test");
    data.set("phone", "+212600112244");
    data.set("requestedDate", date);
    data.set("requestedTime", "11:00");
    data.set("consent", "on");
    data.set("locale", "fr");

    const result = await submitViewingAction(null, data);
    expect(result?.ok).toBe(true);

    const appointment = await prisma.viewingAppointment.findFirst({ where: { visitorPhone: "+212600112244" } });
    expect(appointment).not.toBeNull();
    expect(appointment?.status).toBe("requested");
    expect(appointment?.confirmedAt).toBeNull();
  });

  it("rejects an inquiry without consent", async () => {
    currentToken = "";
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.set("name", "Sans Consentement");
    data.set("phone", "+212600112255");
    data.set("locale", "fr");
    const result = await submitInquiryAction(null, data);
    expect(result?.ok).toBe(false);
    expect(await prisma.lead.count({ where: { phone: "+212600112255" } })).toBe(0);
  });
});

describe("CRM actions", () => {
  it("assigns a lead and records a follow-up note", async () => {
    currentToken = crmToken;
    const lead = await prisma.lead.findFirst({ where: { phone: "+212600112233" } });
    expect(lead).not.toBeNull();
    const staff = await prisma.profile.findFirst({ where: { email: "crm@test.local" } });

    const data = new FormData();
    data.set("leadId", lead!.id);
    data.set("status", "contacted");
    data.set("assignedToId", staff!.id);
    data.set("priority", "high");
    data.set("note", "Premier appel effectué (test).");

    await expect(updateLeadAction(data)).rejects.toMatchObject({ url: `/admin/crm/${lead!.id}?saved=1` });

    const updated = await prisma.lead.findUnique({ where: { id: lead!.id }, include: { notesList: true } });
    expect(updated?.status).toBe("contacted");
    expect(updated?.assignedToId).toBe(staff!.id);
    expect(updated?.notesList.length).toBe(1);
    const audit = await prisma.auditLog.findFirst({ where: { entityId: lead!.id, action: "lead.update" } });
    expect(audit).not.toBeNull();
  });
});
