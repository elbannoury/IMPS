import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/db";

let currentToken = "";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "imps_session" && currentToken ? { value: currentToken } : undefined),
    set: () => {},
    delete: () => {},
  }),
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.2", "user-agent": "vitest" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
class RedirectSignal extends Error {
  constructor(public url: string) {
    super(url);
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

const { createPropertyAction, updatePropertyAction, uploadMediaAction, moveMediaAction, setCoverMediaAction, deleteMediaAction } = await import(
  "@/app/actions/properties"
);
const { deactivateCategoryAction } = await import("@/app/actions/taxonomy");
const { getDashboardData, getPropertyBySlug, searchProperties } = await import("@/lib/queries");

const tokens: Record<string, string> = {};
let cityId = "";
let categoryId = "";
let propertyId = "";

beforeAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.publicationReview.deleteMany();
  await prisma.propertyVerification.deleteMany();
  await prisma.propertyStatusHistory.deleteMany();
  await prisma.propertyMedia.deleteMany();
  await prisma.propertyOffer.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.property.deleteMany();
  await prisma.propertyCategory.deleteMany();
  await prisma.city.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.role.deleteMany();

  const crypto = await import("node:crypto");
  const roles: Record<string, string> = {};
  for (const [key, name] of [
    ["collector", "Collector"],
    ["manager", "Manager"],
    ["reviewer", "Reviewer"],
  ]) {
    const role = await prisma.role.create({ data: { key, nameFr: name, nameAr: name } });
    roles[key] = role.id;
  }

  for (const key of ["collector", "manager", "reviewer"]) {
    const profile = await prisma.profile.create({
      data: { email: `${key}@flow.test`, fullName: `${key} user`, passwordHash: "x", isStaff: true, roleId: roles[key] },
    });
    const token = crypto.randomBytes(24).toString("base64url");
    await prisma.session.create({
      data: {
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        profileId: profile.id,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    tokens[key] = token;
  }

  const city = await prisma.city.create({ data: { slug: "flow-city", nameFr: "Flow Ville", nameAr: "مدينة" } });
  cityId = city.id;
  const category = await prisma.propertyCategory.create({
    data: { slug: "flow-apartment", nameFr: "Appartement flow", nameAr: "شقة", kind: "residential" },
  });
  categoryId = category.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

function propertyForm(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("titleFr", "Appartement de test avec vue dégagée");
  data.set("descriptionFr", "Description complète de test avec suffisamment de caractères pour passer la validation du formulaire.");
  data.set("categoryId", categoryId);
  data.set("transactionType", "sale");
  data.set("cityId", cityId);
  data.set("price", "1450000");
  data.set("publicationPermission", "written");
  data.set("locationPrecision", "approximate");
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

describe("collector creates a draft", () => {
  it("creates a draft property with an offer and a reference", async () => {
    currentToken = tokens.collector!;
    await expect(createPropertyAction(propertyForm())).rejects.toBeInstanceOf(RedirectSignal);

    const property = await prisma.property.findFirst({
      where: { titleFr: "Appartement de test avec vue dégagée" },
      include: { offers: true },
    });
    expect(property).not.toBeNull();
    expect(property?.status).toBe("draft");
    expect(property?.reference).toMatch(/^IMP-\d{4}-\d{4}$/);
    expect(property?.offers[0]?.price).toBe(1_450_000);
    expect(property?.primaryPrice).toBe(1_450_000);
    propertyId = property!.id;
  });

  it("is not visible publicly while in draft", async () => {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(await getPropertyBySlug(property!.slug)).toBeNull();
    const results = await searchProperties({ city: "flow-city" });
    expect(results.total).toBe(0);
  });
});

describe("media workflow", () => {
  it("uploads, orders and covers images", async () => {
    currentToken = tokens.collector!;
    const png = await sharp({ create: { width: 60, height: 40, channels: 3, background: "#dddddd" } }).png().toBuffer();
    const jpg = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#999999" } }).jpeg().toBuffer();

    const data = new FormData();
    data.set("propertyId", propertyId);
    data.append("files", new File([new Uint8Array(png)], "one.png", { type: "image/png" }));
    data.append("files", new File([new Uint8Array(jpg)], "two.jpg", { type: "image/jpeg" }));

    await expect(uploadMediaAction(data)).rejects.toBeInstanceOf(RedirectSignal);

    let media = await prisma.propertyMedia.findMany({ where: { propertyId }, orderBy: { sortOrder: "asc" } });
    expect(media.length).toBe(2);
    expect(media[0]?.isCover).toBe(true);
    expect(media[0]?.url.startsWith("/uploads/")).toBe(true);
    expect(media[0]?.url.endsWith(".webp")).toBe(true);

    const firstId = media[0]!.id;
    const secondId = media[1]!.id;

    const move = new FormData();
    move.set("mediaId", secondId);
    move.set("direction", "up");
    await expect(moveMediaAction(move)).rejects.toBeInstanceOf(RedirectSignal);
    media = await prisma.propertyMedia.findMany({ where: { propertyId }, orderBy: { sortOrder: "asc" } });
    expect(media[0]?.id).toBe(secondId);

    const cover = new FormData();
    cover.set("mediaId", firstId);
    await expect(setCoverMediaAction(cover)).rejects.toBeInstanceOf(RedirectSignal);
    const coverRow = await prisma.propertyMedia.findUnique({ where: { id: firstId } });
    expect(coverRow?.isCover).toBe(true);

    const remove = new FormData();
    remove.set("mediaId", secondId);
    await expect(deleteMediaAction(remove)).rejects.toBeInstanceOf(RedirectSignal);
    expect(await prisma.propertyMedia.count({ where: { propertyId } })).toBe(1);

    const files = await fs.readdir(path.join(process.cwd(), "public", "uploads"));
    await Promise.all(
      files.filter((file) => file.endsWith(".webp")).map((file) => fs.rm(path.join(process.cwd(), "public", "uploads", file), { force: true })),
    );
  });

  it("rejects a non-image upload", async () => {
    currentToken = tokens.collector!;
    const data = new FormData();
    data.set("propertyId", propertyId);
    data.append("files", new File([new TextEncoder().encode("<svg/>")], "bad.svg", { type: "image/svg+xml" }));
    await expect(uploadMediaAction(data)).rejects.toMatchObject({ url: `/admin/properties/${propertyId}?error=INVALID_FILE_TYPE` });
  });
});

describe("manager edits price", () => {
  it("updates the offer and the public price", async () => {
    currentToken = tokens.collector!;
    // Publish first so the public page is reachable.
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        status: "published",
        publishedAt: new Date(),
        availabilityConfirmedAt: new Date(),
        verificationLevel: "availability_confirmed",
      },
    });

    currentToken = tokens.manager!;
    await expect(updatePropertyAction(propertyForm({ propertyId, price: "1525000" }))).rejects.toBeInstanceOf(RedirectSignal);

    const offers = await prisma.propertyOffer.findMany({ where: { propertyId, isActive: true } });
    expect(offers.length).toBe(1);
    expect(offers[0]?.price).toBe(1_525_000);

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(property?.primaryPrice).toBe(1_525_000);
    const publicPage = await getPropertyBySlug(property!.slug);
    expect(publicPage?.primaryPrice).toBe(1_525_000);

    const audit = await prisma.auditLog.findFirst({ where: { entityId: propertyId, action: "property.price_change" } });
    expect(audit).not.toBeNull();
  });

  it("does not modify other properties", async () => {
    const other = await prisma.property.create({
      data: {
        reference: "FLOW-OTHER",
        slug: "flow-other",
        titleFr: "Autre bien",
        descriptionFr: "Autre bien de test avec une description suffisamment longue pour être valide sur la plateforme.",
        categoryId,
        transactionType: "sale",
        cityId,
        status: "published",
        publishedAt: new Date(),
        primaryPrice: 800_000,
      },
    });
    currentToken = tokens.manager!;
    await expect(updatePropertyAction(propertyForm({ propertyId, price: "1600000" }))).rejects.toBeInstanceOf(RedirectSignal);
    const untouched = await prisma.property.findUnique({ where: { id: other.id } });
    expect(untouched?.primaryPrice).toBe(800_000);
  });
});

describe("stale availability", () => {
  it("flags a listing whose availability check is older than the interval", async () => {
    await prisma.property.update({
      where: { id: propertyId },
      data: { availabilityConfirmedAt: new Date(Date.now() - 45 * 86_400_000) },
    });
    const dashboard = await getDashboardData();
    expect(dashboard.staleList.some((row) => row.id === propertyId)).toBe(true);
    expect(dashboard.staleCount).toBeGreaterThan(0);
  });

  it("stops presenting a sold listing as available", async () => {
    await prisma.property.update({ where: { id: propertyId }, data: { status: "sold" } });
    const results = await searchProperties({ city: "flow-city" });
    expect(results.items.find((item) => item.id === propertyId)).toBeUndefined();
  });
});

describe("taxonomy safety", () => {
  it("deactivates a category in use instead of deleting it", async () => {
    currentToken = tokens.manager!;
    const data = new FormData();
    data.set("id", categoryId);
    await expect(deactivateCategoryAction(data)).rejects.toMatchObject({ url: "/admin/taxonomy?deactivated=1" });

    const category = await prisma.propertyCategory.findUnique({ where: { id: categoryId } });
    expect(category?.isActive).toBe(false);
    expect(await prisma.property.count({ where: { categoryId } })).toBeGreaterThan(0);
  });
});
