import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui";
import { addContactAttemptAction, convertSourcingAction, updateSourcingAction } from "@/app/actions/sourcing";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { STAGE_LABEL_FR } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function SourcingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireStaffPage("sourcing.manage");
  const { id } = await params;
  const flags = await searchParams;

  const lead = await prisma.propertyLead.findUnique({
    where: { id },
    include: {
      city: true,
      category: true,
      assignedTo: true,
      ownerContacts: true,
      attempts: { orderBy: { createdAt: "desc" }, include: { staff: { select: { fullName: true } } } },
      convertedProperty: { select: { id: true, reference: true } },
    },
  });
  if (!lead) notFound();

  const [staff, cities, categories] = await Promise.all([
    prisma.profile.findMany({ where: { isStaff: true, isActive: true }, select: { id: true, fullName: true } }),
    prisma.city.findMany({ where: { isPublished: true }, orderBy: { nameFr: "asc" }, select: { id: true, nameFr: true } }),
    prisma.propertyCategory.findMany({ where: { isActive: true }, orderBy: { nameFr: "asc" }, select: { id: true, nameFr: true } }),
  ]);

  const stages = ["discovered", "contacted", "collecting", "verification", "review", "approved", "published", "rejected", "unresponsive", "duplicate", "not_authorized", "unavailable"];
  const owner = lead.ownerContacts[0];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations · Sourcing</p>
          <h1 className="mt-1 font-display text-2xl">{lead.code} — {lead.title}</h1>
          <p className="mt-1 text-xs text-muted">
            {lead.city?.nameFr ?? "—"} · {lead.category?.nameFr ?? "—"} · {lead.transactionType === "rent" ? "Location" : "Vente"} ·{" "}
            {formatPrice(lead.askingPrice, "fr")}
          </p>
        </div>
        <div className="flex gap-2">
          {lead.convertedProperty ? (
            <Link href={`/admin/properties/${lead.convertedProperty.id}`} className="btn-outline btn-sm">
              Bien {lead.convertedProperty.reference}
            </Link>
          ) : (
            <form action={convertSourcingAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <button type="submit" className="btn-primary btn-sm">Créer le bien (brouillon)</button>
            </form>
          )}
          <Link href="/admin/sourcing" className="btn-ghost btn-sm">Retour</Link>
        </div>
      </div>

      {flags.saved ? <div className="mt-4"><Notice tone="success">Piste mise à jour.</Notice></div> : null}
      {flags.attempt ? <div className="mt-4"><Notice tone="success">Contact enregistré.</Notice></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Suivi de la piste</h2>
            </header>
            <form action={updateSourcingAction} className="grid gap-3 p-4 md:grid-cols-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <div>
                <label htmlFor="stage" className="label">Étape</label>
                <select id="stage" name="stage" defaultValue={lead.stage} className="field">
                  {stages.map((stage) => (
                    <option key={stage} value={stage}>{STAGE_LABEL_FR[stage] ?? stage}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="permissionToPublish" className="label">Autorisation de publier</label>
                <select id="permissionToPublish" name="permissionToPublish" defaultValue={lead.permissionToPublish} className="field">
                  <option value="none">Aucune</option>
                  <option value="verbal">Verbale</option>
                  <option value="written">Écrite</option>
                  <option value="documented">Documentée</option>
                </select>
              </div>
              <div>
                <label htmlFor="assignedToId" className="label">Responsable</label>
                <select id="assignedToId" name="assignedToId" defaultValue={lead.assignedToId ?? ""} className="field">
                  <option value="">—</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>{member.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="nextFollowUpAt" className="label">Prochaine relance</label>
                <input id="nextFollowUpAt" name="nextFollowUpAt" type="date" defaultValue={lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString().slice(0, 10) : ""} className="field" />
              </div>
              <div>
                <label htmlFor="askingPrice" className="label">Prix demandé (MAD)</label>
                <input id="askingPrice" name="askingPrice" type="number" defaultValue={lead.askingPrice ?? ""} className="field tabular-nums" />
              </div>
              <div>
                <label htmlFor="firstContactAt" className="label">Premier contact</label>
                <input id="firstContactAt" name="firstContactAt" type="date" defaultValue={lead.firstContactAt ? lead.firstContactAt.toISOString().slice(0, 10) : ""} className="field" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="missingInfo" className="label">Informations manquantes</label>
                <input id="missingInfo" name="missingInfo" defaultValue={lead.missingInfo ?? ""} placeholder="Photos intérieures, titre de propriété, confirmation du prix…" className="field" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className="label">Description / notes de collecte</label>
                <textarea id="description" name="description" rows={4} defaultValue={lead.description ?? ""} className="field" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="internalNotes" className="label">Notes internes</label>
                <textarea id="internalNotes" name="internalNotes" rows={3} defaultValue={lead.internalNotes ?? ""} className="field" />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </section>

          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Historique des contacts</h2>
            </header>
            <form action={addContactAttemptAction} className="grid gap-3 border-b border-line bg-soft/50 p-4 sm:grid-cols-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <div>
                <label htmlFor="channel" className="label">Canal</label>
                <select id="channel" name="channel" className="field">
                  <option value="call">Appel</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                  <option value="visit">Visite</option>
                </select>
              </div>
              <div>
                <label htmlFor="outcome" className="label">Résultat</label>
                <select id="outcome" name="outcome" className="field">
                  <option value="reached">Joint</option>
                  <option value="no_answer">Sans réponse</option>
                  <option value="callback">Rappel demandé</option>
                  <option value="refused">Refus</option>
                  <option value="wrong_number">Mauvais numéro</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="label">Notes</label>
                <input id="notes" name="notes" className="field" />
              </div>
              <div className="sm:col-span-4">
                <button type="submit" className="btn-outline btn-sm">Enregistrer le contact</button>
              </div>
            </form>
            <ul className="divide-y divide-line">
              {lead.attempts.map((attempt) => (
                <li key={attempt.id} className="px-4 py-3 text-[12px]">
                  <p>
                    <span className="font-medium">{attempt.channel}</span> · {attempt.outcome} ·{" "}
                    <span className="text-muted">{formatDateTime(attempt.createdAt, "fr")} {attempt.staff ? `· ${attempt.staff.fullName}` : ""}</span>
                  </p>
                  {attempt.notes ? <p className="mt-1 text-muted">{attempt.notes}</p> : null}
                </li>
              ))}
              {!lead.attempts.length ? <li className="px-4 py-6 text-xs text-muted">Aucun contact enregistré.</li> : null}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="border border-line bg-white p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Contact propriétaire</h2>
            <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted">Confidentiel — jamais public</p>
            {owner ? (
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-medium">{owner.name}</p>
                {owner.phone ? <p dir="ltr" className="text-muted">{owner.phone}</p> : null}
                {owner.email ? <p className="text-muted">{owner.email}</p> : null}
                <p className="text-[11px] text-muted">{owner.role ?? "propriétaire"}</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">Aucun contact propriétaire enregistré.</p>
            )}
          </section>

          <section className="border border-line bg-white p-4 text-[11px] text-muted">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink">Informations</p>
            <p className="mt-2">Créée le {formatDate(lead.createdAt, "fr")}</p>
            <p>Premier contact : {lead.firstContactAt ? formatDate(lead.firstContactAt, "fr") : "—"}</p>
            <p>Autorisation : {lead.permissionToPublish}</p>
            <p>Responsable : {lead.assignedTo?.fullName ?? "—"}</p>
            <p className="mt-2">Manquant : {lead.missingInfo || "—"}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
