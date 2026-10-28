import type { SearchParams } from "./queries";

export type RawParams = Record<string, string | string[] | undefined>;

function num(value: string | string[] | undefined): number | undefined {
  if (!value || Array.isArray(value)) return undefined;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function str(value: string | string[] | undefined): string | undefined {
  if (!value || Array.isArray(value)) return undefined;
  const v = value.trim();
  return v.length ? v : undefined;
}

export function parseSearchParams(raw: RawParams): { params: SearchParams; hoodCity?: string } {
  const hoodRaw = str(raw.hood);
  const [hoodCity, hood] = hoodRaw?.includes("/") ? hoodRaw.split("/") : [undefined, hoodRaw];
  const transaction = str(raw.tx);
  const sort = str(raw.sort);
  const amenitiesRaw = raw.amenity;
  const amenities = Array.isArray(amenitiesRaw) ? amenitiesRaw : amenitiesRaw ? [amenitiesRaw] : [];

  return {
    params: {
      transaction: transaction === "rent" ? "rent" : transaction === "sale" ? "sale" : undefined,
      kind: str(raw.kind),
      category: str(raw.category),
      city: str(raw.city),
      neighborhood: hood,
      priceMin: num(raw.price_min),
      priceMax: num(raw.price_max),
      areaMin: num(raw.area_min),
      areaMax: num(raw.area_max),
      bedrooms: num(raw.beds),
      bathrooms: num(raw.baths),
      furnished: raw.furnished === "1" ? true : undefined,
      amenities: amenities.filter(Boolean),
      featured: raw.featured === "1" ? true : undefined,
      verified: raw.verified === "1" ? true : undefined,
      sort:
        sort === "newest" || sort === "price_asc" || sort === "price_desc" || sort === "area_desc"
          ? sort
          : "relevant",
      page: Math.max(1, num(raw.page) ?? 1),
      perPage: 12,
    },
    hoodCity,
  };
}

export function buildQuery(raw: RawParams, overrides: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "page" || value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
    else sp.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) sp.delete(key);
    else sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function activeFilterCount(raw: RawParams): number {
  const keys = ["tx", "category", "city", "hood", "price_min", "price_max", "area_min", "area_max", "beds", "baths", "furnished", "featured", "verified", "amenity"];
  let count = 0;
  for (const key of keys) {
    const value = raw[key];
    if (Array.isArray(value)) count += value.length;
    else if (value !== undefined) count += 1;
  }
  return count;
}
