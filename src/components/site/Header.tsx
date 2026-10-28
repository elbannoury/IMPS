import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getT, localePath } from "@/lib/i18n";
import { getSiteContact } from "@/lib/site";
import { Logo } from "./Logo";
import { LangSwitcher } from "./LangSwitcher";
import { MobileNav } from "./MobileNav";

export async function Header({ locale }: { locale: string }) {
  const t = getT(locale);
  const [user, contact] = await Promise.all([getSessionUser(), getSiteContact()]);
  const L = (path: string) => localePath(locale, path);

  const primary = [
    { href: L("/buy"), label: t("nav.buy") },
    { href: L("/rent"), label: t("nav.rent") },
    { href: L("/commercial"), label: t("nav.commercial") },
    { href: L("/land"), label: t("nav.land") },
    { href: L("/developments"), label: t("nav.developments") },
    { href: L("/invest"), label: t("nav.invest") },
  ];
  const secondary = [
    { href: L("/properties"), label: t("common.search") },
    { href: L("/guides"), label: t("nav.guides") },
    { href: L("/about"), label: t("nav.about") },
    { href: L("/contact"), label: t("nav.contact") },
    { href: L("/favorites"), label: t("nav.favorites") },
    { href: L("/compare"), label: t("nav.compare") },
    { href: L("/report"), label: t("property.report") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-sm">
      <div className="bg-ink text-white">
        <div className="shell flex h-9 items-center justify-between gap-4 text-[10px] uppercase tracking-[0.16em]">
          <p className="truncate text-white/70">{t("hero.eyebrow")}</p>
          <div className="flex items-center gap-4">
            {contact.phone ? (
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hidden text-white/80 hover:text-white sm:block" dir="ltr">
                {contact.phone}
              </a>
            ) : null}
            <LangSwitcher locale={locale} tone="dark" />
          </div>
        </div>
      </div>

      <div className="shell flex h-[72px] items-center justify-between gap-6">
        <Logo href={L("/")} />

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {primary.map((item) => (
            <Link key={item.href} href={item.href} className="text-[12px] font-medium text-ink/80 transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href={L("/favorites")} aria-label={t("nav.favorites")} className="hidden h-10 w-10 items-center justify-center text-ink/70 hover:text-ink sm:flex">
            <svg width="18" height="17" viewBox="0 0 18 17" fill="none" aria-hidden="true">
              <path d="M9 15.5S1.5 11 1.5 5.9A3.9 3.9 0 019 3.4a3.9 3.9 0 017.5 2.5c0 5.1-7.5 9.6-7.5 9.6z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </Link>
          {user ? (
            <Link href={user.isStaff ? "/admin" : L("/account")} className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-ink hover:text-muted sm:block">
              {user.isStaff ? t("admin.title") : t("nav.account")}
            </Link>
          ) : (
            <Link href={L("/login")} className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-ink hover:text-muted sm:block">
              {t("nav.login")}
            </Link>
          )}
          <Link href={L("/contact")} className="btn-accent btn-sm hidden md:inline-flex">
            {t("hero.ctaSecondary")}
          </Link>
          <MobileNav
            items={[...primary, ...secondary.slice(0, 4)]}
            secondary={secondary.slice(4)}
            cta={{ href: L("/contact"), label: t("hero.ctaSecondary") }}
            labels={{ menu: t("nav.menu"), close: t("nav.close") }}
          />
        </div>
      </div>
    </header>
  );
}
