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
    title: isAr ? 'العقارات التجارية' : 'Immobilier commercial',
    description: isAr ? 'مكاتب ومحلات ومستودعات ومساحات صناعية — مختارة ومُتحقَّق منها من IMPS.' : 'Bureaux, locaux commerciaux, entrepôts et surfaces industrielles — sélectionnés et vérifiés par IMPS.',
    alternates: { canonical: `/${locale}/commercial`, languages: { fr: "/fr/commercial", ar: "/ar/commercial" } },
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
      basePath="/commercial"
      preset={{ kind: "commercial" }}
      heading={t("nav.commercial")}
      intro={locale === "ar" ? 'مكاتب ومحلات ومستودعات ومساحات صناعية — مختارة ومُتحقَّق منها من IMPS.' : 'Bureaux, locaux commerciaux, entrepôts et surfaces industrielles — sélectionnés et vérifiés par IMPS.'}
      authenticated={!!user && !user.isStaff}
    />
  );
}
