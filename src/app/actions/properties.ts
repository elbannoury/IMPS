"use server";

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { requireStaffAction } from "@/lib/auth";
import { writeAudit, notifyStaff } from "@/lib/audit";
import { propertyInputSchema, missingPublishFields } from "@/lib/validation";
import { assertTransition, type PropertyStatus } from "@/lib/status";
import { referenceFor, propertySlug } from "@/lib/slug";
import { setPropertyPrice, syncPrimaryOffer } from "@/lib/offers";
import { PRODUCT_LIMITS } from "@/lib/media";

function parsePropertyForm(formData: FormData) {
  return propertyInputSchema.safeParse({
    titleFr: formData.get("titleFr"),
    titleAr: formData.get("titleAr") ?? "",
    descriptionFr: formData.get("descriptionFr"),
    descriptionAr: formData.get("descriptionAr") ?? "",
    categoryId: formData.get("categoryId"),
    transactionType: formData.get("transactionType"),
    cityId: formData.get("cityId"),
    neighborhoodId: formData.get("neighborhoodId") ?? "",
    addressLine: formData.get("addressLine") ?? "",
    locationPrecision: formData.get("locationPrecision") ?? "approximate",
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
    builtArea: formData.get("builtArea") ?? "",
    landArea: formData.get("landArea") ?? "",
    bedrooms: formData.get("bedrooms") ?? "",
    bathrooms: formData.get("bathrooms") ?? "",
    floors: formData.get("floors") ?? "",
    floorNumber: formData.get("floorNumber") ?? "",
    parkingSpaces: formData.get("parkingSpaces") ?? "",
    yearBuilt: formData.get("yearBuilt") ?? "",
    condition: formData.get("condition") || undefined,
    furnished: formData.get("furnished") ?? undefined,
    streetFrontage: formData.get("streetFrontage") ?? "",
    occupancyStatus: formData.get("occupancyStatus") ?? "",
    publicationPermission: formData.get("publicationPermission") ?? "none",
    dataSource: formData.get("dataSource") ?? "",
    internalNotes: formData.get("internalNotes") ?? "",
    assignedToId: formData.get("assignedToId") ?? "",
    metaTitleFr: formData.get("metaTitleFr") ?? "",
    metaDescriptionFr: formData.get("metaDescriptionFr") ?? "",
    metaTitleAr: formData.get("metaTitleAr") ?? "",
    metaDescriptionAr: formData.get("metaDescriptionAr") ?? "",
    price: formData.get("price"),
    rentPeriod: (formData.get("rentPeriod") as string) || undefined,
    amenityIds: formData.getAll("amenityIds").map(String).filter(Boolean),
    isFeatured: formData.get("isFeatured") ?? undefined,
  });
}

function revalidateProperty(slug?: string | null) {
  revalidatePath("/fr");
  revalidatePath("/ar");
  revalidatePath("/fr/properties");
  revalidatePath("/ar/properties");
  revalidatePath("/fr/invest");
  revalidatePath("/ar/invest");
  if (slug) {
    revalidatePath(`/fr/properties/${slug}`);
    revalidatePath(`/ar/properties/${slug}`);
  }
}

async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.property.count();
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = referenceFor(year, count + 1 + attempt);
    const exists = await prisma.property.findUnique({ where: { reference: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return referenceFor(year, Date.now() % 9000);
}

export async function createPropertyAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.write");
  const parsed = parsePropertyForm(formData);
  if (!parsed.success) redirect("/admin/properties/new?error=INVALID");

  const data = parsed.data;
  const reference = await nextReference();
  const property = await prisma.property.create({
    data: {
      reference,
      slug: propertySlug(data.titleFr, reference),
      titleFr: data.titleFr,
      titleAr: data.titleAr ?? null,
      descriptionFr: data.descriptionFr,
      descriptionAr: data.descriptionAr ?? null,
      categoryId: data.categoryId,
      transactionType: data.transactionType,
      cityId: data.cityId,
      neighborhoodId: data.neighborhoodId ?? null,
      addressLine: data.addressLine ?? null,
      locationPrecision: data.locationPrecision,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      builtArea: data.builtArea ?? null,
      landArea: data.landArea ?? null,
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      floors: data.floors ?? null,
      floorNumber: data.floorNumber ?? null,
      parkingSpaces: data.parkingSpaces ?? null,
      yearBuilt: data.yearBuilt ?? null,
      condition: data.condition ?? null,
      furnished: data.furnished ?? null,
      streetFrontage: data.streetFrontage ?? null,
      occupancyStatus: data.occupancyStatus ?? null,
      publicationPermission: data.publicationPermission,
      dataSource: data.dataSource ?? null,
      internalNotes: data.internalNotes ?? null,
      assignedToId: data.assignedToId ?? user.id,
      metaTitleFr: data.metaTitleFr ?? null,
      metaDescriptionFr: data.metaDescriptionFr ?? null,
      metaTitleAr: data.metaTitleAr ?? null,
      metaDescriptionAr: data.metaDescriptionAr ?? null,
      status: "draft",
      sourcingStage: "collecting",
      isFeatured: data.isFeatured,
      createdById: user.id,
      isSample: false,
    },
  });

  await prisma.propertyOffer.create({
    data: {
      propertyId: property.id,
      transactionType: data.transactionType,
      price: data.price,
      rentPeriod: data.transactionType === "rent" ? data.rentPeriod ?? "month" : null,
      isActive: true,
    },
  });
  await syncPrimaryOffer(prisma, property.id);
  if (data.amenityIds.length) {
    await prisma.propertyAmenity.createMany({
      data: data.amenityIds.map((amenityId) => ({ propertyId: property.id, amenityId })),
    });
  }
  await prisma.propertyStatusHistory.create({
    data: { propertyId: property.id, toStatus: "draft", actorId: user.id, reason: "Création" },
  });
  await writeAudit({
    actorId: user.id,
    action: "property.create",
    entityType: "property",
    entityId: property.id,
    summary: `Draft created: ${property.reference} — ${property.titleFr}`,
  });

  revalidateProperty(property.slug);
  redirect(`/admin/properties/${property.id}?created=1`);
}

export async function updatePropertyAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.write");
  const id = String(formData.get("propertyId") ?? "");
  const existing = await prisma.property.findUnique({
    where: { id },
    include: { offers: { where: { isActive: true }, take: 1 } },
  });
  if (!existing) redirect("/admin/properties?error=NOT_FOUND");

  const parsed = parsePropertyForm(formData);
  if (!parsed.success) redirect(`/admin/properties/${id}?error=INVALID`);
  const data = parsed.data;

  const priceChanged = (existing.primaryPrice ?? 0) !== data.price;
  if (priceChanged) {
    // Separately permissioned operation.
    await requireStaffAction("property.price_change");
  }
  if (data.isFeatured && existing.status === "published") {
    await requireStaffAction("property.publish");
  }

  await prisma.property.update({
    where: { id },
    data: {
      titleFr: data.titleFr,
      titleAr: data.titleAr ?? null,
      descriptionFr: data.descriptionFr,
      descriptionAr: data.descriptionAr ?? null,
      categoryId: data.categoryId,
      transactionType: data.transactionType,
      cityId: data.cityId,
      neighborhoodId: data.neighborhoodId ?? null,
      addressLine: data.addressLine ?? null,
      locationPrecision: data.locationPrecision,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      builtArea: data.builtArea ?? null,
      landArea: data.landArea ?? null,
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      floors: data.floors ?? null,
      floorNumber: data.floorNumber ?? null,
      parkingSpaces: data.parkingSpaces ?? null,
      yearBuilt: data.yearBuilt ?? null,
      condition: data.condition ?? null,
      furnished: data.furnished ?? null,
      streetFrontage: data.streetFrontage ?? null,
      occupancyStatus: data.occupancyStatus ?? null,
      publicationPermission: data.publicationPermission,
      dataSource: data.dataSource ?? null,
      internalNotes: data.internalNotes ?? null,
      assignedToId: data.assignedToId ?? null,
      metaTitleFr: data.metaTitleFr ?? null,
      metaDescriptionFr: data.metaDescriptionFr ?? null,
      metaTitleAr: data.metaTitleAr ?? null,
      metaDescriptionAr: data.metaDescriptionAr ?? null,
      isFeatured: data.isFeatured,
    },
  });

  if (priceChanged) {
    await setPropertyPrice(
      prisma,
      id,
      data.price,
      data.transactionType,
      data.transactionType === "rent" ? data.rentPeriod ?? "month" : null,
    );
    await writeAudit({
      actorId: user.id,
      action: "property.price_change",
      entityType: "property",
      entityId: id,
      summary: `Price changed on ${existing.reference}: ${existing.primaryPrice ?? "—"} → ${data.price} MAD`,
      before: { price: existing.primaryPrice },
      after: { price: data.price },
    });
  } else if (data.transactionType === "rent") {
    await prisma.propertyOffer.updateMany({
      where: { propertyId: id, isActive: true },
      data: { transactionType: data.transactionType, rentPeriod: data.rentPeriod ?? "month" },
    });
    await syncPrimaryOffer(prisma, id);
  }

  await prisma.propertyAmenity.deleteMany({ where: { propertyId: id } });
  if (data.amenityIds.length) {
    await prisma.propertyAmenity.createMany({
      data: data.amenityIds.map((amenityId) => ({ propertyId: id, amenityId })),
    });
  }

  await writeAudit({
    actorId: user.id,
    action: "property.update",
    entityType: "property",
    entityId: id,
    summary: `Property updated: ${existing.reference}`,
  });
  revalidateProperty(existing.slug);
  redirect(`/admin/properties/${id}?saved=1`);
}

export async function submitReviewAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.write");
  const id = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUnique({
    where: { id },
    include: { offers: { where: { isActive: true }, take: 1 }, _count: { select: { media: true } } },
  });
  if (!property) redirect("/admin/properties?error=NOT_FOUND");
  if (property.status !== "draft") redirect(`/admin/properties/${id}?error=INVALID_STATE`);

  const missing = missingPublishFields({
    titleFr: property.titleFr,
    descriptionFr: property.descriptionFr,
    categoryId: property.categoryId,
    cityId: property.cityId,
    price: property.offers[0]?.price ?? null,
    publicationPermission: property.publicationPermission,
    mediaCount: property._count.media,
    verificationLevel: property.verificationLevel,
  });
  if (missing.length) redirect(`/admin/properties/${id}?error=MISSING_FIELDS`);

  assertTransition(property.status, "in_review");
  await prisma.$transaction([
    prisma.property.update({ where: { id }, data: { status: "in_review", sourcingStage: "review" } }),
    prisma.publicationReview.create({
      data: {
        propertyId: id,
        submittedById: user.id,
        decision: "pending",
        notes: String(formData.get("notes") ?? "") || null,
      },
    }),
    prisma.propertyStatusHistory.create({
      data: { propertyId: id, fromStatus: "draft", toStatus: "in_review", actorId: user.id },
    }),
  ]);
  await notifyStaff({
    type: "property.review",
    title: "Annonce à réviser",
    body: `${property.reference} — ${property.titleFr}`,
    link: "/admin/review",
  });
  await writeAudit({
    actorId: user.id,
    action: "property.submit_review",
    entityType: "property",
    entityId: id,
    summary: `${property.reference} submitted for review`,
  });
  redirect(`/admin/properties/${id}?submitted=1`);
}

export async function reviewDecisionAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.review");
  const id = String(formData.get("propertyId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      offers: { where: { isActive: true }, take: 1 },
      _count: { select: { media: { where: { kind: "image", visibility: "public" } } } },
    },
  });
  if (!property) redirect("/admin/review?error=NOT_FOUND");
  if (property.status !== "in_review") redirect("/admin/review?error=INVALID_STATE");

  const review = await prisma.publicationReview.findFirst({
    where: { propertyId: id, decision: "pending" },
    orderBy: { createdAt: "desc" },
  });

  if (decision === "approve") {
    await requireStaffAction("property.publish");
    const missing = missingPublishFields({
      titleFr: property.titleFr,
      descriptionFr: property.descriptionFr,
      categoryId: property.categoryId,
      cityId: property.cityId,
      price: property.offers[0]?.price ?? null,
      publicationPermission: property.publicationPermission,
      mediaCount: property._count.media,
      verificationLevel: property.verificationLevel,
    });
    if (missing.length) {
      redirect(`/admin/review?error=MISSING_FIELDS&property=${id}`);
    }
    assertTransition("in_review", "published");
    const now = new Date();
    await prisma.$transaction([
      prisma.property.update({
        where: { id },
        data: {
          status: "published",
          sourcingStage: "published",
          publishedAt: property.publishedAt ?? now,
          availabilityConfirmedAt: property.availabilityConfirmedAt ?? now,
          nextAvailabilityCheckAt: new Date(now.getTime() + 30 * 86_400_000),
        },
      }),
      ...(review
        ? [
            prisma.publicationReview.update({
              where: { id: review.id },
              data: { reviewerId: user.id, decision: "approved", notes: notes || null, decidedAt: now },
            }),
          ]
        : []),
      prisma.publicationReview.create({
        data: {
          propertyId: id,
          reviewerId: user.id,
          decision: "approved",
          notes: notes || "Publication approuvée",
          decidedAt: now,
        },
      }),
      prisma.propertyStatusHistory.create({
        data: { propertyId: id, fromStatus: "in_review", toStatus: "published", actorId: user.id, reason: notes || null },
      }),
    ]);
    await writeAudit({
      actorId: user.id,
      action: "property.publish",
      entityType: "property",
      entityId: id,
      summary: `${property.reference} approved and published`,
    });
    await notifyStaff({
      profileId: property.assignedToId,
      type: "property.published",
      title: "Annonce publiée",
      body: `${property.reference} — ${property.titleFr}`,
      link: `/admin/properties/${id}`,
    });
    revalidateProperty(property.slug);
    redirect("/admin/review?published=1");
  }

  if (decision === "changes") {
    await prisma.$transaction([
      prisma.property.update({
        where: { id },
        data: { status: "draft", sourcingStage: "collecting", publicationPermission: property.publicationPermission },
      }),
      ...(review
        ? [
            prisma.publicationReview.update({
              where: { id: review.id },
              data: { reviewerId: user.id, decision: "changes_requested", notes: notes || null, decidedAt: new Date() },
            }),
          ]
        : []),
      prisma.propertyStatusHistory.create({
        data: { propertyId: id, fromStatus: "in_review", toStatus: "draft", actorId: user.id, reason: notes || null },
      }),
    ]);
    await notifyStaff({
      profileId: property.assignedToId,
      type: "property.changes",
      title: "Modifications demandées",
      body: `${property.reference} — ${notes || "Voir la fiche"}`,
      link: `/admin/properties/${id}`,
    });
    await writeAudit({
      actorId: user.id,
      action: "property.request_changes",
      entityType: "property",
      entityId: id,
      summary: `${property.reference} returned for changes`,
    });
    redirect("/admin/review?changes=1");
  }

  if (decision === "reject") {
    await prisma.$transaction([
      prisma.property.update({ where: { id }, data: { status: "rejected", sourcingStage: "rejected" } }),
      ...(review
        ? [
            prisma.publicationReview.update({
              where: { id: review.id },
              data: { reviewerId: user.id, decision: "rejected", notes: notes || null, decidedAt: new Date() },
            }),
          ]
        : []),
      prisma.propertyStatusHistory.create({
        data: { propertyId: id, fromStatus: "in_review", toStatus: "rejected", actorId: user.id, reason: notes || null },
      }),
    ]);
    await writeAudit({
      actorId: user.id,
      action: "property.reject",
      entityType: "property",
      entityId: id,
      summary: `${property.reference} rejected`,
    });
    redirect("/admin/review?rejected=1");
  }

  redirect("/admin/review?error=INVALID");
}

export async function changeStatusAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.publish");
  const id = String(formData.get("propertyId") ?? "");
  const target = String(formData.get("status") ?? "") as PropertyStatus;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) redirect("/admin/properties?error=NOT_FOUND");

  if (target === "archived") await requireStaffAction("property.archive");
  assertTransition(property.status, target);

  const now = new Date();
  await prisma.$transaction([
    prisma.property.update({
      where: { id },
      data: {
        status: target,
        archivedAt: target === "archived" ? now : null,
        publishedAt: target === "published" ? property.publishedAt ?? now : property.publishedAt,
        availabilityConfirmedAt: target === "published" ? now : property.availabilityConfirmedAt,
      },
    }),
    prisma.propertyStatusHistory.create({
      data: { propertyId: id, fromStatus: property.status, toStatus: target, actorId: user.id },
    }),
  ]);
  await writeAudit({
    actorId: user.id,
    action: target === "archived" ? "property.archive" : "property.status_change",
    entityType: "property",
    entityId: id,
    summary: `${property.reference}: ${property.status} → ${target}`,
    before: { status: property.status },
    after: { status: target },
  });
  revalidateProperty(property.slug);
  redirect(`/admin/properties/${id}?status=${target}`);
}

export async function archivePropertyAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.archive");
  const id = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) redirect("/admin/properties?error=NOT_FOUND");
  assertTransition(property.status, "archived");
  await prisma.$transaction([
    prisma.property.update({ where: { id }, data: { status: "archived", archivedAt: new Date() } }),
    prisma.propertyStatusHistory.create({
      data: { propertyId: id, fromStatus: property.status, toStatus: "archived", actorId: user.id },
    }),
  ]);
  await writeAudit({
    actorId: user.id,
    action: "property.archive",
    entityType: "property",
    entityId: id,
    summary: `${property.reference} archived (leads, media and audit preserved)`,
  });
  revalidateProperty(property.slug);
  redirect("/admin/properties?archived=1");
}

export async function restorePropertyAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.archive");
  const id = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) redirect("/admin/properties?error=NOT_FOUND");
  if (property.status !== "archived" && property.status !== "rejected") {
    redirect(`/admin/properties/${id}?error=INVALID_STATE`);
  }
  await prisma.$transaction([
    prisma.property.update({
      where: { id },
      data: { status: "draft", archivedAt: null, sourcingStage: "collecting" },
    }),
    prisma.propertyStatusHistory.create({
      data: { propertyId: id, fromStatus: property.status, toStatus: "draft", actorId: user.id, reason: "Restauration" },
    }),
  ]);
  await writeAudit({
    actorId: user.id,
    action: "property.restore",
    entityType: "property",
    entityId: id,
    summary: `${property.reference} restored to draft`,
  });
  redirect(`/admin/properties/${id}?restored=1`);
}

export async function duplicatePropertyAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.write");
  const id = String(formData.get("propertyId") ?? "");
  const source = await prisma.property.findUnique({
    where: { id },
    include: { amenities: true, offers: { where: { isActive: true } } },
  });
  if (!source) redirect("/admin/properties?error=NOT_FOUND");

  const reference = await nextReference();
  const copy = await prisma.property.create({
    data: {
      reference,
      slug: propertySlug(`${source.titleFr} (copie)`, reference),
      titleFr: `${source.titleFr} (copie)`,
      titleAr: source.titleAr,
      descriptionFr: source.descriptionFr,
      descriptionAr: source.descriptionAr,
      categoryId: source.categoryId,
      transactionType: source.transactionType,
      cityId: source.cityId,
      neighborhoodId: source.neighborhoodId,
      addressLine: source.addressLine,
      locationPrecision: source.locationPrecision,
      latitude: source.latitude,
      longitude: source.longitude,
      builtArea: source.builtArea,
      landArea: source.landArea,
      bedrooms: source.bedrooms,
      bathrooms: source.bathrooms,
      floors: source.floors,
      floorNumber: source.floorNumber,
      parkingSpaces: source.parkingSpaces,
      yearBuilt: source.yearBuilt,
      condition: source.condition,
      furnished: source.furnished,
      streetFrontage: source.streetFrontage,
      occupancyStatus: source.occupancyStatus,
      documentedMonthlyRent: source.documentedMonthlyRent,
      annualOperatingCosts: source.annualOperatingCosts,
      publicationPermission: "none",
      dataSource: source.dataSource,
      internalNotes: `${source.internalNotes ?? ""}\nDupliqué depuis ${source.reference}`.trim(),
      status: "draft",
      sourcingStage: "collecting",
      verificationLevel: "unverified",
      isFeatured: false,
      createdById: user.id,
      assignedToId: source.assignedToId,
    },
  });
  if (source.offers[0]) {
    await prisma.propertyOffer.create({
      data: {
        propertyId: copy.id,
        transactionType: source.offers[0].transactionType,
        price: source.offers[0].price,
        rentPeriod: source.offers[0].rentPeriod,
        isActive: true,
      },
    });
    await syncPrimaryOffer(prisma, copy.id);
  }
  await prisma.propertyAmenity.createMany({
    data: source.amenities.map((a) => ({ propertyId: copy.id, amenityId: a.amenityId })),
  });
  await writeAudit({
    actorId: user.id,
    action: "property.duplicate",
    entityType: "property",
    entityId: copy.id,
    summary: `${source.reference} duplicated into ${copy.reference} (draft)`,
  });
  redirect(`/admin/properties/${copy.id}?duplicated=1`);
}

export async function deleteDraftAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.archive");
  const id = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUnique({
    where: { id },
    include: { _count: { select: { leads: true, appointments: true } } },
  });
  if (!property) redirect("/admin/properties?error=NOT_FOUND");
  if (property.status !== "draft" || property._count.leads > 0 || property._count.appointments > 0) {
    redirect(`/admin/properties/${id}?error=CANNOT_DELETE`);
  }
  await prisma.property.delete({ where: { id } });
  await writeAudit({
    actorId: user.id,
    action: "property.delete_draft",
    entityType: "property",
    entityId: id,
    summary: `Draft ${property.reference} permanently deleted (no related leads)`,
  });
  redirect("/admin/properties?deleted=1");
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export async function uploadMediaAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("media.manage");
  const propertyId = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, slug: true, reference: true } });
  if (!property) redirect("/admin/properties?error=NOT_FOUND");

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) redirect(`/admin/properties/${propertyId}?error=NO_FILES`);

  const existingCount = await prisma.propertyMedia.count({ where: { propertyId } });
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  let order = existingCount;
  for (const file of files.slice(0, 12)) {
    if (file.size > PRODUCT_LIMITS.maxImageBytes) {
      redirect(`/admin/properties/${propertyId}?error=FILE_TOO_LARGE`);
    }
    if (!PRODUCT_LIMITS.allowedMime.includes(file.type)) {
      redirect(`/admin/properties/${propertyId}?error=INVALID_FILE_TYPE`);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    // Re-encode through sharp: strips EXIF, validates the image and normalises size.
    let processed!: { buffer: Buffer; width?: number; height?: number };
    try {
      const image = sharp(buffer, { failOn: "error" }).rotate();
      const meta = await image.metadata();
      if (!meta.width || !meta.height) throw new Error("no dimensions");
      const resized = image.resize({ width: Math.min(meta.width, 2000), withoutEnlargement: true }).webp({ quality: 82 });
      const output = await resized.toBuffer({ resolveWithObject: true });
      processed = { buffer: output.data, width: output.info.width, height: output.info.height };
    } catch {
      redirect(`/admin/properties/${propertyId}?error=INVALID_IMAGE`);
    }
    const filename = `${crypto.randomBytes(12).toString("hex")}.webp`;
    await fs.writeFile(path.join(uploadDir, filename), processed.buffer);
    await prisma.propertyMedia.create({
      data: {
        propertyId: property.id,
        url: `/uploads/${filename}`,
        kind: "image",
        visibility: "public",
        sortOrder: order,
        isCover: order === 0 && existingCount === 0,
        altFr: property.reference,
        width: processed.width,
        height: processed.height,
      },
    });
    order += 1;
  }

  await writeAudit({
    actorId: user.id,
    action: "property.media_upload",
    entityType: "property",
    entityId: property.id,
    summary: `${Math.min(files.length, 12)} image(s) uploaded to ${property.reference}`,
  });
  revalidateProperty(property.slug);
  redirect(`/admin/properties/${property.id}?media=1`);
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("media.manage");
  const mediaId = String(formData.get("mediaId") ?? "");
  const media = await prisma.propertyMedia.findUnique({
    where: { id: mediaId },
    include: { property: { select: { id: true, slug: true, reference: true } } },
  });
  if (!media) redirect("/admin/properties?error=NOT_FOUND");

  await prisma.propertyMedia.delete({ where: { id: mediaId } });
  const remaining = await prisma.propertyMedia.findMany({
    where: { propertyId: media.propertyId },
    orderBy: { sortOrder: "asc" },
  });
  if (remaining.length && !remaining.some((m) => m.isCover)) {
    await prisma.propertyMedia.update({ where: { id: remaining[0]!.id }, data: { isCover: true } });
  }
  await writeAudit({
    actorId: user.id,
    action: "property.media_delete",
    entityType: "property",
    entityId: media.propertyId,
    summary: `Media removed from ${media.property.reference}`,
  });
  revalidateProperty(media.property.slug);
  redirect(`/admin/properties/${media.propertyId}?media=1`);
}

export async function setCoverMediaAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("media.manage");
  const mediaId = String(formData.get("mediaId") ?? "");
  const media = await prisma.propertyMedia.findUnique({ where: { id: mediaId }, include: { property: true } });
  if (!media) redirect("/admin/properties?error=NOT_FOUND");
  await prisma.$transaction([
    prisma.propertyMedia.updateMany({ where: { propertyId: media.propertyId }, data: { isCover: false } }),
    prisma.propertyMedia.update({ where: { id: mediaId }, data: { isCover: true } }),
  ]);
  await writeAudit({
    actorId: user.id,
    action: "property.media_cover",
    entityType: "property",
    entityId: media.propertyId,
    summary: `Cover image changed on ${media.property.reference}`,
  });
  revalidateProperty(media.property.slug);
  redirect(`/admin/properties/${media.propertyId}?media=1`);
}

export async function moveMediaAction(formData: FormData): Promise<void> {
  await requireStaffAction("media.manage");
  const mediaId = String(formData.get("mediaId") ?? "");
  const direction = String(formData.get("direction") ?? "up");
  const media = await prisma.propertyMedia.findUnique({ where: { id: mediaId } });
  if (!media) redirect("/admin/properties?error=NOT_FOUND");
  const siblings = await prisma.propertyMedia.findMany({
    where: { propertyId: media.propertyId },
    orderBy: { sortOrder: "asc" },
  });
  const index = siblings.findIndex((m) => m.id === mediaId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= siblings.length) redirect(`/admin/properties/${media.propertyId}?media=1`);
  await prisma.$transaction([
    prisma.propertyMedia.update({ where: { id: siblings[index]!.id }, data: { sortOrder: siblings[swapWith]!.sortOrder } }),
    prisma.propertyMedia.update({ where: { id: siblings[swapWith]!.id }, data: { sortOrder: siblings[index]!.sortOrder } }),
  ]);
  const property = await prisma.property.findUnique({ where: { id: media.propertyId }, select: { slug: true } });
  revalidateProperty(property?.slug);
  redirect(`/admin/properties/${media.propertyId}?media=1`);
}

// ---------------------------------------------------------------------------
// Verification and availability
// ---------------------------------------------------------------------------

export async function addVerificationAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.write");
  const propertyId = String(formData.get("propertyId") ?? "");
  const type = String(formData.get("type") ?? "availability");
  const result = String(formData.get("result") ?? "passed");
  const notes = String(formData.get("notes") ?? "").trim();
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) redirect("/admin/properties?error=NOT_FOUND");

  const levelByType: Record<string, string> = {
    availability: "availability_confirmed",
    identity: "identity_checked",
    ownership_document: "documents_reviewed",
    legal: "legally_verified",
  };

  await prisma.propertyVerification.create({
    data: {
      propertyId,
      type,
      result,
      notes: notes || null,
      verifiedById: user.id,
      nextCheckAt: new Date(Date.now() + 30 * 86_400_000),
    },
  });

  const levels = ["unverified", "identity_checked", "availability_confirmed", "documents_reviewed", "legally_verified"];
  const newLevel = levelByType[type];
  if (result === "passed" && newLevel) {
    const current = levels.indexOf(property.verificationLevel);
    const next = levels.indexOf(newLevel);
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        verificationLevel: next > current ? newLevel : property.verificationLevel,
        availabilityConfirmedAt: type === "availability" ? new Date() : property.availabilityConfirmedAt,
        nextAvailabilityCheckAt: new Date(Date.now() + 30 * 86_400_000),
      },
    });
  }

  await writeAudit({
    actorId: user.id,
    action: "property.verification",
    entityType: "property",
    entityId: propertyId,
    summary: `${type} verification recorded (${result}) for ${property.reference}`,
  });
  revalidateProperty(property.slug);
  redirect(`/admin/properties/${propertyId}?verified=1`);
}

export async function confirmAvailabilityAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.write");
  const propertyId = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) redirect("/admin/properties?error=NOT_FOUND");
  await prisma.$transaction([
    prisma.property.update({
      where: { id: propertyId },
      data: {
        availabilityConfirmedAt: new Date(),
        nextAvailabilityCheckAt: new Date(Date.now() + 30 * 86_400_000),
        verificationLevel:
          property.verificationLevel === "unverified" ? "availability_confirmed" : property.verificationLevel,
      },
    }),
    prisma.propertyVerification.create({
      data: {
        propertyId,
        type: "availability",
        result: "passed",
        notes: "Reconfirmation de disponibilité.",
        verifiedById: user.id,
        nextCheckAt: new Date(Date.now() + 30 * 86_400_000),
      },
    }),
  ]);
  await writeAudit({
    actorId: user.id,
    action: "property.availability_confirmed",
    entityType: "property",
    entityId: propertyId,
    summary: `Availability reconfirmed for ${property.reference}`,
  });
  revalidateProperty(property.slug);
  redirect(`/admin/properties/${propertyId}?confirmed=1`);
}
