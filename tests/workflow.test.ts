import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getPropertyBySlug, searchProperties } from "@/lib/queries";
import { cardSelect } from "@/lib/queries";

let cityId = "";
let categoryId = "";
let propertyId = "";
let leadId = "";

const REF = "TEST-0001";

beforeAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.propertyMedia.deleteMany();
  await prisma.propertyVerification.deleteMany();
  await prisma.propertyOffer.deleteMany();
  await prisma.property.deleteMany();
  await prisma.neighborhood.deleteMany();
  await prisma.city.deleteMany();
  await prisma.propertyCategory.deleteMany();

  const city = await prisma.city.create({
    data: { slug: "test-city", nameFr: "Ville Test", nameAr: "مدينة اختبار", isPublished: true },
  });
  cityId = city.id;
  const category = await prisma.propertyCategory.create({
    data: { slug: "test-apartment", nameFr: "Appartement test", nameAr: "شقة اختبار", kind: "residential" },
  });
  categoryId = category.id;

  const property = await prisma.property.create({
    data: {
      reference: REF,
      slug: "bien-de-test",
      titleFr: "Bien de test à Ville Test",
      descriptionFr:
        "Description de test suffisamment longue pour valider les règles de publication et de recherche du catalogue.",
      categoryId,
      transactionType: "sale",
      cityId,
      status: "draft",
      primaryPrice: 1_500_000,
      internalNotes: "NOTE INTERNE CONFIDENTIELLE",
      dataSource: "SOURCE CONFIDENTIELLE",
      publicationPermission: "none",
      isSample: true,
    },
  });
  propertyId = property.id;

  await prisma.propertyOffer.create({
    data: { propertyId, transactionType: "sale", price: 1_500_000, isActive: true },
  });
  await prisma.propertyMedia.create({
    data: { propertyId, url: "/media/test.jpg", kind: "image", visibility: "public", sortOrder: 0, isCover: true },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("draft properties are private", () => {
  it("is not returned by public search", async () => {
    const results = await searchProperties({ city: "test-city" });
    expect(results.items.find((item) => item.id === propertyId)).toBeUndefined();
  });

  it("cannot be opened by slug as an anonymous visitor", async () => {
    const property = await getPropertyBySlug("bien-de-test");
    expect(property).toBeNull();
  });
});

describe("publication and search", () => {
  beforeAll(async () => {
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        status: "published",
        publishedAt: new Date(),
        availabilityConfirmedAt: new Date(),
        verificationLevel: "availability_confirmed",
        publicationPermission: "written",
      },
    });
  });

  it("appears in public search after publication", async () => {
    const results = await searchProperties({ city: "test-city" });
    expect(results.total).toBe(1);
    expect(results.items[0]?.reference).toBe(REF);
  });

  it("respects combined filters", async () => {
    const match = await searchProperties({ transaction: "sale", category: "test-apartment", priceMin: 1_000_000, priceMax: 2_000_000 });
    expect(match.total).toBe(1);
    const miss = await searchProperties({ transaction: "rent" });
    expect(miss.total).toBe(0);
    const tooExpensive = await searchProperties({ priceMin: 5_000_000 });
    expect(tooExpensive.total).toBe(0);
  });

  it("returns an empty page instead of failing when nothing matches", async () => {
    const results = await searchProperties({ city: "does-not-exist" });
    expect(results.items).toEqual([]);
    expect(results.total).toBe(0);
  });

  it("never exposes internal fields on the public page", async () => {
    const property = await getPropertyBySlug("bien-de-test");
    expect(property).not.toBeNull();
    const serialized = JSON.stringify(property);
    expect(serialized).not.toContain("NOTE INTERNE CONFIDENTIELLE");
    expect(serialized).not.toContain("SOURCE CONFIDENTIELLE");
    expect(serialized).not.toContain("publicationPermission");
    expect(serialized).not.toContain("internalNotes");
  });

  it("exposes only whitelisted fields through the public card select", async () => {
    expect(Object.keys(cardSelect)).not.toContain("internalNotes");
    expect(Object.keys(cardSelect)).not.toContain("dataSource");
    expect(Object.keys(cardSelect)).not.toContain("publicationPermission");
    expect(Object.keys(cardSelect)).not.toContain("createdById");
  });
});

describe("price changes and archiving", () => {
  it("reflects a price change on the public page", async () => {
    await prisma.property.update({ where: { id: propertyId }, data: { primaryPrice: 1_650_000 } });
    const property = await getPropertyBySlug("bien-de-test");
    expect(property?.primaryPrice).toBe(1_650_000);
  });

  it("does not modify other properties when one changes", async () => {
    const other = await prisma.property.create({
      data: {
        reference: "TEST-0002",
        slug: "autre-bien",
        titleFr: "Autre bien publié",
        descriptionFr: "Autre description de test suffisamment longue pour être valide et publiable sur le site.",
        categoryId,
        transactionType: "sale",
        cityId,
        status: "published",
        publishedAt: new Date(),
        primaryPrice: 900_000,
      },
    });
    await prisma.property.update({ where: { id: propertyId }, data: { primaryPrice: 1_700_000 } });
    const untouched = await prisma.property.findUnique({ where: { id: other.id } });
    expect(untouched?.primaryPrice).toBe(900_000);
    await prisma.property.delete({ where: { id: other.id } });
  });

  it("archives without deleting related leads or audit records", async () => {
    const lead = await prisma.lead.create({
      data: { code: "LD-TEST-1", propertyId, name: "Client Test", phone: "+212600000000", status: "new" },
    });
    leadId = lead.id;
    await prisma.auditLog.create({
      data: {
        action: "property.publish",
        entityType: "property",
        entityId: propertyId,
        summary: "Publication de test",
      },
    });

    await prisma.property.update({ where: { id: propertyId }, data: { status: "archived" } });

    const remainingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    const audit = await prisma.auditLog.findFirst({ where: { entityId: propertyId } });
    expect(remainingLead).not.toBeNull();
    expect(audit).not.toBeNull();

    const publicResults = await searchProperties({ city: "test-city" });
    expect(publicResults.total).toBe(0);
    expect(await getPropertyBySlug("bien-de-test")).toBeNull();
  });
});
