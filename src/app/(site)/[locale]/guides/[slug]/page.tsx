import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getArticleBySlug } from "@/lib/queries";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Guide" };
  const isAr = locale === "ar";
  return {
    title: article.metaTitle || (isAr ? article.titleAr || article.titleFr : article.titleFr),
    description: article.metaDescription || (isAr ? article.excerptAr || article.excerptFr : article.excerptFr),
    alternates: { canonical: `/${locale}/guides/${article.slug}`, languages: { fr: `/fr/guides/${article.slug}`, ar: `/ar/guides/${article.slug}` } },
    openGraph: article.coverImage ? { images: [{ url: article.coverImage }] } : undefined,
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const article = await getArticleBySlug(slug);
  if (!article) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const isAr = locale === "ar";
  const title = isAr ? article.titleAr || article.titleFr : article.titleFr;
  const body = isAr ? article.bodyAr || article.bodyFr : article.bodyFr;
  const category = article.category ? (isAr ? article.category.nameAr : article.category.nameFr) : t("guides.title");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Organization", name: article.author?.fullName ?? "IMPS" },
    publisher: { "@type": "Organization", name: "IMPS" },
    image: article.coverImage || undefined,
  };

  return (
    <article className="shell max-w-3xl py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
        <Link href={L("/")} className="hover:text-ink">IMPS</Link>
        <span className="px-2">/</span>
        <Link href={L("/guides")} className="hover:text-ink">{t("guides.title")}</Link>
      </nav>

      <p className="mt-6 text-[10px] uppercase tracking-[0.16em] text-muted">{category}</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.1rem)] leading-[1.03]">{title}</h1>
      <p className="mt-3 text-xs text-muted">
        {t("guides.updated")} {formatDate(article.updatedAt, locale)}
        {article.author ? ` · ${article.author.fullName}` : ""}
      </p>

      {article.coverImage ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-soft">
          <Image src={article.coverImage} alt={title} fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
        </div>
      ) : null}

      <div className="prose-editorial mt-8">
        {body.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-5 text-[11px] leading-relaxed text-muted">
        {isAr
          ? "هذا المحتوى إعلامي ولا يعوض استشارة قانونية أو مالية مختصة."
          : "Ce contenu est informatif et ne remplace pas un avis juridique ou financier professionnel."}
      </p>

      {article.city ? (
        <Link href={L(`/cities/${article.city.slug}`)} className="btn-outline mt-6">
          {isAr ? article.city.nameAr : article.city.nameFr}
        </Link>
      ) : null}
    </article>
  );
}
