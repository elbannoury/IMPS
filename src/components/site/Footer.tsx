import Link from "next/link";
import { getT, localePath } from "@/lib/i18n";
import { getSiteContact } from "@/lib/site";
import { Logo } from "./Logo";

export async function Footer({ locale }: { locale: string }) {
  const t = getT(locale);
  const contact = await getSiteContact();
  const L = (path: string) => localePath(locale, path);
  const explore = [
    { href: L("/buy"), label: t("nav.buy") },
    { href: L("/rent"), label: t("nav.rent") },
    { href: L("/commercial"), label: t("nav.commercial") },
    { href: L("/land"), label: t("nav.land") },
    { href: L("/developments"), label: t("nav.developments") },
    { href: L("/invest"), label: t("nav.invest") },
  ];
  const company = [
    { href: L("/about"), label: t("nav.about") },
    { href: L("/guides"), label: t("nav.guides") },
    { href: L("/cities"), label: t("cities.title") },
    { href: L("/contact"), label: t("nav.contact") },
    { href: L("/report"), label: t("property.report") },
  ];
  const legal = [
    { href: L("/privacy"), label: t("privacy.title") },
    { href: L("/terms"), label: t("terms.title") },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-soft">
      <div className="shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo href={L("/")} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{t("home.trust1Body")}</p>
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="mt-5 inline-block text-sm underline decoration-lemon decoration-2 underline-offset-4">
              {contact.email}
            </a>
          ) : null}
          {contact.phone ? (
            <p className="mt-2 text-sm text-muted" dir="ltr">
              {contact.phone}
            </p>
          ) : null}
        </div>

        <nav aria-label={t("footer.explore")}>
          <p className="eyebrow mb-4">{t("footer.explore")}</p>
          <ul className="space-y-2.5 text-sm">
            {explore.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink/75 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("footer.company")}>
          <p className="eyebrow mb-4">{t("footer.company")}</p>
          <ul className="space-y-2.5 text-sm">
            {company.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink/75 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("footer.legal")}>
          <p className="eyebrow mb-4">{t("footer.legal")}</p>
          <ul className="space-y-2.5 text-sm">
            {legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink/75 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">{t("legal.reviewNote")}</p>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="shell flex flex-col gap-2 py-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} IMPS. {t("footer.rights")}</p>
          <p>{t("footer.built")}</p>
        </div>
      </div>
    </footer>
  );
}
