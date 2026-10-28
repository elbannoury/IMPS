import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FavoritesView } from "@/components/site/FavoritesView";
import { getSessionUser } from "@/lib/auth";
import { getT, isLocale, localePath } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Favoris", robots: { index: false, follow: false } };

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const user = await getSessionUser();

  return (
    <div className="shell py-12">
      <p className="eyebrow">IMPS</p>
      <h1 className="h-section mt-3">{t("favorites.title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">{t("favorites.hint")}</p>
      {!user ? (
        <p className="mt-4 text-sm">
          <Link href={L("/login")} className="underline decoration-lemon decoration-2 underline-offset-4">
            {t("auth.login")}
          </Link>{" "}
          <span className="text-muted">{t("favorites.syncHint")}</span>
        </p>
      ) : null}
      <div className="mt-10">
        <FavoritesView
          locale={locale}
          labels={{
            loading: t("common.loading"),
            empty: t("favorites.empty"),
            hint: t("favorites.hint"),
            browse: t("hero.cta"),
          }}
        />
      </div>
    </div>
  );
}
