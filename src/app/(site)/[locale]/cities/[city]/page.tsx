import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/site/PropertyCard";
import { getSessionUser } from "@/lib/auth";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getCitiesWithCounts, getCityBySlug, searchProperties } from "@/lib/queries";

type PageProps = { params: Promise<{ locale: string; city: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, city } = await params;
  const row = await getCityBySlug(city);
  if (!row) return { title: "Ville" };
  const name = locale === "ar" ? row.nameAr : row.nameFr;
  return {
    title: `${name} — biens disponibles`,
    description:
      locale === "ar"
        ? `عقارات متوفرة في ${row.nameAr}: شقق وفيلات ومحلات وأراضٍ.`
        : `Biens immobiliers disponibles à ${row.nameFr} : appartements, villas, commerces et terrains.`,
    alternates: { canonical: `/${locale}/cities/${row.slug}`, languages: { fr: `/fr/cities/${row.slug}`, ar: `/ar/cities/${row.slug}` } },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { locale, city } = await params;
  if (!isLocale(locale)) notFound();
  const row = await getCityBySlug(city);
  if (!row) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const [results, user, cities] = await Promise.all([
    searchProperties({ city: row.slug, perPage: 9 }),
    getSessionUser(),
    getCitiesWithCounts(),
  ]);
  const name = locale === "ar" ? row.nameAr : row.nameFr;
  const description = locale === "ar" ? row.descriptionAr || row.descriptionFr : row.descriptionFr;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        {row.heroImage ? (
          <div className="absolute inset-0">
            <Image src={row.heroImage} alt={name} fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/20" />
          </div>
        ) : null}
        <div className={`shell relative py-16 text-white lg:py-24 ${row.heroImage ? "" : "text-ink"}`}>
          <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] opacity-70">
            <Link href={L("/")} className="hover:opacity-100">IMPS</Link>
            <span className="px-2">/</span>
            <Link href={L("/cities")} className="hover:opacity-100">{t("cities.title")}</Link>
          </nav>
          <h1 className="h-display mt-4">{name}</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-80">{description}</p>
          <p className="mt-5 text-[11px] uppercase tracking-[0.14em] opacity-70">
            {row.neighborhoods.length} {t("cities.neighborhoods")} · {results.total} {t("cities.properties")}
          </p>
        </div>
      </section>

      {row.neighborhoods.length ? (
        <div className="border-b border-line bg-soft/60">
          <div className="shell flex flex-wrap gap-2 py-4">
            {row.neighborhoods.map((hood) => (
              <Link
                key={hood.slug}
                href={`${L("/properties")}?city=${row.slug}&hood=${row.slug}/${hood.slug}`}
                className="border border-line bg-white px-3 py-1.5 text-[11px] hover:border-ink"
              >
                {locale === "ar" ? hood.nameAr : hood.nameFr}
                <span className="ms-2 text-muted tabular-nums">{hood._count.properties}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <section className="shell py-12">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="h-section">{t("cities.properties")}</h2>
          <Link href={`${L("/properties")}?city=${row.slug}`} className="btn-outline btn-sm">
            {t("common.viewAll")}
          </Link>
        </div>
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {results.items.map((property) => (
            <PropertyCard key={property.id} property={property} locale={locale} authenticated={!!user && !user.isStaff} />
          ))}
        </div>
        {!results.items.length ? (
          <p className="border border-dashed border-line py-16 text-center text-sm text-muted">{t("common.noResults")}</p>
        ) : null}
      </section>

      <section className="shell pb-16">
        <h2 className="font-display text-xl">{t("cities.title")}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {cities
            .filter((c) => c.slug !== row.slug)
            .map((c) => (
              <Link key={c.slug} href={L(`/cities/${c.slug}`)} className="border border-line px-3 py-2 text-sm hover:border-ink">
                {locale === "ar" ? c.nameAr : c.nameFr}
                <span className="ms-2 text-[11px] text-muted tabular-nums">{c._count.properties}</span>
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}
