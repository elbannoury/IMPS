import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getSiteStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "À propos d'IMPS",
  description: "IMPS est une plateforme immobilière opérée par une équipe au Maroc : collecte, vérification et publication contrôlées.",
  alternates: { canonical: "/fr/about", languages: { fr: "/fr/about", ar: "/ar/about" } },
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const isAr = locale === "ar";
  const stats = await getSiteStats();

  return (
    <div>
      <section className="shell py-12 lg:py-16">
        <p className="eyebrow">{t("nav.about")}</p>
        <h1 className="h-display mt-4 max-w-3xl">{isAr ? "عقارات يتحقق منها فريق، لا كتالوج مفتوح." : "Un immobilier vérifié par une équipe, pas un catalogue ouvert."}</h1>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
          {isAr
            ? "كل إعلان على IMPS يُجمع من المالك أو ممثله، يُدخل من فريقنا، ثم يُراجع قبل النشر. لا يمكن لأي زائر نشر عقار مباشرة."
            : "Chaque annonce IMPS est collectée auprès du propriétaire ou de son représentant, saisie par notre équipe, puis révisée avant publication. Aucun visiteur ne peut publier un bien directement."}
        </p>
      </section>

      <section className="relative aspect-[21/9] w-full overflow-hidden bg-soft">
        <Image src="/media/marrakech-city-1.jpg" alt="" fill sizes="100vw" className="object-cover" />
      </section>

      <section className="shell py-12 lg:py-16">
        <div className="grid gap-10 border-t border-line pt-10 md:grid-cols-3">
          <div>
            <p className="font-display text-4xl tabular-nums">{stats.published}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted">{t("admin.kpi.published")}</p>
          </div>
          <div>
            <p className="font-display text-4xl tabular-nums">{stats.cities}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted">{t("cities.title")}</p>
          </div>
          <div>
            <p className="font-display text-4xl tabular-nums">{stats.guides}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted">{t("guides.title")}</p>
          </div>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {[
            { title: t("home.trust1Title"), body: t("home.trust1Body") },
            { title: t("home.trust2Title"), body: t("home.trust2Body") },
            { title: t("home.trust3Title"), body: t("home.trust3Body") },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="font-display text-xl">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 border border-line bg-soft/60 p-6">
          <h2 className="font-display text-xl">{isAr ? "ما لا ندّعي القيام به" : "Ce que nous ne prétendons pas faire"}</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            <li>
              {isAr
                ? "لا نعتبر أي عقار «موثقاً قانونياً» إلا إذا تمت المراجعة القانونية فعلياً. التحقق من الهوية أو التوفر لا يعادل ذلك."
                : "Nous ne qualifions un bien de « juridiquement vérifié » que si un contrôle juridique a réellement été effectué. Une vérification d'identité ou de disponibilité n'en tient pas lieu."}
            </li>
            <li>
              {isAr
                ? "لا ننشر متوسطات أسعار أو عوائد متوقعة غير مبنية على بيانات موثقة."
                : "Nous ne publions ni moyenne de marché ni rendement attendu qui ne repose pas sur des données documentées."}
            </li>
            <li>
              {isAr
                ? "الإعلانات المعروضة كعينة في هذه البيئة هي بيانات توضيحية وليست عقارات حقيقية متوفرة."
                : "Les annonces marquées « démonstration » dans cet environnement sont des données fictives, pas des biens réellement disponibles."}
            </li>
          </ul>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href={L("/contact")} className="btn-primary">
            {t("nav.contact")}
          </Link>
          <Link href={L("/properties")} className="btn-outline">
            {t("hero.cta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
