import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { AVAILABLE_STATUSES, PUBLIC_STATUSES } from "./status";

/**
 * Read models for the public website. Every public query uses an explicit
 * `select`/`include` so that internal fields (internal notes, owner contacts,
 * publication permissions, verification evidence, staff identities, audit
 * trails) can never leak into a public page or JSON response.
 */

const localeName = (row: { nameFr: string; nameAr: string }, locale: string) =>
  locale === "ar" ? row.nameAr : row.nameFr;

export type PropertyCard = {
  id: string;
  reference: string;
  slug: string;
  titleFr: string;
  titleAr: string | null;
  transactionType: string;
  status: string;
  primaryPrice: number | null;
  primaryRentPeriod: string | null;
  builtArea: number | null;
  landArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  isFeatured: boolean;
  isSample: boolean;
  verificationLevel: string;
  publishedAt: Date | null;
  availabilityConfirmedAt: Date | null;
  city: { slug: string; nameFr: string; nameAr: string };
  neighborhood: { slug: string; nameFr: string; nameAr: string } | null;
  category: { slug: string; nameFr: string; nameAr: string; kind: string };
  media: { url: string; altFr: string | null; altAr: string | null }[];
};

export const cardSelect = {
  id: true,
  reference: true,
  slug: true,
  titleFr: true,
  titleAr: true,
  transactionType: true,
  status: true,
  primaryPrice: true,
  primaryRentPeriod: true,
  builtArea: true,
  landArea: true,
  bedrooms: true,
  bathrooms: true,
  isFeatured: true,
  isSample: true,
  verificationLevel: true,
  publishedAt: true,
  availabilityConfirmedAt: true,
  city: { select: { slug: true, nameFr: true, nameAr: true } },
  neighborhood: { select: { slug: true, nameFr: true, nameAr: true } },
  category: { select: { slug: true, nameFr: true, nameAr: true, kind: true } },
  media: {
    where: { visibility: "public", kind: "image" },
    orderBy: { sortOrder: "asc" },
    take: 1,
    select: { url: true, altFr: true, altAr: true },
  },
} satisfies Prisma.PropertySelect;

export type SearchParams = {
  transaction?: "sale" | "rent";
  kind?: string;
  category?: string;
  city?: string;
  neighborhood?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  amenities?: string[];
  featured?: boolean;
  verified?: boolean;
  sort?: "relevant" | "newest" | "price_asc" | "price_desc" | "area_desc";
  page?: number;
  perPage?: number;
  includeUnavailable?: boolean;
};

export async function searchProperties(params: SearchParams) {
  const perPage = Math.min(Math.max(params.perPage ?? 12, 1), 48);
  const page = Math.max(params.page ?? 1, 1);

  const where: Prisma.PropertyWhereInput = {
    deletedAt: null,
    status: { in: params.includeUnavailable ? PUBLIC_STATUSES : ["published", "reserved"] },
  };
  if (params.transaction) where.transactionType = params.transaction;
  if (params.category) where.category = { slug: params.category };
  else if (params.kind) where.category = { kind: params.kind };
  if (params.city) where.city = { slug: params.city, isPublished: true };
  if (params.neighborhood) where.neighborhood = { slug: params.neighborhood };
  if (params.priceMin || params.priceMax) {
    where.primaryPrice = {
      ...(params.priceMin ? { gte: params.priceMin } : {}),
      ...(params.priceMax ? { lte: params.priceMax } : {}),
    };
  }
  if (params.areaMin || params.areaMax) {
    where.builtArea = {
      ...(params.areaMin ? { gte: params.areaMin } : {}),
      ...(params.areaMax ? { lte: params.areaMax } : {}),
    };
  }
  if (params.bedrooms) where.bedrooms = { gte: params.bedrooms };
  if (params.bathrooms) where.bathrooms = { gte: params.bathrooms };
  if (params.furnished !== undefined) where.furnished = params.furnished;
  if (params.featured) where.isFeatured = true;
  if (params.verified) where.verificationLevel = { not: "unverified" };
  if (params.amenities?.length) {
    where.AND = params.amenities.map((slug) => ({
      amenities: { some: { amenity: { slug } } },
    }));
  }

  const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
    params.sort === "price_asc"
      ? [{ primaryPrice: "asc" }]
      : params.sort === "price_desc"
        ? [{ primaryPrice: "desc" }]
        : params.sort === "area_desc"
          ? [{ builtArea: "desc" }]
          : params.sort === "newest"
            ? [{ publishedAt: "desc" }]
            : [{ isFeatured: "desc" }, { publishedAt: "desc" }];

  const [total, items] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      select: cardSelect,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    items: items as PropertyCard[],
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export const publicVerificationSelect = {
  type: true,
  result: true,
  verifiedAt: true,
  nextCheckAt: true,
} as const;

export async function getPropertyBySlug(slug: string) {
  return prisma.property.findFirst({
    where: { slug, deletedAt: null, status: { in: PUBLIC_STATUSES } },
    select: {
      id: true,
      reference: true,
      slug: true,
      titleFr: true,
      titleAr: true,
      descriptionFr: true,
      descriptionAr: true,
      transactionType: true,
      status: true,
      primaryPrice: true,
      primaryRentPeriod: true,
      builtArea: true,
      landArea: true,
      bedrooms: true,
      bathrooms: true,
      floors: true,
      floorNumber: true,
      parkingSpaces: true,
      yearBuilt: true,
      condition: true,
      furnished: true,
      streetFrontage: true,
      occupancyStatus: true,
      latitude: true,
      longitude: true,
      locationPrecision: true,
      addressLine: true,
      isFeatured: true,
      isSample: true,
      verificationLevel: true,
      publishedAt: true,
      availabilityConfirmedAt: true,
      nextAvailabilityCheckAt: true,
      metaTitleFr: true,
      metaDescriptionFr: true,
      metaTitleAr: true,
      metaDescriptionAr: true,
      viewCount: true,
      city: { select: { slug: true, nameFr: true, nameAr: true, latitude: true, longitude: true } },
      neighborhood: { select: { slug: true, nameFr: true, nameAr: true } },
      category: { select: { slug: true, nameFr: true, nameAr: true, kind: true } },
      media: {
        where: { visibility: "public" },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          url: true,
          kind: true,
          captionFr: true,
          captionAr: true,
          altFr: true,
          altAr: true,
          width: true,
          height: true,
        },
      },
      amenities: {
        select: { amenity: { select: { slug: true, labelFr: true, labelAr: true, group: true } } },
      },
      verifications: {
        where: { result: { in: ["passed", "partial"] } },
        select: publicVerificationSelect,
        orderBy: { verifiedAt: "desc" },
      },
      offers: {
        where: { isActive: true },
        select: { price: true, rentPeriod: true, transactionType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getSimilarProperties(property: {
  id: string;
  categorySlug?: string;
  citySlug?: string;
  transactionType: string;
}): Promise<PropertyCard[]> {
  const rows = await prisma.property.findMany({
    where: {
      id: { not: property.id },
      deletedAt: null,
      status: "published",
      transactionType: property.transactionType,
      OR: [{ category: { slug: property.categorySlug } }, { city: { slug: property.citySlug } }],
    },
    select: cardSelect,
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: 3,
  });
  return rows as PropertyCard[];
}

export async function incrementPropertyViews(id: string): Promise<void> {
  try {
    await prisma.property.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  } catch {
    /* view counting must never break rendering */
  }
}

export async function getFeaturedProperties(take = 3): Promise<PropertyCard[]> {
  return (await prisma.property.findMany({
    where: { deletedAt: null, status: "published", isFeatured: true },
    select: cardSelect,
    orderBy: [{ publishedAt: "desc" }],
    take,
  })) as PropertyCard[];
}

export async function getRecentProperties(take = 6): Promise<PropertyCard[]> {
  return (await prisma.property.findMany({
    where: { deletedAt: null, status: "published" },
    select: cardSelect,
    orderBy: [{ publishedAt: "desc" }],
    take,
  })) as PropertyCard[];
}

export async function getPropertiesByKind(kind: string, take = 3): Promise<PropertyCard[]> {
  return (await prisma.property.findMany({
    where: { deletedAt: null, status: "published", category: { kind } },
    select: cardSelect,
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take,
  })) as PropertyCard[];
}

export async function getCitiesWithCounts() {
  const cities = await prisma.city.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }],
    select: {
      slug: true,
      nameFr: true,
      nameAr: true,
      region: true,
      heroImage: true,
      descriptionFr: true,
      descriptionAr: true,
      _count: {
        select: {
          properties: { where: { status: { in: AVAILABLE_STATUSES }, deletedAt: null } },
          neighborhoods: true,
        },
      },
    },
  });
  return cities;
}

export async function getCityBySlug(slug: string) {
  return prisma.city.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      nameFr: true,
      nameAr: true,
      region: true,
      descriptionFr: true,
      descriptionAr: true,
      heroImage: true,
      neighborhoods: {
        where: { isPublished: true },
        orderBy: { nameFr: "asc" },
        select: {
          slug: true,
          nameFr: true,
          nameAr: true,
          _count: {
            select: { properties: { where: { status: { in: AVAILABLE_STATUSES }, deletedAt: null } } },
          },
        },
      },
    },
  });
}

export async function getFilterOptions() {
  const [categories, cities, amenities] = await Promise.all([
    prisma.propertyCategory.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      select: { id: true, slug: true, nameFr: true, nameAr: true, kind: true },
    }),
    prisma.city.findMany({
      where: { isPublished: true },
      orderBy: { nameFr: "asc" },
      select: {
        id: true,
        slug: true,
        nameFr: true,
        nameAr: true,
        neighborhoods: {
          where: { isPublished: true },
          orderBy: { nameFr: "asc" },
          select: { id: true, slug: true, nameFr: true, nameAr: true },
        },
      },
    }),
    prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: [{ group: "asc" }, { labelFr: "asc" }],
      select: { id: true, slug: true, labelFr: true, labelAr: true, group: true },
    }),
  ]);
  return { categories, cities, amenities };
}

export async function getInvestmentProperties() {
  return prisma.property.findMany({
    where: { deletedAt: null, status: "published", transactionType: "sale" },
    select: {
      ...cardSelect,
      documentedMonthlyRent: true,
      annualOperatingCosts: true,
    },
    orderBy: [{ primaryPrice: "asc" }],
    take: 24,
  });
}

export async function getPublishedArticles(take = 6) {
  return prisma.article.findMany({
    where: { status: "published", publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      slug: true,
      titleFr: true,
      titleAr: true,
      excerptFr: true,
      excerptAr: true,
      coverImage: true,
      publishedAt: true,
      category: { select: { nameFr: true, nameAr: true, slug: true } },
      city: { select: { nameFr: true, nameAr: true, slug: true } },
    },
  });
}

export async function getArticleBySlug(slug: string) {
  return prisma.article.findFirst({
    where: { slug, status: "published", publishedAt: { lte: new Date() } },
    select: {
      slug: true,
      titleFr: true,
      titleAr: true,
      excerptFr: true,
      excerptAr: true,
      bodyFr: true,
      bodyAr: true,
      coverImage: true,
      metaTitle: true,
      metaDescription: true,
      publishedAt: true,
      updatedAt: true,
      category: { select: { nameFr: true, nameAr: true, slug: true } },
      city: { select: { nameFr: true, nameAr: true, slug: true } },
      author: { select: { fullName: true } },
    },
  });
}

export async function getPublishedDevelopments(take = 6) {
  return prisma.development.findMany({
    where: { status: "published" },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      slug: true,
      nameFr: true,
      nameAr: true,
      descriptionFr: true,
      descriptionAr: true,
      developerName: true,
      constructionStatus: true,
      deliveryDate: true,
      coverImage: true,
      isSample: true,
      city: { select: { slug: true, nameFr: true, nameAr: true } },
      neighborhood: { select: { nameFr: true, nameAr: true } },
      units: {
        select: { id: true, unitType: true, priceFrom: true, area: true, status: true, bedrooms: true },
        orderBy: { priceFrom: "asc" },
      },
    },
  });
}

export async function getDevelopmentBySlug(slug: string) {
  return prisma.development.findFirst({
    where: { slug, status: "published" },
    include: {
      city: { select: { slug: true, nameFr: true, nameAr: true } },
      neighborhood: { select: { nameFr: true, nameAr: true } },
      units: { orderBy: { priceFrom: "asc" } },
    },
  });
}

export async function getSiteStats() {
  const [published, cities, guides] = await Promise.all([
    prisma.property.count({ where: { status: "published", deletedAt: null } }),
    prisma.city.count({ where: { isPublished: true } }),
    prisma.article.count({ where: { status: "published" } }),
  ]);
  return { published, cities, guides };
}

// ---------------------------------------------------------------------------
// Admin read models
// ---------------------------------------------------------------------------

export async function getAdminProperties(params: {
  q?: string;
  status?: string;
  categoryId?: string;
  cityId?: string;
  page?: number;
  perPage?: number;
}) {
  const page = Math.max(params.page ?? 1, 1);
  const perPage = Math.min(params.perPage ?? 20, 100);
  const where: Prisma.PropertyWhereInput = { deletedAt: null };
  if (params.status) where.status = params.status;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.cityId) where.cityId = params.cityId;
  if (params.q) {
    where.OR = [
      { reference: { contains: params.q } },
      { titleFr: { contains: params.q } },
      { titleAr: { contains: params.q } },
      { slug: { contains: params.q } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        reference: true,
        slug: true,
        titleFr: true,
        titleAr: true,
        status: true,
        sourcingStage: true,
        transactionType: true,
        primaryPrice: true,
        primaryRentPeriod: true,
        isFeatured: true,
        isSample: true,
        updatedAt: true,
        publishedAt: true,
        availabilityConfirmedAt: true,
        city: { select: { nameFr: true, nameAr: true } },
        category: { select: { nameFr: true, nameAr: true, kind: true } },
        assignedTo: { select: { id: true, fullName: true } },
        media: { where: { kind: "image" }, orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        _count: { select: { leads: true, media: true } },
      },
    }),
  ]);
  return { rows, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getStaffDirectory() {
  return prisma.profile.findMany({
    where: { isStaff: true, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, role: { select: { key: true, nameFr: true, nameAr: true } } },
  });
}

export async function getDashboardData() {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 30 * 86_400_000);

  const [byStatus, pipeline, newLeads, pendingViewings, followUpsDue, staleCount, staleList, recentAudit, totalActive] =
    await Promise.all([
      prisma.property.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.propertyLead.groupBy({ by: ["stage"], _count: { _all: true } }),
      prisma.lead.count({ where: { status: "new" } }),
      prisma.viewingAppointment.count({ where: { status: "requested" } }),
      prisma.lead.count({
        where: { followUpAt: { lte: now }, status: { notIn: ["converted", "lost"] } },
      }),
      prisma.property.count({
        where: {
          deletedAt: null,
          status: "published",
          OR: [{ availabilityConfirmedAt: null }, { availabilityConfirmedAt: { lt: staleCutoff } }],
        },
      }),
      prisma.property.findMany({
        where: {
          deletedAt: null,
          status: "published",
          OR: [{ availabilityConfirmedAt: null }, { availabilityConfirmedAt: { lt: staleCutoff } }],
        },
        orderBy: { availabilityConfirmedAt: "asc" },
        take: 5,
        select: {
          id: true,
          reference: true,
          titleFr: true,
          availabilityConfirmedAt: true,
          assignedTo: { select: { id: true, fullName: true } },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          action: true,
          summary: true,
          createdAt: true,
          entityType: true,
          entityId: true,
          actor: { select: { fullName: true } },
        },
      }),
      prisma.property.count({ where: { deletedAt: null, status: { not: "archived" } } }),
    ]);

  const counts: Record<string, number> = {};
  for (const row of byStatus) counts[row.status] = row._count._all;
  const stageCounts: Record<string, number> = {};
  for (const row of pipeline) stageCounts[row.stage] = row._count._all;

  return {
    counts,
    totalActive,
    stageCounts,
    newLeads,
    pendingViewings,
    followUpsDue,
    staleCount,
    staleList,
    recentAudit,
  };
}

export async function getReportData() {
  const [
    byCategory,
    byCity,
    byTransaction,
    leadBySource,
    leadByStatus,
    appointmentByStatus,
    staffWorkload,
    priceChanges,
    stageAging,
  ] = await Promise.all([
    prisma.property.groupBy({ by: ["categoryId"], _count: { _all: true }, where: { deletedAt: null } }),
    prisma.property.groupBy({ by: ["cityId"], _count: { _all: true }, where: { deletedAt: null } }),
    prisma.property.groupBy({ by: ["transactionType"], _count: { _all: true }, where: { deletedAt: null } }),
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.viewingAppointment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["assignedToId"], _count: { _all: true } }),
    prisma.auditLog.count({ where: { action: "property.price_change" } }),
    prisma.propertyLead.groupBy({ by: ["stage"], _count: { _all: true } }),
  ]);

  const [categories, cities, staff] = await Promise.all([
    prisma.propertyCategory.findMany({ select: { id: true, nameFr: true, nameAr: true } }),
    prisma.city.findMany({ select: { id: true, nameFr: true, nameAr: true } }),
    prisma.profile.findMany({ where: { isStaff: true }, select: { id: true, fullName: true } }),
  ]);

  return {
    byCategory: byCategory.map((r) => ({
      label: categories.find((c) => c.id === r.categoryId)?.nameFr ?? "—",
      count: r._count._all,
    })),
    byCity: byCity.map((r) => ({
      label: cities.find((c) => c.id === r.cityId)?.nameFr ?? "—",
      count: r._count._all,
    })),
    byTransaction: byTransaction.map((r) => ({ label: r.transactionType, count: r._count._all })),
    leadBySource: leadBySource.map((r) => ({ label: r.source, count: r._count._all })),
    leadByStatus: leadByStatus.map((r) => ({ label: r.status, count: r._count._all })),
    appointmentByStatus: appointmentByStatus.map((r) => ({ label: r.status, count: r._count._all })),
    staffWorkload: staffWorkload.map((r) => ({
      label: staff.find((s) => s.id === r.assignedToId)?.fullName ?? "Non assigné",
      count: r._count._all,
    })),
    stageCounts: stageAging.map((r) => ({ label: r.stage, count: r._count._all })),
    priceChanges,
  };
}

export function cityName(city: { nameFr: string; nameAr: string }, locale: string) {
  return localeName(city, locale);
}
