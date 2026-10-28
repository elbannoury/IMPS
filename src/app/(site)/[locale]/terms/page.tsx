import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui";
import { getT, isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions d'utilisation de la plateforme IMPS : exactitude des annonces, responsabilités et limites.",
  alternates: { canonical: "/fr/terms", languages: { fr: "/fr/terms", ar: "/ar/terms" } },
};

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const isAr = locale === "ar";

  const sections = isAr
    ? [
        { h: "طبيعة الخدمة", p: "IMPS منصة معلومات عقارية. تُجمع الإعلانات من المالكين أو ممثليهم وتُنشر بعد مراجعة داخلية. لا تُعد المنصة وكيلاً عقارياً ولا وسيطاً في المعاملات." },
        { h: "دقة الإعلانات", p: "نبذل جهداً معقولاً لتحديث المعلومات، لكن الأسعار والمساحات والتوفر قد تتغير. لا تُعد الإعلانات عرضاً ملزماً. يجب التحقق من كل معلومة قبل أي التزام." },
        { h: "التحقق القانوني", p: "التحقق من الهوية أو التوفر أو الوثائق لا يعادل استشارة قانونية. على المشتري أو المكتري إجراء تحققاته لدى جهة مختصة (موثق، محافظ عقاري)." },
        { h: "استخدام المنصة", p: "يُمنع استخدام المنصة لإرسال معلومات كاذبة أو محتوى مسيء أو محاولة الوصول إلى بيانات غير مصرح بها. تُحظر الاستخراج الآلي المكثف للبيانات." },
        { h: "المسؤولية", p: "لا يتحمل IMPS مسؤولية قرارات تُتخذ بناءً على معلومات الإعلانات وحدها، في حدود ما يسمح به القانون." },
        { h: "التعديلات", p: "قد تُحدَّث هذه الشروط. يُنشر تاريخ آخر تحديث في أسفل الصفحة." },
      ]
    : [
        { h: "Nature du service", p: "IMPS est une plateforme d'information immobilière. Les annonces sont collectées auprès des propriétaires ou de leurs représentants et publiées après révision interne. IMPS n'agit pas comme agent immobilier ni comme intermédiaire de transaction." },
        { h: "Exactitude des annonces", p: "Nous mettons à jour les informations avec un soin raisonnable, mais les prix, surfaces et disponibilités peuvent évoluer. Une annonce ne constitue pas une offre contractuelle. Chaque information doit être vérifiée avant tout engagement." },
        { h: "Vérification juridique", p: "Un contrôle d'identité, de disponibilité ou de documents ne remplace pas un avis juridique. L'acquéreur ou le locataire doit effectuer ses propres vérifications auprès d'un professionnel habilité (notaire, conservation foncière)." },
        { h: "Utilisation", p: "Il est interdit d'envoyer de fausses informations, des contenus injurieux, de tenter d'accéder à des données non autorisées ou d'extraire massivement les données de la plateforme." },
        { h: "Responsabilité", p: "IMPS ne peut être tenue responsable des décisions prises sur la seule base des informations publiées, dans les limites permises par la loi." },
        { h: "Modifications", p: "Ces conditions peuvent être mises à jour. La date de dernière mise à jour figure en bas de page." },
      ];

  return (
    <div className="shell max-w-3xl py-12">
      <p className="eyebrow">IMPS</p>
      <h1 className="h-section mt-3">{t("terms.title")}</h1>
      <div className="mt-6">
        <Notice tone="warning">{t("legal.reviewNote")}</Notice>
      </div>
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.h}>
            <h2 className="font-display text-xl">{section.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{section.p}</p>
          </section>
        ))}
        <p className="border-t border-line pt-6 text-xs text-muted">
          {isAr ? "آخر تحديث: أكتوبر 2026." : "Dernière mise à jour : octobre 2026."}
        </p>
      </div>
    </div>
  );
}
