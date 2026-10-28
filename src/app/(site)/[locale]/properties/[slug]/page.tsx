import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/site/Gallery";
import { InquiryForm, ViewingForm } from "@/components/site/Forms";
import { PropertyActions } from "@/components/site/PropertyActions";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Notice } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { daysSince, formatArea, formatDate, formatPrice } from "@/lib/format";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getPropertyBySlug, getSimilarProperties, incrementPropertyViews } from "@/lib/queries";
import { getSiteContact, whatsappLink } from "@/lib/site";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

const STATUS_NOTICE: Record<string, { fr: string; ar: string; tone: "warning" | "neutral" }> = {
  reserved: { fr: "property.reservedNotice", ar: "property.reservedNotice", tone: "warning" },
  sold: { fr: "property.soldNotice", ar: "property.soldNotice", tone: "neutral" },
  rented: { fr: "property.rentedNotice", ar: "property.rentedNotice", tone: "neutral" },
  unavailable: { fr: "property.unavailableNotice", ar: "property.unavailableNotice", tone: "neutral" },
};

const VERIFICATION_LABEL: Record<string, string> = {
  unverified: "property.verification.none",
  identity_checked: "property.verification.identity",
  availability_confirmed: "property.verification.availability",
  documents_reviewed: "property.verification.documents",
  legally_verified: "property.verification.legal",
};

const CONDITION_LABEL: Record<string, { fr: string; ar: string }> = {
  new: { fr: "Neuf", ar: "جديد" },
  excellent: { fr: "Excellent état", ar: "حالة ممتازة" },
  good: { fr: "Bon état", ar: "حالة جيدة" },
  needs_work: { fr: "À rénover", ar: "بحاجة لتجديد" },
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: locale === "ar" ? "عقار غير موجود" : "Bien introuvable" };
  const isAr = locale === "ar";
  const title = (isAr ? property.titleAr || property.titleFr : property.titleFr).slice(0, 65);
  const description =
    (isAr ? property.descriptionAr || property.descriptionFr : property.descriptionFr).slice(0, 158) + "…";
  const cover = property.media.find((m) => m.kind === "image")?.url;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/properties/${property.slug}`,
      languages: { fr: `/fr/properties/${property.slug}`, ar: `/ar/properties/${property.slug}` },
    },
    openGraph: {
      title,
      description,
      type: "article",
      images: cover ? [{ url: cover }] : undefined,
    },
    robots: property.status === "published" ? undefined : { index: false, follow: true },
  };
}

export default async function PropertyPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const isAr = locale === "ar";
  const title = isAr ? property.titleAr || property.titleFr : property.titleFr;
  const description = isAr ? property.descriptionAr || property.descriptionFr : property.descriptionFr;
  const city = isAr ? property.city.nameAr : property.city.nameFr;
  const hood = property.neighborhood ? (isAr ? property.neighborhood.nameAr : property.neighborhood.nameFr) : null;
  const category = isAr ? property.category.nameAr : property.category.nameFr;
  const isRent = property.transactionType === "rent";
  const price = formatPrice(property.primaryPrice, locale, { period: property.primaryRentPeriod, suffix: isRent });

  const [similar, contact, user] = await Promise.all([
    getSimilarProperties({
      id: property.id,
      categorySlug: property.category.slug,
      citySlug: property.city.slug,
      transactionType: property.transactionType,
    }),
    getSiteContact(),
    getSessionUser(),
  ]);
  void incrementPropertyViews(property.id);

  const authenticated = !!user && !user.isStaff;
  const staleDays = daysSince(property.availabilityConfirmedAt);
  const notice = STATUS_NOTICE[property.status];
  const emailConfigured = !!process.env.EMAIL_PROVIDER;

  const facts = [
    property.builtArea ? { label: t("property.area"), value: formatArea(property.builtArea, locale) } : null,
    property.landArea ? { label: t("property.landArea"), value: formatArea(property.landArea, locale) } : null,
    property.bedrooms ? { label: t("search.bedrooms"), value: String(property.bedrooms) } : null,
    property.bathrooms ? { label: t("search.bathrooms"), value: String(property.bathrooms) } : null,
    property.floorNumber !== null && property.floorNumber !== undefined
      ? { label: t("property.floor"), value: `${property.floorNumber}${property.floors ? ` / ${property.floors}` : ""}` }
      : null,
    property.parkingSpaces ? { label: t("search.parking"), value: String(property.parkingSpaces) } : null,
    property.condition ? { label: t("property.condition"), value: CONDITION_LABEL[property.condition]?.[isAr ? "ar" : "fr"] ?? property.condition } : null,
    property.furnished !== null && property.furnished !== undefined
      ? { label: t("search.furnished"), value: property.furnished ? t("common.yes") : t("common.no") }
      : null,
    property.streetFrontage ? { label: isAr ? "واجهة" : "Vitrine", value: `${property.streetFrontage} m` } : null,
    property.occupancyStatus ? { label: isAr ? "الإشغال" : "Occupation", value: property.occupancyStatus } : null,
    property.yearBuilt ? { label: t("property.yearBuilt"), value: String(property.yearBuilt) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: title,
    description: description.slice(0, 300),
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${locale}/properties/${property.slug}`,
    datePosted: property.publishedAt?.toISOString(),
    image: property.media.filter((m) => m.kind === "image").map((m) => m.url),
    identifier: property.reference,
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressRegion: property.city.nameFr,
      addressCountry: "MA",
    },
    ...(property.primaryPrice
      ? {
          offers: {
            "@type": "Offer",
            price: property.primaryPrice,
            priceCurrency: "MAD",
            availability:
              property.status === "published" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="shell pt-6">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
          <Link href={L("/")} className="hover:text-ink">
            IMPS
          </Link>
          <span className="px-2">/</span>
          <Link href={L("/properties")} className="hover:text-ink">
            {t("common.search")}
          </Link>
          <span className="px-2">/</span>
          <Link href={L(`/cities/${property.city.slug}`)} className="hover:text-ink">
            {city}
          </Link>
          <span className="px-2">/</span>
          <span className="text-ink">{property.reference}</span>
        </nav>
      </div>

      {notice ? (
        <div className="shell mt-6">
          <Notice tone="warning">
            <strong className="font-semibold">{t(notice.fr)}</strong>{" "}
            {property.status !== "reserved" ? t("property.unavailableBody") : ""}
          </Notice>
        </div>
      ) : null}

      <section className="shell pt-6">
        <div className="grid gap-10 lg:grid-cols-[1.65fr_1fr]">
          <div>
            <Gallery media={property.media} locale={locale} title={title} fallback={t("property.noMedia")} />

            <div className="mt-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-dark">{isRent ? t("search.rent") : t("search.buy")}</span>
                    <span className="badge-muted">{category}</span>
                    {property.isFeatured ? <span className="badge-lemon">{t("search.featured")}</span> : null}
                    {property.isSample ? <span className="badge-muted">{t("common.sample")}</span> : null}
                  </div>
                  <h1 className="mt-4 font-display text-[clamp(1.75rem,3.4vw,2.6rem)] leading-[1.05] tracking-tight">{title}</h1>
                  <p className="mt-2 text-sm text-muted">
                    {city}
                    {hood ? ` · ${hood}` : ""} · {property.reference}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] tabular-nums leading-none">{price}</p>
                  {isRent && property.primaryRentPeriod ? (
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                      {property.primaryRentPeriod === "month" ? t("property.perMonth") : property.primaryRentPeriod === "day" ? t("property.perDay") : t("property.perYear")}
                    </p>
                  ) : null}
                </div>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
                {facts.map((fact) => (
                  <div key={fact.label} className="bg-white p-4">
                    <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{fact.label}</dt>
                    <dd className="mt-1 text-sm font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <section className="mt-10 border-t border-line pt-8">
                <h2 className="font-display text-xl">{t("property.description")}</h2>
                <div className="prose-editorial mt-4 max-w-3xl">
                  {description.split(/\n{2,}/).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </section>

              {property.amenities.length ? (
                <section className="mt-10 border-t border-line pt-8">
                  <h2 className="font-display text-xl">{t("property.amenities")}</h2>
                  <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {property.amenities.map(({ amenity }) => (
                      <li key={amenity.slug} className="flex items-center gap-2 border border-line px-3 py-2 text-sm">
                        <span className="inline-block h-1.5 w-1.5 bg-lemon" aria-hidden="true" />
                        {isAr ? amenity.labelAr : amenity.labelFr}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="mt-10 border-t border-line pt-8">
                <h2 className="font-display text-xl">{t("property.verified")}</h2>
                <div className="mt-4 border border-line bg-soft/60 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-lemon">{t(VERIFICATION_LABEL[property.verificationLevel] ?? "property.verification.none")}</span>
                    {property.availabilityConfirmedAt ? (
                      <span className="text-[11px] text-muted">
                        {t("property.confirmedOn")} {formatDate(property.availabilityConfirmedAt, locale)}
                        {staleDays !== null && staleDays > 30 ? ` · ⚠ ${staleDays} j` : ""}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted">{t("property.verification.explain")}</p>
                  {property.verifications.length ? (
                    <ul className="mt-4 space-y-2 border-t border-line pt-3 text-xs">
                      {property.verifications.map((verification, index) => (
                        <li key={`${verification.type}-${index}`} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-ink/80">
                            {verification.type === "availability"
                              ? t("property.verification.availability")
                              : verification.type === "identity"
                                ? t("property.verification.identity")
                                : verification.type === "ownership_document"
                                  ? t("property.verification.documents")
                                  : verification.type === "legal"
                                    ? t("property.verification.legal")
                                    : verification.type}
                          </span>
                          <span className="text-muted">
                            {formatDate(verification.verifiedAt, locale)}
                            {verification.result === "partial" ? ` · ${isAr ? "جزئي" : "partiel"}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>

              <section className="mt-10 border-t border-line pt-8">
                <h2 className="font-display text-xl">{t("property.location")}</h2>
                {contact.mapProvider && contact.mapToken && property.latitude && property.longitude ? (
                  <div className="mt-4 aspect-[16/9] border border-line bg-soft p-4 text-sm text-muted">
                    {/* Map component is only rendered when a provider is configured. */}
                    <div id="imps-map" data-lat={property.latitude} data-lng={property.longitude} data-provider={contact.mapProvider} className="flex h-full items-center justify-center">
                      {t("property.approxLocation")}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 border border-dashed border-line bg-soft/50 p-6 text-sm text-muted">
                    <p>{t("property.mapUnavailable")}</p>
                    <p className="mt-2 text-xs">
                      {city}
                      {hood ? ` · ${hood}` : ""} ·{" "}
                      {property.locationPrecision === "exact" ? t("property.exactLocation") : t("property.approxLocation")}
                    </p>
                  </div>
                )}
              </section>

              <p className="mt-8 text-[11px] text-muted">
                <Link href={L(`/report?property=${property.id}`)} className="underline underline-offset-2 hover:text-ink">
                  {t("property.report")}
                </Link>
                {" — "}
                {t("property.reportHint")}
              </p>
            </div>
          </div>

          {/* Contact rail */}
          <aside className="lg:sticky lg:top-[132px] lg:self-start">
            <div className="border border-line bg-white p-5">
              <p className="eyebrow">{t("property.contact")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {isAr
                  ? "فريق IMPS يجيب على أسئلتك ويرتب الزيارات."
                  : "L'équipe IMPS répond à vos questions et organise les visites."}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {contact.phone ? (
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="btn-primary h-10 px-3 text-[10px]">
                    {t("property.call")}
                  </a>
                ) : null}
                {contact.whatsapp ? (
                  <a
                    href={whatsappLink(contact.whatsapp, `${property.reference} — ${title}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-accent h-10 px-3 text-[10px]"
                  >
                    {t("property.whatsapp")}
                  </a>
                ) : null}
              </div>

              <div className="mt-5 border-t border-line pt-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em]">{t("property.inquire")}</p>
                <InquiryForm
                  propertyId={property.id}
                  locale={locale}
                  emailConfigured={emailConfigured}
                  labels={{
                    name: t("form.name"),
                    phone: t("form.phone"),
                    email: t("form.email"),
                    message: t("form.message"),
                    date: t("form.preferredDate"),
                    time: t("form.preferredTime"),
                    submit: t("form.submit"),
                    sending: t("form.sending"),
                    consent: t("form.consent"),
                    optional: t("common.optional"),
                  }}
                />
              </div>

              <details className="mt-5 border-t border-line pt-5">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em]">{t("property.viewing")}</summary>
                <div className="mt-4">
                  <ViewingForm
                    propertyId={property.id}
                    locale={locale}
                    emailConfigured={emailConfigured}
                    labels={{
                      name: t("form.name"),
                      phone: t("form.phone"),
                      email: t("form.email"),
                      message: t("form.message"),
                      date: t("form.preferredDate"),
                      time: t("form.preferredTime"),
                      submit: t("form.submit"),
                      sending: t("form.sending"),
                      consent: t("form.consent"),
                      optional: t("common.optional"),
                    }}
                  />
                </div>
              </details>

              <div className="mt-5 border-t border-line pt-5">
                <PropertyActions
                  propertyId={property.id}
                  authenticated={authenticated}
                  labels={{
                    save: t("property.save"),
                    saved: t("property.saved"),
                    compare: t("property.compare"),
                    share: t("property.share"),
                    copied: t("property.linkCopied"),
                    full: isAr ? "4 عقارات كحد أقصى" : "4 biens maximum",
                  }}
                />
              </div>

              <p className="mt-4 text-[10px] leading-relaxed text-muted">
                {t("property.publishedOn")} {formatDate(property.publishedAt, locale)} · {property.reference}
              </p>
            </div>
          </aside>
        </div>
      </section>

      {similar.length ? (
        <section className="shell mt-16 border-t border-line pt-12">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="h-section">{t("property.similar")}</h2>
            <Link href={L("/properties")} className="btn-outline btn-sm">
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <PropertyCard key={item.id} property={item} locale={locale} authenticated={authenticated} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
