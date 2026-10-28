export const MAD_SYMBOL_FR = "DH";
export const MAD_SYMBOL_AR = "د.م.";

export function formatPrice(
  amount: number | null | undefined,
  locale: string,
  opts: { period?: string | null; suffix?: boolean } = {},
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA", {
    maximumFractionDigits: 0,
  });
  const value = `${nf.format(amount)} ${locale === "ar" ? MAD_SYMBOL_AR : MAD_SYMBOL_FR}`;
  if (opts.suffix && opts.period) {
    const suffixes: Record<string, Record<string, string>> = {
      fr: { month: "/mois", year: "/an", day: "/jour" },
      ar: { month: "/شهر", year: "/سنة", day: "/يوم" },
    };
    return value + (suffixes[locale]?.[opts.period] ?? "");
  }
  return value;
}

export function formatArea(area: number | null | undefined, locale: string): string {
  if (!area) return "—";
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA", {
    maximumFractionDigits: 0,
  });
  return `${nf.format(area)} m²`;
}

export function formatDate(date: Date | string | null | undefined, locale: string): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined, locale: string): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatPercent(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + " %";
}

export function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function toInputDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}
