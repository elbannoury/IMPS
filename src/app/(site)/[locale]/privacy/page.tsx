import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui";
import { getT, isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment IMPS collecte, utilise et conserve les données personnelles envoyées via ses formulaires.",
  alternates: { canonical: "/fr/privacy", languages: { fr: "/fr/privacy", ar: "/ar/privacy" } },
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const isAr = locale === "ar";

  const sections = isAr
    ? [
        {
          h: "البيانات التي نجمعها",
          p: "عند إرسال طلب أو طلب زيارة، نجمع الاسم ورقم الهاتف والبريد الإلكتروني (إن قدمته) ونص الرسالة، إضافة إلى العقار المعني. نحتفظ أيضاً بعنوان IP بصيغة مشفرة (hash) للحد من إساءة الاستخدام.",
        },
        {
          h: "الغرض من المعالجة",
          p: "تُستخدم هذه البيانات للرد على طلبك، وترتيب الزيارات، ومتابعة الملف. لا نبيع بياناتك ولا نستخدمها لإرسال تسويق دون موافقة.",
        },
        {
          h: "المدة",
          p: "تُحفظ بيانات الطلبات للمدة اللازمة لمعالجة الملف والالتزامات القانونية. تُحذف الحسابات غير النشطة عند الطلب، مع الاحتفاظ بالطلبات المرتبطة بالتزامات قانونية.",
        },
        {
          h: "المشاركة",
          p: "تُشارك معلومات الطلب فقط مع أعضاء فريق IMPS المصرح لهم، أو مع مالك العقار/ممثله عند الحاجة لترتيب زيارة، وبعد موافقتك الضمنية على ذلك عند إرسال الطلب.",
        },
        {
          h: "حقوقك",
          p: "يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها عبر صفحة الاتصال. سيتم التحقق من هويتك قبل تنفيذ الطلب.",
        },
        {
          h: "ملفات تعريف الارتباط",
          p: "تستخدم المنصة ملف تعريف ارتباط تقنياً لجلسة الدخول (إن سجلت الدخول)، وتخزيناً محلياً في المتصفح للمفضلة والمقارنة. لا تُستخدم أدوات تتبع إعلانية في هذه النسخة.",
        },
      ]
    : [
        {
          h: "Données collectées",
          p: "Lors d'une demande ou d'une demande de visite, nous collectons votre nom, téléphone, e-mail (si fourni), le contenu de votre message et le bien concerné. Une empreinte (hash) de l'adresse IP est conservée pour limiter les abus.",
        },
        {
          h: "Finalités",
          p: "Ces données servent à répondre à votre demande, organiser une visite et suivre le dossier. Elles ne sont ni vendues ni utilisées à des fins de prospection sans votre accord.",
        },
        {
          h: "Durée de conservation",
          p: "Les demandes sont conservées le temps nécessaire au traitement et aux obligations légales. Un compte peut être supprimé sur demande ; les demandes déjà traitées peuvent être conservées pour des raisons légales.",
        },
        {
          h: "Destinataires",
          p: "Les informations sont accessibles aux seuls membres habilités de l'équipe IMPS et, lorsque nécessaire pour organiser une visite, au propriétaire ou à son représentant.",
        },
        {
          h: "Vos droits",
          p: "Vous pouvez demander l'accès, la rectification ou la suppression de vos données via la page contact. Votre identité est vérifiée avant traitement.",
        },
        {
          h: "Cookies",
          p: "La plateforme utilise un cookie technique de session lorsque vous vous connectez, et le stockage local du navigateur pour les favoris et la comparaison. Aucun outil de suivi publicitaire n'est activé dans cette version.",
        },
      ];

  return (
    <div className="shell max-w-3xl py-12">
      <p className="eyebrow">IMPS</p>
      <h1 className="h-section mt-3">{t("privacy.title")}</h1>
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
          {isAr
            ? "لأي طلب متعلق بالبيانات، اتصل بنا عبر صفحة الاتصال. آخر تحديث: أكتوبر 2026."
            : "Pour toute demande relative aux données, contactez-nous via la page contact. Dernière mise à jour : octobre 2026."}
        </p>
      </div>
    </div>
  );
}
