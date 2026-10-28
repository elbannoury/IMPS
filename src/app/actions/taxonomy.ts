"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaffAction } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { categorySchema, citySchema, neighborhoodSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";

export async function saveCategoryAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("taxonomy.manage");
  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug") || undefined,
    nameFr: formData.get("nameFr"),
    nameAr: formData.get("nameAr"),
    kind: formData.get("kind"),
    sortOrder: formData.get("sortOrder") ?? undefined,
    isActive: formData.get("isActive") ?? undefined,
  });
  if (!parsed.success) redirect("/admin/taxonomy?error=INVALID");
  const data = parsed.data;

  if (data.id) {
    const before = await prisma.propertyCategory.findUnique({ where: { id: data.id } });
    await prisma.propertyCategory.update({
      where: { id: data.id },
      data: { nameFr: data.nameFr, nameAr: data.nameAr, kind: data.kind, sortOrder: data.sortOrder ?? 0, isActive: data.isActive },
    });
    await writeAudit({
      actorId: user.id,
      action: "taxonomy.category_update",
      entityType: "property_category",
      entityId: data.id,
      summary: `Category updated: ${data.nameFr}`,
      before: { nameFr: before?.nameFr, isActive: before?.isActive },
      after: { nameFr: data.nameFr, isActive: data.isActive },
    });
  } else {
    const created = await prisma.propertyCategory.create({
      data: {
        slug: data.slug ? slugify(data.slug) : slugify(data.nameFr),
        nameFr: data.nameFr,
        nameAr: data.nameAr,
        kind: data.kind,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive,
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "taxonomy.category_create",
      entityType: "property_category",
      entityId: created.id,
      summary: `Category created: ${created.nameFr}`,
    });
  }
  revalidatePath("/admin/taxonomy");
  revalidatePath("/fr/properties");
  revalidatePath("/ar/properties");
  redirect("/admin/taxonomy?saved=1");
}

export async function deactivateCategoryAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("taxonomy.manage");
  const id = String(formData.get("id") ?? "");
  const category = await prisma.propertyCategory.findUnique({
    where: { id },
    include: { _count: { select: { properties: true } } },
  });
  if (!category) redirect("/admin/taxonomy?error=NOT_FOUND");

  // Deactivate instead of deleting when in use: never orphan properties.
  if (category._count.properties > 0) {
    await prisma.propertyCategory.update({ where: { id }, data: { isActive: false } });
    await writeAudit({
      actorId: user.id,
      action: "taxonomy.category_deactivate",
      entityType: "property_category",
      entityId: id,
      summary: `Category deactivated (${category._count.properties} properties keep it): ${category.nameFr}`,
    });
    redirect("/admin/taxonomy?deactivated=1");
  }
  await prisma.propertyCategory.delete({ where: { id } });
  await writeAudit({
    actorId: user.id,
    action: "taxonomy.category_delete",
    entityType: "property_category",
    entityId: id,
    summary: `Unused category deleted: ${category.nameFr}`,
  });
  redirect("/admin/taxonomy?deleted=1");
}

export async function saveCityAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("location.manage");
  const parsed = citySchema.safeParse({
    id: formData.get("id") || undefined,
    nameFr: formData.get("nameFr"),
    nameAr: formData.get("nameAr"),
    region: formData.get("region") ?? "",
    descriptionFr: formData.get("descriptionFr") ?? "",
    descriptionAr: formData.get("descriptionAr") ?? "",
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
    isPublished: formData.get("isPublished") ?? undefined,
    sortOrder: formData.get("sortOrder") ?? undefined,
  });
  if (!parsed.success) redirect("/admin/locations?error=INVALID");
  const data = parsed.data;

  if (data.id) {
    await prisma.city.update({
      where: { id: data.id },
      data: {
        nameFr: data.nameFr,
        nameAr: data.nameAr,
        region: data.region ?? null,
        descriptionFr: data.descriptionFr ?? null,
        descriptionAr: data.descriptionAr ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isPublished: data.isPublished,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "location.city_update",
      entityType: "city",
      entityId: data.id,
      summary: `City updated: ${data.nameFr}`,
    });
  } else {
    const created = await prisma.city.create({
      data: {
        slug: slugify(data.nameFr),
        nameFr: data.nameFr,
        nameAr: data.nameAr,
        region: data.region ?? null,
        descriptionFr: data.descriptionFr ?? null,
        descriptionAr: data.descriptionAr ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isPublished: data.isPublished,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "location.city_create",
      entityType: "city",
      entityId: created.id,
      summary: `City created: ${created.nameFr}`,
    });
  }
  revalidatePath("/admin/locations");
  redirect("/admin/locations?saved=1");
}

export async function saveNeighborhoodAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("location.manage");
  const parsed = neighborhoodSchema.safeParse({
    id: formData.get("id") || undefined,
    cityId: formData.get("cityId"),
    nameFr: formData.get("nameFr"),
    nameAr: formData.get("nameAr"),
    descriptionFr: formData.get("descriptionFr") ?? "",
    isPublished: formData.get("isPublished") ?? undefined,
  });
  if (!parsed.success) redirect("/admin/locations?error=INVALID");
  const data = parsed.data;

  if (data.id) {
    await prisma.neighborhood.update({
      where: { id: data.id },
      data: {
        nameFr: data.nameFr,
        nameAr: data.nameAr,
        descriptionFr: data.descriptionFr ?? null,
        isPublished: data.isPublished,
      },
    });
  } else {
    await prisma.neighborhood.create({
      data: {
        cityId: data.cityId,
        slug: slugify(data.nameFr),
        nameFr: data.nameFr,
        nameAr: data.nameAr,
        descriptionFr: data.descriptionFr ?? null,
        isPublished: data.isPublished,
      },
    });
  }
  await writeAudit({
    actorId: user.id,
    action: "location.neighborhood_save",
    entityType: "neighborhood",
    entityId: data.id ?? "new",
    summary: `Neighbourhood saved: ${data.nameFr}`,
  });
  revalidatePath("/admin/locations");
  redirect("/admin/locations?saved=1");
}

export async function toggleAmenityAction(formData: FormData): Promise<void> {
  await requireStaffAction("taxonomy.manage");
  const id = String(formData.get("id") ?? "");
  const amenity = await prisma.amenity.findUnique({ where: { id } });
  if (!amenity) redirect("/admin/taxonomy?error=NOT_FOUND");
  await prisma.amenity.update({ where: { id }, data: { isActive: !amenity.isActive } });
  redirect("/admin/taxonomy?saved=1");
}
