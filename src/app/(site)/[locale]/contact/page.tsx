import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/site/Forms";
import { getT, isLocale, localePath } from "@/lib/i18n";
import { getSiteContact, whatsappLink } from "@/lib/site";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez l'équipe IMPS pour une question sur un bien, une annonce ou un projet immobilier au Maroc.",
  alternates: { canonical: "/fr/contact", languages: { fr: "/fr/contact", ar: "/ar/contact" } },
};

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale);
  const L = (path: string) => localePath(locale, path);
  const contact = await getSiteContact();
  const isAr = locale === "ar";

  return (
    <div className="shell grid gap-12 py-12 lg:grid-cols-[1fr_1fr] lg:py-16">
      <div>
        <p className="eyebrow">{t("nav.contact")}</p>
        <h1 className="h-section mt-3">{t("contact.title")}</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{t("contact.subtitle")}</p>

        <dl className="mt-10 space-y-5 border-t border-line pt-6 text-sm">
          {contact.email ? (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{t("form.email")}</dt>
              <dd className="mt-1">
                <a href={`mailto:${contact.email}`} className="underline decoration-lemon decoration-2 underline-offset-4">
                  {contact.email}
                </a>
              </dd>
            </div>
          ) : null}
          {contact.phone ? (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{t("form.phone")}</dt>
              <dd className="mt-1" dir="ltr">
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="underline decoration-lemon decoration-2 underline-offset-4">
                  {contact.phone}
                </a>
              </dd>
            </div>
          ) : null}
          {contact.whatsapp ? (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">WhatsApp</dt>
              <dd className="mt-1">
                <a href={whatsappLink(contact.whatsapp, "Bonjour IMPS")} target="_blank" rel="noopener noreferrer" className="underline decoration-lemon decoration-2 underline-offset-4">
                  {t("property.whatsapp")}
                </a>
              </dd>
            </div>
          ) : null}
          {contact.address ? (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{t("contact.address")}</dt>
              <dd className="mt-1 text-muted">{contact.address}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-8 text-[11px] text-muted">{t("contact.responseTime")}</p>
        <p className="mt-4 text-[11px] text-muted">
          <Link href={L("/report")} className="underline underline-offset-2 hover:text-ink">
            {t("property.report")}
          </Link>
        </p>
        {!contact.phone && !contact.whatsapp ? (
          <p className="mt-6 border border-line bg-soft p-4 text-[11px] leading-relaxed text-muted">
            {isAr
              ? "لم يُعد رقم الهاتف أو واتساب بعد. يُعرض هنا فقط بعد إعداد رقم حقيقي ومصرح به."
              : "Aucun numéro de téléphone ni numéro WhatsApp n'est configuré. Ils ne s'affichent qu'une fois un numéro réel et autorisé renseigné."}
          </p>
        ) : null}
      </div>

      <div className="border border-line bg-soft/40 p-6">
        <h2 className="font-display text-xl">{isAr ? "اكتب إلينا" : "Écrivez-nous"}</h2>
        <div className="mt-5">
          <ContactForm
            locale={locale}
            labels={{
              name: t("form.name"),
              phone: t("form.phone"),
              email: t("form.email"),
              message: t("form.message"),
              submit: t("form.submit"),
              sending: t("form.sending"),
              consent: t("form.consent"),
              optional: t("common.optional"),
            }}
          />
        </div>
      </div>
    </div>
  );
}
