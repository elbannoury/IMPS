"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALE_SHORT, LOCALES, isLocale, type Locale } from "@/lib/i18n";

export function LangSwitcher({ locale, tone = "light" }: { locale: string; tone?: "light" | "dark" }) {
  const pathname = usePathname() || "/fr";
  const search = useSearchParams();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length && isLocale(segments[0])) segments[0] = locale;

  const query = search.toString();

  return (
    <div className="flex items-center gap-2" aria-label="Language">
      {LOCALES.map((code: Locale) => {
        const target = `/${[code, ...segments.slice(1)].join("/")}${query ? `?${query}` : ""}`;
        const active = code === locale;
        return (
          <Link
            key={code}
            href={target}
            hrefLang={code}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? tone === "light"
                  ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-ink underline decoration-lemon decoration-2 underline-offset-4"
                  : "text-[10px] font-semibold uppercase tracking-[0.14em] text-white underline decoration-lemon decoration-2 underline-offset-4"
                : tone === "light"
                  ? "text-[10px] uppercase tracking-[0.14em] text-muted hover:text-ink"
                  : "text-[10px] uppercase tracking-[0.14em] text-white/60 hover:text-white"
            }
          >
            {LOCALE_SHORT[code]}
          </Link>
        );
      })}
    </div>
  );
}
