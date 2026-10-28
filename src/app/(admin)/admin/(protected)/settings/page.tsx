import { Notice } from "@/components/ui";
import { saveSettingsAction } from "@/app/actions/settings";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function IntegrationRow({ label, configured, detail }: { label: string; configured: boolean; detail: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[12px] last:border-0">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-[10px] text-muted">{detail}</p>
      </div>
      <span className={`badge ${configured ? "border-ink bg-ink text-white" : "border-line bg-soft text-muted"}`}>
        {configured ? "Configuré" : "Non configuré"}
      </span>
    </li>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaffPage("settings.manage");
  const flags = await searchParams;

  const rows = await prisma.siteSetting.findMany();
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Administration</p>
      <h1 className="mt-1 font-display text-3xl">Paramètres</h1>
      <p className="mt-1 text-xs text-muted">Paramètres publics de la plateforme et état réel des intégrations.</p>

      {flags.saved ? <div className="mt-4"><Notice tone="success">Paramètres enregistrés.</Notice></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <form action={saveSettingsAction} className="space-y-4">
          <section className="border border-line bg-white p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Général</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="s-brand" className="label">Nom de la marque</label>
                <input id="s-brand" name="setting:brand.name" defaultValue={settings["brand.name"] ?? "IMPS"} className="field" />
              </div>
              <div>
                <label htmlFor="s-tagline" className="label">Accroche</label>
                <input id="s-tagline" name="setting:brand.tagline" defaultValue={settings["brand.tagline"] ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor="s-email" className="label">E-mail public</label>
                <input id="s-email" name="setting:contact.email" defaultValue={settings["contact.email"] ?? ""} dir="ltr" className="field" />
              </div>
              <div>
                <label htmlFor="s-phone" className="label">Téléphone public</label>
                <input id="s-phone" name="setting:contact.phone" defaultValue={settings["contact.phone"] ?? ""} dir="ltr" className="field" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="s-address" className="label">Adresse</label>
                <input id="s-address" name="setting:contact.address" defaultValue={settings["contact.address"] ?? ""} className="field" />
              </div>
            </div>
          </section>

          <section className="border border-line bg-white p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Fonctionnalités</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="s-invest" className="label">Section investissement</label>
                <select id="s-invest" name="setting:features.investment" defaultValue={settings["features.investment"] ?? "true"} className="field">
                  <option value="true">Activée</option>
                  <option value="false">Désactivée</option>
                </select>
              </div>
              <div>
                <label htmlFor="s-dev" className="label">Programmes neufs</label>
                <select id="s-dev" name="setting:features.developments" defaultValue={settings["features.developments"] ?? "true"} className="field">
                  <option value="true">Activés</option>
                  <option value="false">Désactivés</option>
                </select>
              </div>
              <div>
                <label htmlFor="s-stale" className="label">Jours avant reconfirmation</label>
                <input id="s-stale" name="setting:listings.staleDays" type="number" min={7} defaultValue={settings["listings.staleDays"] ?? "30"} className="field" />
              </div>
            </div>
          </section>

          <button type="submit" className="btn-primary">Enregistrer</button>
          <p className="text-[10px] text-muted">Connecté en tant que {user.fullName} — la modification des paramètres est journalisée.</p>
        </form>

        <aside className="space-y-4">
          <section className="border border-line bg-white p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Intégrations</h2>
            <ul className="mt-2">
              <IntegrationRow label="Base de données" configured detail="SQLite en local — PostgreSQL en production (voir DEPLOYMENT.md)" />
              <IntegrationRow label="Stockage médias" configured={process.env.MEDIA_STORAGE !== "local"} detail={process.env.MEDIA_STORAGE === "local" ? "Disque local (public/uploads) — non adapté à un déploiement multi-instances" : "Stockage objet configuré"} />
              <IntegrationRow label="Cartes" configured={!!(process.env.NEXT_PUBLIC_MAP_PROVIDER && (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY))} detail="NEXT_PUBLIC_MAP_PROVIDER + token requis" />
              <IntegrationRow label="E-mail transactionnel" configured={!!process.env.EMAIL_PROVIDER} detail="Aucun e-mail n'est envoyé tant qu'un fournisseur n'est pas configuré" />
              <IntegrationRow label="WhatsApp" configured={!!process.env.NEXT_PUBLIC_WHATSAPP_NUMBER} detail="Numéro professionnel réel et autorisé requis" />
              <IntegrationRow label="Analytics" configured={!!process.env.NEXT_PUBLIC_ANALYTICS_ID} detail="Aucun script de suivi n'est chargé sans identifiant" />
            </ul>
          </section>

          <section className="border border-line bg-soft p-4 text-[11px] leading-relaxed text-muted">
            <p className="font-semibold uppercase tracking-[0.12em] text-ink">Rappel sécurité</p>
            <p className="mt-2">
              Les secrets (SESSION_SECRET, clés de stockage, fournisseur e-mail) ne doivent jamais être saisis ici : ils
              sont lus depuis les variables d&apos;environnement du serveur.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
