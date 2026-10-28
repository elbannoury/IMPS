"use client";

import { useActionState } from "react";
import { submitContactAction, submitInquiryAction, submitReportAction, submitViewingAction } from "@/app/actions/public";
import { Notice } from "@/components/ui";

type Labels = {
  name: string;
  phone: string;
  email: string;
  message: string;
  date: string;
  time: string;
  submit: string;
  sending: string;
  consent: string;
  optional: string;
};

type Errors = Record<string, string> | undefined;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] text-ink">{message}</p>;
}

export function InquiryForm({
  propertyId,
  locale,
  labels,
  emailConfigured,
}: {
  propertyId: string;
  locale: string;
  labels: Labels;
  emailConfigured: boolean;
}) {
  const [state, action, pending] = useActionState(submitInquiryAction, null);
  const errors: Errors = state?.fieldErrors;

  if (state?.ok) {
    return (
      <Notice tone="success">
        <p className="font-medium">{state.message}</p>
        {!emailConfigured ? <p className="mt-1 opacity-70">{locale === "ar" ? "لن تُرسل رسالة تأكيد بالبريد: إرسال البريد غير مُعد." : "Aucun e-mail de confirmation ne sera envoyé : l'envoi d'e-mails n'est pas configuré."}</p> : null}
      </Notice>
    );
  }

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div>
        <label htmlFor="inq-name" className="label">
          {labels.name}
        </label>
        <input id="inq-name" name="name" required autoComplete="name" className="field" />
        <FieldError message={errors?.name} />
      </div>
      <div>
        <label htmlFor="inq-phone" className="label">
          {labels.phone}
        </label>
        <input id="inq-phone" name="phone" required type="tel" dir="ltr" autoComplete="tel" placeholder="+212 6 00 00 00 00" className="field" />
        <FieldError message={errors?.phone} />
      </div>
      <div>
        <label htmlFor="inq-email" className="label">
          {labels.email} <span className="normal-case tracking-normal">({labels.optional})</span>
        </label>
        <input id="inq-email" name="email" type="email" dir="ltr" autoComplete="email" className="field" />
        <FieldError message={errors?.email} />
      </div>
      <div>
        <label htmlFor="inq-message" className="label">
          {labels.message}
        </label>
        <textarea id="inq-message" name="message" rows={3} className="field" />
      </div>
      <label className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#111111]" />
        {labels.consent}
      </label>
      <FieldError message={errors?.consent} />
      {state && !state.ok ? <Notice tone="warning">{state.message}</Notice> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}

export function ViewingForm({
  propertyId,
  locale,
  labels,
  emailConfigured,
}: {
  propertyId: string;
  locale: string;
  labels: Labels;
  emailConfigured: boolean;
}) {
  const [state, action, pending] = useActionState(submitViewingAction, null);
  const errors: Errors = state?.fieldErrors;
  const today = new Date();
  const min = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10);

  if (state?.ok) {
    return (
      <Notice tone="warning">
        <p className="font-medium">{state.message}</p>
        <p className="mt-1 opacity-80">
          {locale === "ar"
            ? "الحالة حالياً: طلب زيارة (غير مؤكد) — سيؤكد فريق IMPS الموعد."
            : "Statut actuel : demande de visite (non confirmée) — l'équipe IMPS confirmera le créneau."}
        </p>
        {!emailConfigured ? <p className="mt-1 opacity-70">{locale === "ar" ? "لن تُرسل رسالة بالبريد: إرسال البريد غير مُعد." : "Aucun e-mail ne sera envoyé : l'envoi d'e-mails n'est pas configuré."}</p> : null}
      </Notice>
    );
  }

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div>
        <label htmlFor="vw-name" className="label">
          {labels.name}
        </label>
        <input id="vw-name" name="name" required autoComplete="name" className="field" />
        <FieldError message={errors?.name} />
      </div>
      <div>
        <label htmlFor="vw-phone" className="label">
          {labels.phone}
        </label>
        <input id="vw-phone" name="phone" required type="tel" dir="ltr" autoComplete="tel" className="field" />
        <FieldError message={errors?.phone} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="vw-date" className="label">
            {labels.date}
          </label>
          <input id="vw-date" name="requestedDate" type="date" required min={min} className="field" />
          <FieldError message={errors?.requestedDate} />
        </div>
        <div>
          <label htmlFor="vw-time" className="label">
            {labels.time}
          </label>
          <input id="vw-time" name="requestedTime" type="time" required min="09:00" max="19:00" defaultValue="10:00" className="field" />
          <FieldError message={errors?.requestedTime} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#111111]" />
        {labels.consent}
      </label>
      <FieldError message={errors?.consent} />
      {state && !state.ok ? <Notice tone="warning">{state.message}</Notice> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}

export function ReportForm({
  propertyId,
  locale,
  labels,
}: {
  propertyId: string;
  locale: string;
  labels: { reason: string; details: string; submit: string; sending: string; success: string; reasons: Record<string, string> };
}) {
  const [state, action, pending] = useActionState(submitReportAction, null);

  if (state?.ok) {
    return <Notice tone="success">{labels.success}</Notice>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div>
        <label htmlFor="rp-reason" className="label">
          {labels.reason}
        </label>
        <select id="rp-reason" name="reason" className="field" required>
          <option value="price">{labels.reasons.price}</option>
          <option value="unavailable">{labels.reasons.unavailable}</option>
          <option value="info">{labels.reasons.info}</option>
          <option value="other">{labels.reasons.other}</option>
        </select>
      </div>
      <div>
        <label htmlFor="rp-details" className="label">
          {labels.details}
        </label>
        <textarea id="rp-details" name="details" rows={4} className="field" />
      </div>
      {state && !state.ok ? <Notice tone="warning">{locale === "ar" ? "حدث خطأ. أعد المحاولة." : "Une erreur est survenue. Réessayez."}</Notice> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}


export function ContactForm({
  locale,
  labels,
}: {
  locale: string;
  labels: { name: string; phone: string; email: string; message: string; submit: string; sending: string; consent: string; optional: string };
}) {
  const [state, action, pending] = useActionState(submitContactAction, null);
  const errors: Errors = state?.fieldErrors;

  if (state?.ok) {
    return (
      <Notice tone="success">
        <p className="font-medium">{state.message}</p>
        <p className="mt-1 opacity-70">{locale === "ar" ? "لن تُرسل رسالة بالبريد: إرسال البريد غير مُعد في هذه البيئة." : "Aucun e-mail de confirmation ne sera envoyé : l'envoi d'e-mails n'est pas configuré."}</p>
      </Notice>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div>
        <label htmlFor="ct-name" className="label">{labels.name}</label>
        <input id="ct-name" name="name" required className="field" autoComplete="name" />
        <FieldError message={errors?.name} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-phone" className="label">{labels.phone}</label>
          <input id="ct-phone" name="phone" type="tel" dir="ltr" className="field" autoComplete="tel" />
          <FieldError message={errors?.phone} />
        </div>
        <div>
          <label htmlFor="ct-email" className="label">{labels.email} <span className="normal-case tracking-normal">({labels.optional})</span></label>
          <input id="ct-email" name="email" type="email" dir="ltr" className="field" autoComplete="email" />
          <FieldError message={errors?.email} />
        </div>
      </div>
      <div>
        <label htmlFor="ct-message" className="label">{labels.message}</label>
        <textarea id="ct-message" name="message" rows={5} required className="field" />
        <FieldError message={errors?.message} />
      </div>
      <label className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#111111]" />
        {labels.consent}
      </label>
      {state && !state.ok ? <Notice tone="warning">{state.message}</Notice> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
