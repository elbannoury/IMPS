import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/format";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getPublishedDevelopments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Programmes neufs",
  description: "Projets résidentiels et commerciaux suivis par IMPS au Maroc : unités, prix, avancement et livraison.",
  alternates: { canonical: "/fr/developments", languages: { fr: "/fr/developments", ar: "/ar/developments" } },
};

export default async function DevelopmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const developments = await getPublishedDevelopments(12);

  return (
    <div className="shell py-12 lg:py-16">
      <p className="eyebrow">{t("nav.developments")}</p>
      <h1 className="h-section mt-3">{t("developments.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        {locale === "ar"
          ? "مشاريع سكنية وتجارية مع الوحدات والأسعار وحالة التقدم كما أبلغ عنها المطوّر."
          : "Projets résidentiels et commerciaux avec unités, prix et avancement tels que communiqués par le promoteur."}
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {developments.map((development) => {
          const title = locale === "ar" ? development.nameAr || development.nameFr : development.nameFr;
          return (
            <Link key={development.slug} href={L(`/developments/${development.slug}`)} className="group block border border-line">
              <div className="relative aspect-[16/9] overflow-hidden bg-soft">
                {development.coverImage ? (
                  <Image src={development.coverImage} alt={title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : null}
                <span className="absolute start-3 top-3 badge-lemon">{development.units.length} {t("developments.units")}</span>
              </div>
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  {locale === "ar" ? development.city.nameAr : development.city.nameFr}
                  {development.deliveryDate ? ` · ${t("developments.delivery")} ${formatDate(development.deliveryDate, locale)}` : ""}
                </p>
                <h2 className="mt-2 font-display text-2xl">{title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {locale === "ar" ? development.descriptionAr || development.descriptionFr : development.descriptionFr}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-sm font-semibold tabular-nums">
                    {development.units[0]?.priceFrom ? `${locale === "ar" ? "من " : "dès "}${formatPrice(development.units[0].priceFrom, locale)}` : "—"}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
                    {development.constructionStatus === "delivered"
                      ? locale === "ar" ? "مُسلَّم" : "Livré"
                      : development.constructionStatus === "under_construction"
                        ? locale === "ar" ? "قيد البناء" : "En construction"
                        : locale === "ar" ? "مبرمج" : "Programmé"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
