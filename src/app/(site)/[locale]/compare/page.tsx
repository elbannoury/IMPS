import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompareView } from "@/components/site/CompareView";
import { getT, isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Comparer", robots: { index: false, follow: false } };

export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);

  return (
    <div className="shell py-12">
      <p className="eyebrow">IMPS</p>
      <h1 className="h-section mt-3">{t("compare.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">{t("compare.empty")}</p>
      <div className="mt-10">
        <CompareView
          locale={locale}
          labels={{
            loading: t("common.loading"),
            empty: t("compare.empty"),
            browse: t("hero.cta"),
            clear: t("common.reset"),
            field: t("compare.field"),
            price: t("property.price"),
            transaction: t("search.transaction"),
            type: t("search.category"),
            city: t("search.city"),
            area: t("property.area"),
            bedrooms: t("search.bedrooms"),
            bathrooms: t("search.bathrooms"),
            verified: t("search.verified"),
            reference: t("property.reference"),
            remove: t("compare.remove"),
            buy: t("search.buy"),
            rent: t("search.rent"),
            yes: t("common.yes"),
            no: t("common.no"),
            disclaimer: t("property.verification.explain"),
          }}
        />
      </div>
    </div>
  );
}
