import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getCitiesWithCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Villes",
  description: "Découvrez les biens disponibles par ville au Maroc : Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès.",
  alternates: { canonical: "/fr/cities", languages: { fr: "/fr/cities", ar: "/ar/cities" } },
};

export default async function CitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const cities = await getCitiesWithCounts();

  return (
    <div className="shell py-12 lg:py-16">
      <p className="eyebrow">IMPS</p>
      <h1 className="h-section mt-3">{t("cities.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        {locale === "ar"
          ? "اختر مدينة لاستكشاف العقارات المتوفرة وأحيائها."
          : "Choisissez une ville pour explorer les biens disponibles et ses quartiers."}
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => (
          <Link key={city.slug} href={L(`/cities/${city.slug}`)} className="group block">
            <div className="relative aspect-[4/3] overflow-hidden bg-soft">
              {city.heroImage ? (
                <Image src={city.heroImage} alt={locale === "ar" ? city.nameAr : city.nameFr} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : null}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <h2 className="font-display text-2xl">{locale === "ar" ? city.nameAr : city.nameFr}</h2>
              <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
                {city._count.properties} {t("cities.properties")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{city.region}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
