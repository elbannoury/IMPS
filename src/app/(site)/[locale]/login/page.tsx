import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoginForm } from "@/components/site/AuthForm";
import { getSessionUser } from "@/lib/auth";
import { getT, isLocale, localePath } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connexion", robots: { index: false, follow: false } };

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getSessionUser();
  if (user) redirect(user.isStaff ? "/admin" : localePath(locale, "/account"));
  const t = getT(locale);

  return (
    <div className="shell flex max-w-md flex-col py-16">
      <p className="eyebrow">{t("nav.account")}</p>
      <h1 className="h-section mt-3">{t("auth.loginTitle")}</h1>
      <div className="mt-8 border border-line p-6">
        <LoginForm
          locale={locale}
          labels={{
            email: t("auth.email"),
            password: t("auth.password"),
            submit: t("auth.login"),
            invalid: t("auth.invalid"),
            register: t("auth.register"),
            noAccount: t("auth.noAccount"),
            registerHref: localePath(locale, "/register"),
          }}
        />
      </div>
      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        {locale === "ar"
          ? "حساب الزوار اختياري: يمكنك تصفح العقارات دون تسجيل."
          : "Le compte visiteur est facultatif : la consultation des biens ne nécessite aucune inscription."}
      </p>
    </div>
  );
}
