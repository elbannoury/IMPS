import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { LOCALES, localePath } from "@/lib/i18n";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, cities, articles, developments] = await Promise.all([
    prisma.property.findMany({
      where: { status: "published", deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 5000,
    }),
    prisma.city.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    prisma.article.findMany({
      where: { status: "published", publishedAt: { lte: new Date() } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.development.findMany({ where: { status: "published" }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticPaths = [
    "/",
    "/properties",
    "/buy",
    "/rent",
    "/commercial",
    "/land",
    "/invest",
    "/cities",
    "/developments",
    "/guides",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of staticPaths) {
      entries.push({
        url: `${BASE}${localePath(locale, path)}`,
        changeFrequency: path === "/" ? "daily" : "weekly",
        priority: path === "/" ? 1 : 0.7,
        alternates: {
          languages: Object.fromEntries(LOCALES.map((code) => [code, `${BASE}${localePath(code, path)}`])),
        },
      });
    }
    for (const property of properties) {
      entries.push({
        url: `${BASE}${localePath(locale, `/properties/${property.slug}`)}`,
        lastModified: property.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((code) => [code, `${BASE}${localePath(code, `/properties/${property.slug}`)}`]),
          ),
        },
      });
    }
    for (const city of cities) {
      entries.push({
        url: `${BASE}${localePath(locale, `/cities/${city.slug}`)}`,
        lastModified: city.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    for (const article of articles) {
      entries.push({
        url: `${BASE}${localePath(locale, `/guides/${article.slug}`)}`,
        lastModified: article.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
    for (const development of developments) {
      entries.push({
        url: `${BASE}${localePath(locale, `/developments/${development.slug}`)}`,
        lastModified: development.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
