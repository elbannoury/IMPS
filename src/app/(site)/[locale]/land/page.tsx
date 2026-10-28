import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/site/ListingView";
import { getSessionUser } from "@/lib/auth";
import { getT, isLocale } from "@/lib/i18n";
import type { RawParams } from "@/lib/search-params";

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<RawParams> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr ? 'الأراضي في المغرب' : 'Terrains au Maroc',
    description: isAr ? 'أراضٍ قابلة للبناء وزراعية، مع الحالة الوثائقية المعروفة فعلياً.' : 'Terrains constructibles, agricoles et foncier à bâtir, avec le statut documentaire réellement connu.',
    alternates: { canonical: `/${locale}/land`, languages: { fr: "/fr/land", ar: "/ar/land" } },
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const raw = await searchParams;
  const t = getT(locale);
  const user = await getSessionUser();
  return (
    <ListingView
      locale={locale}
      raw={raw}
      basePath="/land"
      preset={{ kind: "land" }}
      heading={t("nav.land")}
      intro={locale === "ar" ? 'أراضٍ قابلة للبناء وزراعية، مع الحالة الوثائقية المعروفة فعلياً.' : 'Terrains constructibles, agricoles et foncier à bâtir, avec le statut documentaire réellement connu.'}
      authenticated={!!user && !user.isStaff}
    />
  );
}
