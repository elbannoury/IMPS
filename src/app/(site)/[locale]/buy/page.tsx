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
    title: isAr ? 'الشراء في المغرب' : 'Acheter au Maroc',
    description: isAr ? 'شقق وفيلات ورياضات ومنازل للبيع مع أسعار مطلوبة وتوفر مُتحقَّق منه من فريق IMPS.' : "Appartements, villas, riads et maisons à vendre, avec prix demandés et disponibilités vérifiées par l'équipe IMPS.",
    alternates: { canonical: `/${locale}/buy`, languages: { fr: "/fr/buy", ar: "/ar/buy" } },
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
      basePath="/buy"
      preset={{ transaction: "sale" }}
      heading={t("nav.buy")}
      intro={locale === "ar" ? 'شقق وفيلات ورياضات ومنازل للبيع مع أسعار مطلوبة وتوفر مُتحقَّق منه من فريق IMPS.' : "Appartements, villas, riads et maisons à vendre, avec prix demandés et disponibilités vérifiées par l'équipe IMPS."}
      authenticated={!!user && !user.isStaff}
    />
  );
}
