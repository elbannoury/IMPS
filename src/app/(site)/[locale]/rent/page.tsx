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
    title: isAr ? 'الكراء في المغرب' : 'Louer au Maroc',
    description: isAr ? 'إيجارات سكنية ومهنية، مفروشة أو غير مفروشة، مع تحديد مدة الإيجار.' : 'Locations résidentielles et professionnelles, meublées ou non, avec période de loyer explicite.',
    alternates: { canonical: `/${locale}/rent`, languages: { fr: "/fr/rent", ar: "/ar/rent" } },
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
      basePath="/rent"
      preset={{ transaction: "rent" }}
      heading={t("nav.rent")}
      intro={locale === "ar" ? 'إيجارات سكنية ومهنية، مفروشة أو غير مفروشة، مع تحديد مدة الإيجار.' : 'Locations résidentielles et professionnelles, meublées ou non, avec période de loyer explicite.'}
      authenticated={!!user && !user.isStaff}
    />
  );
}
