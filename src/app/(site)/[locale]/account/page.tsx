import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Notice } from "@/components/ui";
import { customerLogoutAction, deleteAccountAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getT, isLocale, localePath } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false, follow: false } };

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ registered?: string; verified?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { registered, verified } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(localePath(locale, "/login"));
  if (user.isStaff) redirect("/admin");

  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: {
      savedSearches: { orderBy: { createdAt: "desc" } },
      savedProperties: { include: { property: { select: { slug: true, titleFr: true, titleAr: true, status: true } } } },
    },
  });
  if (!profile) redirect(L("/login"));

  const [leads, viewings] = await Promise.all([
    prisma.lead.findMany({
      where: { OR: [{ email: profile.email }, { createdById: profile.id }] },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, code: true, message: true, status: true, createdAt: true, property: { select: { slug: true, titleFr: true, titleAr: true } } },
    }),
    prisma.viewingAppointment.findMany({
      where: { OR: [{ visitorEmail: profile.email }, { lead: { email: profile.email } }] },
      orderBy: { requestedAt: "desc" },
      take: 20,
      select: { id: true, requestedAt: true, status: true, property: { select: { slug: true, titleFr: true, titleAr: true } } },
    }),
  ]);

  return (
    <div className="shell max-w-4xl py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("nav.account")}</p>
          <h1 className="h-section mt-3">{profile.fullName}</h1>
          <p className="mt-2 text-sm text-muted">{profile.email}</p>
        </div>
        <form action={customerLogoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn-outline btn-sm">{t("auth.logout")}</button>
        </form>
      </div>

      {registered ? <div className="mt-6"><Notice tone="success">{t("auth.verifySent")}</Notice></div> : null}
      {verified ? <div className="mt-6"><Notice tone="success">{t("auth.verified")}</Notice></div> : null}
      {!profile.emailVerifiedAt ? (
        <div className="mt-6">
          <Notice tone="warning">
            <p>{t("auth.verifyNeeded")}</p>
            <p className="mt-1 opacity-80">{t("auth.emailUnavailable")}</p>
          </Notice>
        </div>
      ) : null}

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-xl">{t("auth.myInquiries")}</h2>
        {leads.length ? (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {leads.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {lead.property ? (locale === "ar" ? lead.property.titleAr || lead.property.titleFr : lead.property.titleFr) : lead.code}
                  </p>
                  <p className="text-[11px] text-muted">
                    {formatDateTime(lead.createdAt, locale)} · {lead.status}
                  </p>
                </div>
                {lead.property ? (
                  <Link href={L(`/properties/${lead.property.slug}`)} className="text-[11px] underline underline-offset-2">
                    {t("common.viewAll")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">{t("common.noResults")}</p>
        )}
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-xl">{t("auth.myViewings")}</h2>
        {viewings.length ? (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {viewings.map((viewing) => (
              <li key={viewing.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{locale === "ar" ? viewing.property.titleAr || viewing.property.titleFr : viewing.property.titleFr}</p>
                  <p className="text-[11px] text-muted">
                    {formatDateTime(viewing.requestedAt, locale)} · {viewing.status === "requested" ? (locale === "ar" ? "طلب (غير مؤكد)" : "demande (non confirmée)") : viewing.status}
                  </p>
                </div>
                <Link href={L(`/properties/${viewing.property.slug}`)} className="text-[11px] underline underline-offset-2">
                  {t("common.viewAll")}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">{t("common.noResults")}</p>
        )}
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-xl">{t("auth.savedSearches")}</h2>
        {profile.savedSearches.length ? (
          <ul className="mt-4 space-y-2">
            {profile.savedSearches.map((search) => (
              <li key={search.id} className="flex flex-wrap items-center justify-between gap-3 border border-line px-3 py-2 text-sm">
                <span>{search.name}</span>
                <Link href={`${L("/properties")}${search.queryJson.startsWith("?") ? search.queryJson : `?${search.queryJson}`}`} className="text-[11px] underline underline-offset-2">
                  {t("common.search")}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">{t("common.noResults")}</p>
        )}
      </section>

      {profile.savedProperties.length ? (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-xl">{t("favorites.title")}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {profile.savedProperties.map((row) => (
              <li key={row.id} className="border border-line px-3 py-2 text-sm">
                <Link href={L(`/properties/${row.property.slug}`)} className="hover:underline">
                  {locale === "ar" ? row.property.titleAr || row.property.titleFr : row.property.titleFr}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="font-display text-lg">{t("auth.deleteAccount")}</h2>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted">{t("auth.deleteWarning")}</p>
        <form action={deleteAccountAction} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn-outline border-ink text-[10px]">
            {t("auth.deleteAccount")}
          </button>
        </form>
      </section>
    </div>
  );
}
