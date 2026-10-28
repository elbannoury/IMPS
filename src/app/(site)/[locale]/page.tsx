import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/site/PropertyCard";
import { SearchForm } from "@/components/site/SearchForm";
import { SectionHeading } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { getT, isLocale, localePath } from "@/lib/i18n";
import {
  getCitiesWithCounts,
  getFeaturedProperties,
  getFilterOptions,
  getPropertiesByKind,
  getPublishedArticles,
  getPublishedDevelopments,
  getRecentProperties,
  getSiteStats,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr ? "IMPS — عقارات موثقة في المغرب" : "IMPS — Immobilier vérifié au Maroc",
    description: isAr
      ? "شقق وفيلات ورياضات ومحلات وأراضٍ مختارة ومُتحقَّق منها من فريق IMPS في المغرب."
      : "Appartements, villas, riads, commerces et terrains sélectionnés, vérifiés et publiés par l'équipe IMPS au Maroc.",
    alternates: { canonical: `/${locale}`, languages: { fr: "/fr", ar: "/ar" } },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);

  const [user, featured, recent, cities, options, commercial, developments, articles, stats] = await Promise.all([
    getSessionUser(),
    getFeaturedProperties(3),
    getRecentProperties(6),
    getCitiesWithCounts(),
    getFilterOptions(),
    getPropertiesByKind("commercial", 3),
    getPublishedDevelopments(2),
    getPublishedArticles(3),
    getSiteStats(),
  ]);

  const authenticated = !!user && !user.isStaff;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white pb-14 pt-10 lg:pb-20 lg:pt-16">
        <div className="shell grid gap-10 lg:grid-cols-[1.02fr_1fr] lg:items-center">
          <div className="animate-rise">
            <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              <span className="inline-block h-px w-8 bg-ink" aria-hidden="true" />
              {t("hero.eyebrow")}
            </p>
            <h1 className="h-display mt-6 max-w-[15ch]">{t("hero.title")}</h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">{t("hero.subtitle")}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={L("/properties")} className="btn-primary">
                {t("hero.cta")}
              </Link>
              <Link href={L("/contact")} className="btn-outline">
                {t("hero.ctaSecondary")}
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{t("admin.properties")}</dt>
                <dd className="mt-1 font-display text-3xl tabular-nums leading-none">{stats.published}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{t("cities.title")}</dt>
                <dd className="mt-1 font-display text-3xl tabular-nums leading-none">{stats.cities}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{t("guides.title")}</dt>
                <dd className="mt-1 font-display text-3xl tabular-nums leading-none">{stats.guides}</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden bg-soft lg:aspect-[5/5.2]">
              <Image
                src="/media/hero.jpg"
                alt={locale === "ar" ? "عمارة سكنية حديثة" : "Résidence contemporaine au Maroc"}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-0 start-0 max-w-[260px] bg-lemon p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/60">{t("home.trust2Title")}</p>
              <p className="mt-2 font-display text-xl leading-tight text-ink">{t("home.trust3Title")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="border-y border-line bg-soft/60 py-8">
        <div className="shell">
          <SearchForm locale={locale} options={options} />
          <p className="mt-3 text-[11px] text-muted">{t("search.mapUnavailable")}</p>
        </div>
      </section>

      {/* Featured */}
      <section className="shell py-16 lg:py-20">
        <SectionHeading
          eyebrow={t("home.featured")}
          title={t("home.featuredSub")}
          action={
            <Link href={L("/properties?featured=1")} className="btn-outline btn-sm self-start">
              {t("common.viewAll")}
            </Link>
          }
        />
        {featured.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property, index) => (
              <PropertyCard key={property.id} property={property} locale={locale} authenticated={authenticated} priority={index === 0} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("common.noResults")}</p>
        )}
      </section>

      {/* Cities */}
      <section className="border-y border-line bg-ink py-16 text-white lg:py-20">
        <div className="shell">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-white/50">{t("home.cities")}</p>
              <h2 className="h-section mt-3 text-white">{t("home.citiesSub")}</h2>
            </div>
            <Link href={L("/cities")} className="btn-outline btn-sm border-white/40 text-white hover:border-white hover:bg-white hover:text-ink">
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/15 md:grid-cols-3 lg:grid-cols-6">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={L(`/cities/${city.slug}`)}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden bg-ink p-4"
              >
                {city.heroImage ? (
                  <Image
                    src={city.heroImage}
                    alt={locale === "ar" ? city.nameAr : city.nameFr}
                    fill
                    sizes="(max-width: 768px) 50vw, 200px"
                    className="object-cover opacity-55 transition-all duration-700 group-hover:scale-105 group-hover:opacity-40"
                  />
                ) : null}
                <div className="relative">
                  <p className="font-display text-xl leading-tight text-white">{locale === "ar" ? city.nameAr : city.nameFr}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
                    {city._count.properties} {t("cities.properties")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent */}
      <section className="shell py-16 lg:py-20">
        <SectionHeading
          eyebrow={t("home.recent")}
          title={t("home.recentSub")}
          action={
            <Link href={L("/properties?sort=newest")} className="btn-outline btn-sm self-start">
              {t("common.viewAll")}
            </Link>
          }
        />
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((property) => (
            <PropertyCard key={property.id} property={property} locale={locale} authenticated={authenticated} />
          ))}
        </div>
      </section>

      {/* Commercial + developments */}
      <section className="border-y border-line bg-soft py-16 lg:py-20">
        <div className="shell grid gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <SectionHeading eyebrow={t("home.commercial")} title={t("home.commercialSub")} />
            <div className="space-y-4">
              {commercial.map((property) => {
                const title = locale === "ar" ? property.titleAr || property.titleFr : property.titleFr;
                const cover = property.media[0];
                return (
                  <Link key={property.id} href={L(`/properties/${property.slug}`)} className="group flex gap-4 border-b border-line pb-4">
                    <div className="relative h-24 w-32 shrink-0 overflow-hidden bg-white">
                      {cover ? <Image src={cover.url} alt={title} fill sizes="128px" className="object-cover transition-transform duration-700 group-hover:scale-105" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                        {locale === "ar" ? property.city.nameAr : property.city.nameFr}
                      </p>
                      <p className="mt-1 truncate font-display text-lg leading-snug">{title}</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">{formatPrice(property.primaryPrice, locale, { period: property.primaryRentPeriod, suffix: property.transactionType === "rent" })}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link href={L("/commercial")} className="btn-outline btn-sm mt-6">
              {t("common.viewAll")}
            </Link>
          </div>

          <div>
            <SectionHeading eyebrow={t("home.developments")} title={t("home.developmentsSub")} />
            <div className="space-y-5">
              {developments.map((development) => (
                <Link key={development.slug} href={L(`/developments/${development.slug}`)} className="group block border border-line bg-white">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {development.coverImage ? (
                      <Image src={development.coverImage} alt={locale === "ar" ? development.nameAr || development.nameFr : development.nameFr} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : null}
                    <span className="absolute start-3 top-3 badge-lemon">
                      {development.units.length} {t("developments.units")}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-4 p-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                        {locale === "ar" ? development.city.nameAr : development.city.nameFr}
                        {development.deliveryDate ? ` · ${t("developments.delivery")} ${formatDate(development.deliveryDate, locale)}` : ""}
                      </p>
                      <p className="mt-1 font-display text-lg">{locale === "ar" ? development.nameAr || development.nameFr : development.nameFr}</p>
                    </div>
                    {development.units[0]?.priceFrom ? (
                      <p className="whitespace-nowrap text-xs font-semibold tabular-nums">
                        {locale === "ar" ? "من " : "dès "}
                        {formatPrice(development.units[0].priceFrom, locale)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
            <Link href={L("/developments")} className="btn-outline btn-sm mt-6">
              {t("common.viewAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="shell py-16 lg:py-24">
        <p className="eyebrow">{t("home.trust")}</p>
        <div className="mt-6 grid gap-10 border-t border-line pt-10 md:grid-cols-3">
          {[
            { n: "01", title: t("home.trust1Title"), body: t("home.trust1Body") },
            { n: "02", title: t("home.trust2Title"), body: t("home.trust2Body") },
            { n: "03", title: t("home.trust3Title"), body: t("home.trust3Body") },
          ].map((item) => (
            <div key={item.n}>
              <p className="font-display text-sm text-muted">{item.n}</p>
              <h3 className="mt-3 font-display text-xl leading-tight">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guides */}
      {articles.length ? (
        <section className="border-t border-line bg-soft py-16 lg:py-20">
          <div className="shell">
            <SectionHeading
              eyebrow={t("home.guides")}
              title={t("home.guidesSub")}
              action={
                <Link href={L("/guides")} className="btn-outline btn-sm self-start">
                  {t("common.viewAll")}
                </Link>
              }
            />
            <div className="grid gap-x-6 gap-y-8 md:grid-cols-3">
              {articles.map((article) => (
                <Link key={article.slug} href={L(`/guides/${article.slug}`)} className="group block">
                  <div className="relative aspect-[16/11] overflow-hidden bg-white">
                    {article.coverImage ? (
                      <Image src={article.coverImage} alt={locale === "ar" ? article.titleAr || article.titleFr : article.titleFr} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : null}
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted">
                    {article.category ? (locale === "ar" ? article.category.nameAr : article.category.nameFr) : t("guides.title")}
                  </p>
                  <h3 className="mt-1.5 font-display text-xl leading-snug">
                    {locale === "ar" ? article.titleAr || article.titleFr : article.titleFr}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Seller CTA */}
      <section className="bg-ink py-16 text-white lg:py-20">
        <div className="shell grid gap-8 lg:grid-cols-[1.2fr_auto] lg:items-center">
          <div>
            <h2 className="h-section max-w-2xl text-white">{t("home.ctaTitle")}</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">{t("home.ctaBody")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={L("/contact")} className="btn-accent">
              {t("nav.contact")}
            </Link>
            <Link href={L("/about")} className="btn-outline border-white/40 text-white hover:border-white hover:bg-white hover:text-ink">
              {t("about.title")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
