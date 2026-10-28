import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getPublishedArticles } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guides",
  description: "Guides pratiques pour acheter, louer et investir au Maroc — rédigés et relus par l'équipe IMPS.",
  alternates: { canonical: "/fr/guides", languages: { fr: "/fr/guides", ar: "/ar/guides" } },
};

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const articles = await getPublishedArticles(24);

  return (
    <div className="shell py-12 lg:py-16">
      <p className="eyebrow">{t("nav.guides")}</p>
      <h1 className="h-section mt-3">{t("guides.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        {locale === "ar"
          ? "معلومات عملية للشراء والكراء والاستثمار، دون وعود أو أرقام غير موثقة."
          : "Des repères pratiques pour acheter, louer et investir, sans promesses ni chiffres non documentés."}
      </p>

      {articles.length ? (
        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.slug} href={L(`/guides/${article.slug}`)} className="group block">
              <div className="relative aspect-[16/11] overflow-hidden bg-soft">
                {article.coverImage ? (
                  <Image src={article.coverImage} alt={locale === "ar" ? article.titleAr || article.titleFr : article.titleFr} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : null}
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted">
                {article.category ? (locale === "ar" ? article.category.nameAr : article.category.nameFr) : t("guides.title")}
                {article.publishedAt ? ` · ${formatDate(article.publishedAt, locale)}` : ""}
              </p>
              <h2 className="mt-1.5 font-display text-xl leading-snug">{locale === "ar" ? article.titleAr || article.titleFr : article.titleFr}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{locale === "ar" ? article.excerptAr || article.excerptFr : article.excerptFr}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-10 border border-dashed border-line py-16 text-center text-sm text-muted">{t("guides.empty")}</p>
      )}
    </div>
  );
}
