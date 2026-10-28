import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui";
import { formatArea, formatPercent, formatPrice } from "@/lib/format";
import { grossAnnualYield } from "@/lib/investment";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getInvestmentProperties } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opportunités d'investissement",
  description:
    "Rendement locatif brut affiché uniquement lorsque le loyer et le prix demandé sont documentés. Aucune moyenne de marché inventée.",
  alternates: { canonical: "/fr/invest", languages: { fr: "/fr/invest", ar: "/ar/invest" } },
};

export default async function InvestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const properties = await getInvestmentProperties();

  const withRent = properties.filter((p) => p.documentedMonthlyRent);
  const withoutRent = properties.filter((p) => !p.documentedMonthlyRent);

  return (
    <>
      <section className="border-b border-line bg-soft/60">
        <div className="shell py-12 lg:py-16">
          <p className="eyebrow">{t("nav.invest")}</p>
          <h1 className="h-section mt-3 max-w-3xl">{t("invest.title")}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t("invest.subtitle")}</p>
          <div className="mt-6 max-w-3xl">
            <Notice tone="neutral">{t("invest.explainer")}</Notice>
          </div>
        </div>
      </section>

      <section className="shell py-12">
        <h2 className="font-display text-2xl">{t("invest.rentalIncome")}</h2>
        <div className="mt-6 overflow-x-auto border border-line">
          <table className="table-admin min-w-[820px]">
            <thead>
              <tr>
                <th>Bien</th>
                <th>{t("property.price")}</th>
                <th>{t("invest.rentalIncome")}</th>
                <th>{t("property.area")}</th>
                <th>Rendement brut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {withRent.map((property) => {
                const yieldResult = grossAnnualYield({
                  purchasePrice: property.primaryPrice,
                  monthlyRent: property.documentedMonthlyRent,
                });
                const title = locale === "ar" ? property.titleAr || property.titleFr : property.titleFr;
                return (
                  <tr key={property.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden bg-soft">
                          {property.media[0] ? <Image src={property.media[0].url} alt="" fill sizes="64px" className="object-cover" /> : null}
                        </div>
                        <div>
                          <Link href={L(`/properties/${property.slug}`)} className="font-medium hover:underline">
                            {title}
                          </Link>
                          <p className="text-[11px] text-muted">
                            {locale === "ar" ? property.city.nameAr : property.city.nameFr} · {property.reference}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="tabular-nums">{formatPrice(property.primaryPrice, locale)}</td>
                    <td className="tabular-nums">{formatPrice(property.documentedMonthlyRent, locale)}</td>
                    <td className="tabular-nums">{property.builtArea ? formatArea(property.builtArea, locale) : "—"}</td>
                    <td className="tabular-nums font-semibold">{formatPercent(yieldResult.grossYieldPercent, locale)}</td>
                    <td className="text-end">
                      <Link href={L(`/properties/${property.slug}`)} className="btn-outline btn-sm">
                        {t("common.viewAll")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[11px] text-muted">{t("invest.explainer")}</p>

        {withoutRent.length ? (
          <div className="mt-14">
            <h2 className="font-display text-xl">{t("invest.missingRent")}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {locale === "ar"
                ? "هذه العقارات معروضة للبيع دون إيجار موثق، لذلك لا يُعرض أي عائد."
                : "Ces biens sont à vendre sans loyer documenté : aucun rendement n'est affiché."}
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {withoutRent.map((property) => (
                <li key={property.id} className="border border-line p-3">
                  <Link href={L(`/properties/${property.slug}`)} className="text-sm font-medium hover:underline">
                    {locale === "ar" ? property.titleAr || property.titleFr : property.titleFr}
                  </Link>
                  <p className="mt-1 text-[11px] text-muted">
                    {formatPrice(property.primaryPrice, locale)} · {property.reference}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}
