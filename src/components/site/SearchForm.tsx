import Link from "next/link";
import { getT, localePath } from "@/lib/i18n";
import type { getFilterOptions } from "@/lib/queries";

type Options = Awaited<ReturnType<typeof getFilterOptions>>;

export function SearchForm({
  locale,
  options,
  defaults,
}: {
  locale: string;
  options: Options;
  defaults?: { tx?: string; category?: string; city?: string; priceMax?: string };
}) {
  const t = getT(locale);
  const kinds: Record<string, string> = {
    residential: locale === "ar" ? "سكني" : "Résidentiel",
    commercial: locale === "ar" ? "تجاري" : "Commercial",
    land: locale === "ar" ? "أراضٍ" : "Terrains",
    development: locale === "ar" ? "مشاريع" : "Programmes",
  };

  return (
    <form action={localePath(locale, "/properties")} method="get" className="bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-1" role="group" aria-label={t("search.transaction")}>
        <label className="cursor-pointer">
          <input type="radio" name="tx" value="sale" defaultChecked={defaults?.tx !== "rent"} className="peer sr-only" />
          <span className="inline-flex h-9 items-center border border-line px-4 text-[11px] font-semibold uppercase tracking-[0.12em] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
            {t("search.buy")}
          </span>
        </label>
        <label className="cursor-pointer">
          <input type="radio" name="tx" value="rent" defaultChecked={defaults?.tx === "rent"} className="peer sr-only" />
          <span className="inline-flex h-9 items-center border border-line px-4 text-[11px] font-semibold uppercase tracking-[0.12em] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
            {t("search.rent")}
          </span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="search-city" className="label">
            {t("search.city")}
          </label>
          <select id="search-city" name="city" defaultValue={defaults?.city ?? ""} className="field">
            <option value="">{t("common.all")}</option>
            {options.cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {locale === "ar" ? city.nameAr : city.nameFr}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="search-category" className="label">
            {t("search.category")}
          </label>
          <select id="search-category" name="category" defaultValue={defaults?.category ?? ""} className="field">
            <option value="">{t("common.all")}</option>
            {["residential", "commercial", "land"].map((kind) => (
              <optgroup key={kind} label={kinds[kind]}>
                {options.categories
                  .filter((c) => c.kind === kind)
                  .map((category) => (
                    <option key={category.id} value={category.slug}>
                      {locale === "ar" ? category.nameAr : category.nameFr}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="search-price" className="label">
            {t("search.priceMax")} (MAD)
          </label>
          <input
            id="search-price"
            name="price_max"
            type="number"
            inputMode="numeric"
            min={0}
            step={50000}
            placeholder="3 000 000"
            defaultValue={defaults?.priceMax ?? ""}
            className="field tabular-nums"
          />
        </div>
        <button type="submit" className="btn-primary h-11 lg:px-7">
          {t("common.search")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
        <Link href={localePath(locale, "/properties?featured=1")} className="link-underline text-ink/70">
          {t("search.featured")}
        </Link>
        <Link href={localePath(locale, "/properties?verified=1")} className="link-underline text-ink/70">
          {t("search.verified")}
        </Link>
        <Link href={localePath(locale, "/properties?tx=rent&furnished=1")} className="link-underline text-ink/70">
          {t("search.furnished")}
        </Link>
        <Link href={localePath(locale, "/properties")} className="link-underline text-ink/70">
          {t("search.filters")}
        </Link>
      </div>
    </form>
  );
}
