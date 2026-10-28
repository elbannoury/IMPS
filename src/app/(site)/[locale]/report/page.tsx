import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportForm } from "@/components/site/Forms";
import { getT, isLocale } from "@/lib/i18n";
import { searchProperties } from "@/lib/queries";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Signaler une annonce", robots: { index: false, follow: true } };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ property?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { property } = await searchParams;
  const t = getT(locale);
  const isAr = locale === "ar";
  const results = await searchProperties({ perPage: 48 });
  const selected = property || results.items[0]?.id || "";

  return (
    <div className="shell max-w-2xl py-12">
      <p className="eyebrow">{t("property.report")}</p>
      <h1 className="h-section mt-3">{t("report.title")}</h1>
      <p className="mt-3 text-sm text-muted">{t("report.subtitle")}</p>

      <div className="mt-8 border border-line p-6">
        <label htmlFor="property-select" className="label">
          {t("admin.properties")}
        </label>
        <form method="get" className="mb-6 flex gap-2">
          <select id="property-select" name="property" defaultValue={selected} className="field">
            {results.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.reference} — {(isAr ? item.titleAr || item.titleFr : item.titleFr).slice(0, 60)} · {formatPrice(item.primaryPrice, locale)}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-outline shrink-0">
            {t("common.apply")}
          </button>
        </form>

        {selected ? (
          <ReportForm
            propertyId={selected}
            locale={locale}
            labels={{
              reason: t("report.reason"),
              details: t("form.message"),
              submit: t("form.submit"),
              sending: t("form.sending"),
              success: t("report.success"),
              reasons: {
                price: t("report.reason.price"),
                unavailable: t("report.reason.unavailable"),
                info: t("report.reason.info"),
                other: t("report.reason.other"),
              },
            }}
          />
        ) : (
          <p className="text-sm text-muted">{t("common.noResults")}</p>
        )}
      </div>
    </div>
  );
}
