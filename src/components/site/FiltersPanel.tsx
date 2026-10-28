import Link from "next/link";
import { getT, localePath } from "@/lib/i18n";
import type { getFilterOptions } from "@/lib/queries";
import type { RawParams } from "@/lib/search-params";

type Options = Awaited<ReturnType<typeof getFilterOptions>>;

export function FiltersPanel({
  locale,
  options,
  raw,
  hoodCity,
}: {
  locale: string;
  options: Options;
  raw: RawParams;
  hoodCity?: string;
}) {
  const t = getT(locale);
  const value = (key: string, fallback = "") => (typeof raw[key] === "string" ? (raw[key] as string) : fallback);
  const kinds: Record<string, string> = {
    residential: locale === "ar" ? "سكني" : "Résidentiel",
    commercial: locale === "ar" ? "تجاري" : "Commercial",
    land: locale === "ar" ? "أراضٍ" : "Terrains",
  };
  const selectedAmenities = new Set(
    Array.isArray(raw.amenity) ? raw.amenity : raw.amenity ? [raw.amenity] : [],
  );

  return (
    <form
      action={localePath(locale, "/properties")}
      method="get"
      className="border border-line bg-white"
      aria-label={t("filters.title")}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{t("filters.title")}</p>
        <Link href={localePath(locale, "/properties")} className="text-[11px] text-muted underline underline-offset-2 hover:text-ink">
          {t("common.reset")}
        </Link>
      </div>

      <div className="space-y-5 p-4">
        <fieldset>
          <legend className="label">{t("search.transaction")}</legend>
          <div className="grid grid-cols-2 gap-1">
            <label className="cursor-pointer">
              <input type="radio" name="tx" value="sale" defaultChecked={value("tx") !== "rent"} className="peer sr-only" />
              <span className="flex h-9 items-center justify-center border border-line text-[10px] font-semibold uppercase tracking-[0.1em] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                {t("search.buy")}
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="tx" value="rent" defaultChecked={value("tx") === "rent"} className="peer sr-only" />
              <span className="flex h-9 items-center justify-center border border-line text-[10px] font-semibold uppercase tracking-[0.1em] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                {t("search.rent")}
              </span>
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="f-category" className="label">
            {t("search.category")}
          </label>
          <select id="f-category" name="category" defaultValue={value("category")} className="field">
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
          <label htmlFor="f-city" className="label">
            {t("search.city")}
          </label>
          <select id="f-city" name="city" defaultValue={value("city")} className="field">
            <option value="">{t("common.all")}</option>
            {options.cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {locale === "ar" ? city.nameAr : city.nameFr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-hood" className="label">
            {t("search.neighborhood")}
          </label>
          <select id="f-hood" name="hood" defaultValue={hoodCity ? `${hoodCity}/${value("hood")}` : value("hood")} className="field">
            <option value="">{t("common.all")}</option>
            {options.cities.map((city) => (
              <optgroup key={city.id} label={locale === "ar" ? city.nameAr : city.nameFr}>
                {city.neighborhoods.map((hood) => (
                  <option key={hood.id} value={`${city.slug}/${hood.slug}`}>
                    {locale === "ar" ? hood.nameAr : hood.nameFr}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="f-price-min" className="label">
              {t("search.priceMin")}
            </label>
            <input id="f-price-min" name="price_min" type="number" inputMode="numeric" min={0} defaultValue={value("price_min")} className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="f-price-max" className="label">
              {t("search.priceMax")}
            </label>
            <input id="f-price-max" name="price_max" type="number" inputMode="numeric" min={0} defaultValue={value("price_max")} className="field tabular-nums" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="f-area-min" className="label">
              {t("search.areaMin")}
            </label>
            <input id="f-area-min" name="area_min" type="number" inputMode="numeric" min={0} defaultValue={value("area_min")} className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="f-area-max" className="label">
              {t("search.areaMax")}
            </label>
            <input id="f-area-max" name="area_max" type="number" inputMode="numeric" min={0} defaultValue={value("area_max")} className="field tabular-nums" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="f-beds" className="label">
              {t("search.bedrooms")}
            </label>
            <select id="f-beds" name="beds" defaultValue={value("beds")} className="field">
              <option value="">{t("search.any")}</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-baths" className="label">
              {t("search.bathrooms")}
            </label>
            <select id="f-baths" name="baths" defaultValue={value("baths")} className="field">
              <option value="">{t("search.any")}</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="label">{t("property.amenities")}</legend>
          {options.amenities
            .filter((a) => ["parking", "elevator", "terrace", "garden", "pool", "security", "aircon"].includes(a.slug))
            .map((amenity) => (
              <label key={amenity.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                <input type="checkbox" name="amenity" value={amenity.slug} defaultChecked={selectedAmenities.has(amenity.slug)} className="h-4 w-4 accent-[#111111]" />
                {locale === "ar" ? amenity.labelAr : amenity.labelFr}
              </label>
            ))}
        </fieldset>

        <fieldset className="space-y-2 border-t border-line pt-4">
          <legend className="label">{t("search.filters")}</legend>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input type="checkbox" name="furnished" value="1" defaultChecked={value("furnished") === "1"} className="h-4 w-4 accent-[#111111]" />
            {t("search.furnished")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input type="checkbox" name="featured" value="1" defaultChecked={value("featured") === "1"} className="h-4 w-4 accent-[#111111]" />
            {t("search.featured")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input type="checkbox" name="verified" value="1" defaultChecked={value("verified") === "1"} className="h-4 w-4 accent-[#111111]" />
            {t("search.verified")}
          </label>
        </fieldset>

        <button type="submit" className="btn-primary w-full">
          {t("common.apply")}
        </button>
      </div>
    </form>
  );
}
