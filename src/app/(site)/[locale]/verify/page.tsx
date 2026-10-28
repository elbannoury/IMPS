import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyEmailAction } from "@/app/actions/auth";
import { getT, isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Vérification", robots: { index: false, follow: false } };

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { token } = await searchParams;
  const t = getT(locale);

  return (
    <div className="shell max-w-md py-16">
      <h1 className="h-section">{t("auth.verifyNow")}</h1>
      <form action={verifyEmailAction} className="mt-6 border border-line p-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token ?? ""} />
        <button type="submit" className="btn-primary w-full">
          {t("auth.verifyNow")}
        </button>
      </form>
      <p className="mt-4 text-[11px] text-muted">{t("auth.emailUnavailable")}</p>
    </div>
  );
}
