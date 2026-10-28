import { describe, expect, it } from "vitest";
import { inquirySchema, missingPublishFields, propertyInputSchema, viewingSchema } from "@/lib/validation";

const baseProperty = {
  titleFr: "Appartement lumineux trois chambres à Anfa",
  descriptionFr:
    "Appartement de 142 mètres carrés situé à Anfa, avec trois chambres, deux salles de bain, parking et terrasse.",
  categoryId: "cat_1",
  transactionType: "sale",
  cityId: "city_1",
  price: "2850000",
  publicationPermission: "written",
  locationPrecision: "approximate",
  amenityIds: [],
};

describe("property validation", () => {
  it("accepts a complete sale listing", () => {
    const result = propertyInputSchema.safeParse(baseProperty);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(2_850_000);
      expect(result.data.isFeatured).toBe(false);
    }
  });

  it("rejects a description that is too short", () => {
    const result = propertyInputSchema.safeParse({ ...baseProperty, descriptionFr: "Trop court" });
    expect(result.success).toBe(false);
  });

  it("requires a rent period for rentals", () => {
    const result = propertyInputSchema.safeParse({ ...baseProperty, transactionType: "rent", price: "12000" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing or zero price", () => {
    expect(propertyInputSchema.safeParse({ ...baseProperty, price: "" }).success).toBe(false);
    expect(propertyInputSchema.safeParse({ ...baseProperty, price: "0" }).success).toBe(false);
  });
});

describe("publication gate", () => {
  const complete = {
    titleFr: "Titre",
    descriptionFr: "x".repeat(60),
    categoryId: "c",
    cityId: "v",
    price: 100,
    publicationPermission: "written",
    mediaCount: 2,
    verificationLevel: "availability_confirmed",
  };

  it("passes when everything is present", () => {
    expect(missingPublishFields(complete)).toEqual([]);
  });

  it("blocks without an image, permission or availability check", () => {
    const missing = missingPublishFields({
      ...complete,
      mediaCount: 0,
      publicationPermission: "none",
      verificationLevel: "unverified",
    });
    expect(missing).toContain("Au moins une photo");
    expect(missing).toContain("Autorisation de publier");
    expect(missing).toContain("Disponibilité vérifiée");
  });
});

describe("inquiry and viewing validation", () => {
  it("requires consent and a valid phone number", () => {
    const inquiry = { propertyId: "p", name: "Sara", phone: "+212600000000", consent: true as const, locale: "fr" as const };
    expect(inquirySchema.safeParse(inquiry).success).toBe(true);
    expect(inquirySchema.safeParse({ ...inquiry, consent: false }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...inquiry, phone: "abc" }).success).toBe(false);
  });

  it("rejects an invalid viewing date format", () => {
    const viewing = {
      propertyId: "p",
      name: "Sara",
      phone: "+212600000000",
      requestedDate: "2026/10/30",
      requestedTime: "10:00",
      consent: true as const,
      locale: "fr" as const,
    };
    expect(viewingSchema.safeParse(viewing).success).toBe(false);
    expect(viewingSchema.safeParse({ ...viewing, requestedDate: "2026-10-30" }).success).toBe(true);
  });
});
