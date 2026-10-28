import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui";
import { formatArea, formatDate, formatPrice } from "@/lib/format";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getDevelopmentBySlug } from "@/lib/queries";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const development = await getDevelopmentBySlug(slug);
  if (!development) return { title: "Programme" };
  const title = locale === "ar" ? development.nameAr || development.nameFr : development.nameFr;
  return {
    title,
    description: (locale === "ar" ? development.descriptionAr || development.descriptionFr : development.descriptionFr).slice(0, 158),
    alternates: { canonical: `/${locale}/developments/${development.slug}`, languages: { fr: `/fr/developments/${development.slug}`, ar: `/ar/developments/${development.slug}` } },
  };
}

export default async function DevelopmentPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const development = await getDevelopmentBySlug(slug);
  if (!development) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const title = locale === "ar" ? development.nameAr || development.nameFr : development.nameFr;

  return (
    <div className="shell py-10">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
        <Link href={L("/")} className="hover:text-ink">IMPS</Link>
        <span className="px-2">/</span>
        <Link href={L("/developments")} className="hover:text-ink">{t("developments.title")}</Link>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="relative aspect-[16/9] overflow-hidden bg-soft">
            {development.coverImage ? <Image src={development.coverImage} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover" /> : null}
          </div>
          <h1 className="mt-6 font-display text-[clamp(1.9rem,3.4vw,2.8rem)] leading-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            {locale === "ar" ? development.city.nameAr : development.city.nameFr}
            {development.neighborhood ? ` · ${locale === "ar" ? development.neighborhood.nameAr : development.neighborhood.nameFr}` : ""}
            {development.developerName ? ` · ${development.developerName}` : ""}
          </p>
          <div className="prose-editorial mt-6">
            {(locale === "ar" ? development.descriptionAr || development.descriptionFr : development.descriptionFr)
              .split(/\n{2,}/)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
          {development.isSample ? <Notice tone="neutral">{t("property.sampleNotice")}</Notice> : null}
        </div>

        <aside className="lg:sticky lg:top-[132px] lg:self-start">
          <div className="border border-line p-5">
            <p className="eyebrow">{t("developments.units")}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("developments.delivery")}</dt>
                <dd>{formatDate(development.deliveryDate, locale)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("developments.progress")}</dt>
                <dd>
                  {development.constructionStatus === "delivered"
                    ? locale === "ar" ? "مُسلَّم" : "Livré"
                    : development.constructionStatus === "under_construction"
                      ? locale === "ar" ? "قيد البناء" : "En construction"
                      : locale === "ar" ? "مبرمج" : "Programmé"}
                </dd>
              </div>
            </dl>

            <ul className="mt-5 divide-y divide-line border-t border-line">
              {development.units.map((unit) => (
                <li key={unit.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{unit.unitType} · {unit.code}</p>
                    <p className="text-sm font-semibold tabular-nums">{formatPrice(unit.priceFrom, locale)}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {[
                      unit.bedrooms ? `${unit.bedrooms} ${t("search.bedrooms")}` : null,
                      unit.bathrooms ? `${unit.bathrooms} ${t("search.bathrooms")}` : null,
                      unit.area ? formatArea(unit.area, locale) : null,
                      unit.status === "available" ? t("days.available") : unit.status,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>

            <Link href={L("/contact")} className="btn-primary mt-5 w-full">
              {t("property.inquire")}
            </Link>
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              {locale === "ar"
                ? "الأسعار والتوفر إرشادية وتُؤكد لدى المطوّر."
                : "Prix et disponibilités indicatifs, à confirmer auprès du promoteur."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
