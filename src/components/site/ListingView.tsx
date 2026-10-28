import Link from "next/link";
import { PropertyCard } from "@/components/site/PropertyCard";
import { FiltersPanel } from "@/components/site/FiltersPanel";
import { EmptyState, Pagination } from "@/components/ui";
import { getT, localePath } from "@/lib/i18n";
import { getFilterOptions, searchProperties, type SearchParams } from "@/lib/queries";
import { activeFilterCount, buildQuery, parseSearchParams, type RawParams } from "@/lib/search-params";

export async function ListingView({
  locale,
  raw,
  preset,
  heading,
  intro,
  authenticated,
  basePath = "/properties",
}: {
  locale: string;
  raw: RawParams;
  preset?: { kind?: string; transaction?: "sale" | "rent" };
  heading: string;
  intro?: string;
  authenticated: boolean;
  basePath?: string;
}) {
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const { params: query, hoodCity } = parseSearchParams(raw);

  const effective: SearchParams = {
    ...query,
    kind: preset?.kind ?? query.kind,
    transaction: preset?.transaction ?? query.transaction,
    city: query.city ?? hoodCity,
  };

  const [results, options] = await Promise.all([searchProperties(effective), getFilterOptions()]);

  const cityName = effective.city ? options.cities.find((c) => c.slug === effective.city) : undefined;
  const categoryName = effective.category ? options.categories.find((c) => c.slug === effective.category) : undefined;
  const filterCount = activeFilterCount(raw);

  const sortOptions = [
    { key: "relevant", label: t("search.sort.relevant") },
    { key: "newest", label: t("search.sort.newest") },
    { key: "price_asc", label: t("search.sort.priceAsc") },
    { key: "price_desc", label: t("search.sort.priceDesc") },
    { key: "area_desc", label: t("search.sort.areaDesc") },
  ];

  return (
    <>
      <div className="border-b border-line bg-soft/60">
        <div className="shell py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
            <Link href={L("/")} className="hover:text-ink">
              IMPS
            </Link>
            <span className="px-2">/</span>
            <span className="text-ink">{heading}</span>
          </nav>
          <h1 className="h-section mt-4">
            {categoryName ? (locale === "ar" ? categoryName.nameAr : categoryName.nameFr) : heading}
            {cityName ? <span className="text-muted"> · {locale === "ar" ? cityName.nameAr : cityName.nameFr}</span> : null}
          </h1>
          {intro ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{intro}</p> : null}
          <p className="mt-3 text-sm text-muted">
            {results.total} {results.total === 1 ? t("common.result", { n: results.total }) : t("common.results", { n: results.total })}
            {filterCount > 0 ? ` · ${filterCount} ${filterCount === 1 ? t("search.filterActive") : t("search.activeFilters").toLowerCase()}` : ""}
          </p>
        </div>
      </div>

      <div className="shell grid gap-10 py-10 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-[132px] lg:self-start">
          <FiltersPanel locale={locale} options={options} raw={raw} hoodCity={hoodCity} />
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{t("search.sort")}</p>
            <div className="flex flex-wrap gap-1">
              {sortOptions.map((option) => {
                const active = (query.sort ?? "relevant") === option.key;
                return (
                  <Link
                    key={option.key}
                    href={`${L(basePath)}${buildQuery(raw, { sort: option.key, page: undefined })}`}
                    className={
                      active
                        ? "border border-ink bg-ink px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white"
                        : "border border-line px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-muted hover:border-ink hover:text-ink"
                    }
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {results.items.length ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {results.items.map((property, index) => (
                <PropertyCard key={property.id} property={property} locale={locale} authenticated={authenticated} priority={index < 3} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("common.noResults")}
              hint={t("common.noResultsHint")}
              action={
                <Link href={L(basePath)} className="btn-primary">
                  {t("common.reset")}
                </Link>
              }
            />
          )}

          <Pagination
            page={results.page}
            totalPages={results.totalPages}
            buildHref={(page) => `${L(basePath)}${buildQuery(raw, { page: String(page) })}`}
            labels={{ previous: t("common.previous"), next: t("common.next"), page: t("common.page"), of: t("common.of") }}
          />
        </div>
      </div>
    </>
  );
}
