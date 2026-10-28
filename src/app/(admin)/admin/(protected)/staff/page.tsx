import { Notice } from "@/components/ui";
import { createStaffAction, setStaffActiveAction, updateStaffRoleAction } from "@/app/actions/auth";
import { hasPermission, requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PERMISSION_META, ROLE_META, ROLE_PERMISSIONS, type RoleKey } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function StaffPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaffPage("staff.manage");
  const flags = await searchParams;

  const members = await prisma.profile.findMany({
    where: { isStaff: true },
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    include: { role: true },
  });

  const canManageOwner = user.roleKey === "owner";
  const roleKeys = (Object.keys(ROLE_META) as RoleKey[]).filter((key) => canManageOwner || key !== "owner");

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Administration</p>
      <h1 className="mt-1 font-display text-3xl">Équipe & permissions</h1>
      <p className="mt-1 text-xs text-muted">
        Les permissions sont vérifiées côté serveur à chaque action. Modifier un rôle est journalisé.
      </p>

      {flags.created ? <div className="mt-4"><Notice tone="success">Compte créé. Transmettez le mot de passe initial par un canal sécurisé.</Notice></div> : null}
      {flags.role ? <div className="mt-4"><Notice tone="success">Rôle mis à jour.</Notice></div> : null}
      {flags.active ? <div className="mt-4"><Notice tone="success">Statut du compte mis à jour.</Notice></div> : null}
      {flags.error === "OWNER_PROTECTED" ? <div className="mt-4"><Notice tone="warning">Le compte propriétaire ne peut pas être modifié ici.</Notice></div> : null}
      {flags.error === "SELF_ROLE" ? <div className="mt-4"><Notice tone="warning">Vous ne pouvez pas modifier votre propre rôle ou votre propre accès.</Notice></div> : null}
      {flags.error === "EMAIL_TAKEN" ? <div className="mt-4"><Notice tone="warning">Cette adresse e-mail est déjà utilisée.</Notice></div> : null}
      {flags.error === "INVALID" ? <div className="mt-4"><Notice tone="warning">Formulaire invalide (mot de passe de 10 caractères minimum).</Notice></div> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="border border-line bg-white">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Membres ({members.length})</h2>
          </header>
          <div className="divide-y divide-line">
            {members.map((member) => {
              const isOwner = member.role?.key === "owner";
              return (
                <div key={member.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_200px_auto] lg:items-center">
                  <div>
                    <p className="text-[13px] font-medium">
                      {member.fullName}
                      {member.id === user.id ? <span className="ms-2 text-[10px] text-muted">(vous)</span> : null}
                    </p>
                    <p className="text-[11px] text-muted">{member.email}</p>
                    <p className="text-[10px] text-muted">
                      {member.role?.nameFr ?? "—"} · {member.isActive ? "actif" : "désactivé"} · dernière connexion{" "}
                      {member.lastLoginAt ? formatDateTime(member.lastLoginAt, "fr") : "jamais"}
                    </p>
                  </div>
                  <form action={updateStaffRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="profileId" value={member.id} />
                    <select name="roleKey" defaultValue={member.role?.key ?? ""} disabled={isOwner || member.id === user.id} className="field h-9 text-xs">
                      {roleKeys.map((key) => (
                        <option key={key} value={key}>{ROLE_META[key].nameFr}</option>
                      ))}
                    </select>
                    <button type="submit" disabled={isOwner || member.id === user.id} className="btn-outline btn-sm disabled:opacity-40">OK</button>
                  </form>
                  <form action={setStaffActiveAction}>
                    <input type="hidden" name="profileId" value={member.id} />
                    <input type="hidden" name="activate" value={member.isActive ? "0" : "1"} />
                    <button type="submit" disabled={isOwner || member.id === user.id} className="btn-ghost btn-sm text-muted disabled:opacity-40">
                      {member.isActive ? "Désactiver" : "Réactiver"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Ajouter un membre</h2>
            </header>
            <form action={createStaffAction} className="space-y-2 p-4">
              <div>
                <label htmlFor="fullName" className="label">Nom complet</label>
                <input id="fullName" name="fullName" required className="field" />
              </div>
              <div>
                <label htmlFor="email" className="label">E-mail professionnel</label>
                <input id="email" name="email" type="email" required dir="ltr" className="field" />
              </div>
              <div>
                <label htmlFor="phone" className="label">Téléphone (facultatif)</label>
                <input id="phone" name="phone" className="field" dir="ltr" />
              </div>
              <div>
                <label htmlFor="roleKey" className="label">Rôle</label>
                <select id="roleKey" name="roleKey" className="field">
                  {roleKeys.map((key) => (
                    <option key={key} value={key}>{ROLE_META[key].nameFr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="password" className="label">Mot de passe initial (min. 10 caractères)</label>
                <input id="password" name="password" type="text" minLength={10} required className="field" dir="ltr" />
              </div>
              <button type="submit" className="btn-primary w-full">Créer le compte</button>
              <p className="text-[10px] leading-relaxed text-muted">
                Aucun e-mail d&apos;invitation n&apos;est envoyé : transmettez le mot de passe manuellement, l&apos;utilisateur
                pourra le changer.
              </p>
            </form>
          </section>

          <section className="border border-line bg-white p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Permissions par rôle</h2>
            <ul className="mt-3 space-y-3">
              {(Object.keys(ROLE_META) as RoleKey[]).map((key) => (
                <li key={key} className="border-b border-line pb-2 last:border-0">
                  <p className="text-[12px] font-medium">{ROLE_META[key].nameFr}</p>
                  <p className="text-[10px] text-muted">{ROLE_META[key].description}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {ROLE_PERMISSIONS[key].slice(0, 6).map((permission) => PERMISSION_META[permission].label).join(" · ")}
                    {ROLE_PERMISSIONS[key].length > 6 ? ` +${ROLE_PERMISSIONS[key].length - 6}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          {!hasPermission(user, "audit.read") ? null : (
            <a href="/admin/audit" className="btn-outline w-full">Voir le journal d&apos;audit</a>
          )}
        </aside>
      </div>
    </div>
  );
}
