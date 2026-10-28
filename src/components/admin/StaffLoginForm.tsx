"use client";

import { useActionState } from "react";
import { staffLoginAction } from "@/app/actions/auth";
import { Notice } from "@/components/ui";

export function StaffLoginForm() {
  const [state, action, pending] = useActionState(staffLoginAction, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value="fr" />
      <div>
        <label htmlFor="staff-email" className="label">E-mail</label>
        <input id="staff-email" name="email" type="email" required autoComplete="username" dir="ltr" className="field" />
      </div>
      <div>
        <label htmlFor="staff-password" className="label">Mot de passe</label>
        <input id="staff-password" name="password" type="password" required autoComplete="current-password" className="field" />
      </div>
      {state && !state.ok ? <Notice tone="warning">Identifiants invalides ou compte inactif.</Notice> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Connexion…" : "Accéder au tableau de bord"}
      </button>
    </form>
  );
}
