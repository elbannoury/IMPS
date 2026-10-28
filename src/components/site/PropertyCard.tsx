import Image from "next/image";
import Link from "next/link";
import type { PropertyCard as Card } from "@/lib/queries";
import { getT, localePath } from "@/lib/i18n";
import { formatArea, formatPrice } from "@/lib/format";
import { SaveButton } from "./SaveButton";
import { StatusPill } from "@/components/ui";

export function PropertyCard({
  property,
  locale,
  authenticated = false,
  priority = false,
}: {
  property: Card;
  locale: string;
  authenticated?: boolean;
  priority?: boolean;
}) {
  const t = getT(locale);
  const title = locale === "ar" ? property.titleAr || property.titleFr : property.titleFr;
  const city = locale === "ar" ? property.city.nameAr : property.city.nameFr;
  const hood = property.neighborhood ? (locale === "ar" ? property.neighborhood.nameAr : property.neighborhood.nameFr) : null;
  const cover = property.media[0];
  const href = localePath(locale, `/properties/${property.slug}`);
  const isRent = property.transactionType === "rent";
  const specs = [
    property.bedrooms ? `${property.bedrooms} ${t("property.bedrooms")}` : null,
    property.bathrooms ? `${property.bathrooms} ${t("property.bathrooms")}` : null,
    property.builtArea ? formatArea(property.builtArea, locale) : property.landArea ? formatArea(property.landArea, locale) : null,
  ].filter(Boolean);

  return (
    <article className="group">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        <Link href={href} aria-label={title} className="block h-full w-full">
          {cover ? (
            <Image
              src={cover.url}
              alt={(locale === "ar" ? guard(cover.altAr) : guard(cover.altFr)) || title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-soft text-[10px] uppercase tracking-[0.16em] text-muted">
              {t("property.noMedia")}
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="badge-dark">{isRent ? t("search.rent") : t("search.buy")}</span>
            {property.isFeatured ? <span className="badge-lemon">{t("search.featured")}</span> : null}
            {property.isSample ? <span className="badge-muted">{t("common.sample")}</span> : null}
          </div>
          <div className="pointer-events-auto">
            <SaveButton propertyId={property.id} authenticated={authenticated} labels={{ save: t("property.save"), saved: t("property.saved") }} />
          </div>
        </div>

        {property.status !== "published" ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-ink/85 px-3 py-2 text-white backdrop-blur-sm">
            <StatusPill status={property.status} label={statusLabel(property.status, locale)} />
          </div>
        ) : null}
      </div>

      <div className="pt-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
          {city}
          {hood ? ` · ${hood}` : ""}
        </p>
        <h3 className="mt-1.5 font-display text-[19px] leading-snug tracking-tight">
          <Link href={href} className="hover:text-ink/70">
            {title}
          </Link>
        </h3>
        <p className="mt-2 text-xs text-muted">
          {specs.length ? specs.join(" · ") : t("property.area") + " —"}
        </p>
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <p className="text-[15px] font-semibold tabular-nums">
            {formatPrice(property.primaryPrice, locale, { period: property.primaryRentPeriod, suffix: isRent })}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{property.reference}</p>
        </div>
      </div>
    </article>
  );
}

function guard(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "";
}

function statusLabel(status: string, locale: string): string {
  const fr: Record<string, string> = {
    reserved: "Réservé",
    sold: "Vendu",
    rented: "Loué",
    unavailable: "Indisponible",
    expired: "Expiré",
  };
  const ar: Record<string, string> = {
    reserved: "محجوز",
    sold: "مباع",
    rented: "مكترى",
    unavailable: "غير متوفر",
    expired: "منتهي",
  };
  return (locale === "ar" ? ar : fr)[status] ?? status;
}
