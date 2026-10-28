import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/site/ListingView";
import { getSessionUser } from "@/lib/auth";
import { getT, isLocale } from "@/lib/i18n";
import type { RawParams } from "@/lib/search-params";

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<RawParams> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const raw = await searchParams;
  const isAr = locale === "ar";
  const filtered = !!raw.amenity || !!raw.price_min || !!raw.price_max || !!raw.beds || !!raw.featured;
  return {
    title: isAr ? "البحث عن عقار" : "Rechercher un bien",
    description: isAr
      ? "ابحث عن شقق وفيلات ومحلات وأراضٍ في المغرب حسب المدينة والسعر والمساحة."
      : "Recherchez des appartements, villas, commerces et terrains au Maroc par ville, prix et surface.",
    alternates: { canonical: `/${locale}/properties`, languages: { fr: "/fr/properties", ar: "/ar/properties" } },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function PropertiesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const raw = await searchParams;
  const t = getT(locale);
  const user = await getSessionUser();
  return <ListingView locale={locale} raw={raw} heading={t("search.title")} authenticated={!!user && !user.isStaff} />;
}
