"use client";

import Link from "next/link";
import { useActionState } from "react";
import { customerLoginAction, customerRegisterAction } from "@/app/actions/auth";
import { Notice } from "@/components/ui";

export function LoginForm({
  locale,
  labels,
}: {
  locale: string;
  labels: { email: string; password: string; submit: string; invalid: string; register: string; noAccount: string; registerHref: string };
}) {
  const [state, action, pending] = useActionState(customerLoginAction, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="li-email" className="label">{labels.email}</label>
        <input id="li-email" name="email" type="email" required autoComplete="email" dir="ltr" className="field" />
      </div>
      <div>
        <label htmlFor="li-password" className="label">{labels.password}</label>
        <input id="li-password" name="password" type="password" required autoComplete="current-password" minLength={1} className="field" />
      </div>
      {state && !state.ok ? <Notice tone="warning">{labels.invalid}</Notice> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "…" : labels.submit}
      </button>
      <p className="pt-2 text-center text-xs text-muted">
        {labels.noAccount}{" "}
        <Link href={labels.registerHref} className="text-ink underline underline-offset-2">
          {labels.register}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({
  locale,
  labels,
}: {
  locale: string;
  labels: { name: string; email: string; password: string; submit: string; login: string; hasAccount: string; loginHref: string; passwordHint: string };
}) {
  const [state, action, pending] = useActionState(customerRegisterAction, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="rg-name" className="label">{labels.name}</label>
        <input id="rg-name" name="fullName" required autoComplete="name" className="field" />
      </div>
      <div>
        <label htmlFor="rg-email" className="label">{labels.email}</label>
        <input id="rg-email" name="email" type="email" required autoComplete="email" dir="ltr" className="field" />
      </div>
      <div>
        <label htmlFor="rg-password" className="label">{labels.password}</label>
        <input id="rg-password" name="password" type="password" required autoComplete="new-password" minLength={8} className="field" />
        <p className="mt-1 text-[10px] text-muted">{labels.passwordHint}</p>
      </div>
      {state && !state.ok ? <Notice tone="warning">{state.message ?? "Erreur"}</Notice> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "…" : labels.submit}
      </button>
      <p className="pt-2 text-center text-xs text-muted">
        {labels.hasAccount}{" "}
        <Link href={labels.loginHref} className="text-ink underline underline-offset-2">
          {labels.login}
        </Link>
      </p>
    </form>
  );
}
