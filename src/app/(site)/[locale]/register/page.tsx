import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/site/AuthForm";
import { getT, isLocale, localePath } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false, follow: false } };

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);

  return (
    <div className="shell flex max-w-md flex-col py-16">
      <p className="eyebrow">{t("nav.account")}</p>
      <h1 className="h-section mt-3">{t("auth.registerTitle")}</h1>
      <div className="mt-8 border border-line p-6">
        <RegisterForm
          locale={locale}
          labels={{
            name: t("auth.fullName"),
            email: t("auth.email"),
            password: t("auth.password"),
            submit: t("auth.register"),
            login: t("auth.login"),
            hasAccount: t("auth.hasAccount"),
            loginHref: localePath(locale, "/login"),
            passwordHint: locale === "ar" ? "8 أحرف على الأقل" : "8 caractères minimum",
          }}
        />
      </div>
      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        {locale === "ar"
          ? "إنشاء حساب لا يمنح أي وصول إلى مساحة الإدارة."
          : "La création d'un compte ne donne aucun accès à l'espace d'administration."}
      </p>
    </div>
  );
}
