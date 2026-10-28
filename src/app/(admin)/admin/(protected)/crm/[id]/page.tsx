import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui";
import { addLeadNoteAction, updateAppointmentAction, updateLeadAction } from "@/app/actions/crm";
import { hasPermission, requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatDate } from "@/lib/format";
import { LEAD_LABEL_FR } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function CrmDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireStaffPage("crm.read");
  const { id } = await params;
  const flags = await searchParams;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, reference: true, titleFr: true, slug: true, primaryPrice: true } },
      assignedTo: { select: { id: true, fullName: true } },
      notesList: { orderBy: { createdAt: "desc" }, include: { staff: { select: { fullName: true } } } },
      appointments: { orderBy: { requestedAt: "asc" }, include: { assignedTo: { select: { fullName: true } } } },
    },
  });
  if (!lead) notFound();

  const staff = await prisma.profile.findMany({ where: { isStaff: true, isActive: true }, select: { id: true, fullName: true } });
  const canWrite = hasPermission(user, "crm.write");
  const canAppointment = hasPermission(user, "appointment.manage");
  const statuses = ["new", "attempted", "contacted", "qualified", "viewing_scheduled", "viewing_completed", "negotiating", "converted", "lost", "unresponsive"];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations · Clients</p>
          <h1 className="mt-1 font-display text-2xl">{lead.code} — {lead.name}</h1>
          <p className="mt-1 text-xs text-muted">
            {lead.phone ? <span dir="ltr">{lead.phone} · </span> : null}
            {lead.email ?? ""} · {lead.source} · reçu le {formatDateTime(lead.createdAt, "fr")}
          </p>
        </div>
        <Link href="/admin/crm" className="btn-ghost btn-sm">Retour</Link>
      </div>

      {flags.saved ? <div className="mt-4"><Notice tone="success">Demande mise à jour.</Notice></div> : null}
      {flags.note ? <div className="mt-4"><Notice tone="success">Note ajoutée.</Notice></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="border border-line bg-white p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Message</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{lead.message || "—"}</p>
            {lead.property ? (
              <Link href={`/admin/properties/${lead.property.id}`} className="mt-4 inline-block border border-line px-3 py-2 text-[11px] hover:border-ink">
                {lead.property.reference} — {lead.property.titleFr}
              </Link>
            ) : null}
          </section>

          {canWrite ? (
            <section className="border border-line bg-white">
              <header className="border-b border-line px-4 py-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Suivi</h2>
              </header>
              <form action={updateLeadAction} className="grid gap-3 p-4 sm:grid-cols-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <div>
                  <label htmlFor="status" className="label">Statut</label>
                  <select id="status" name="status" defaultValue={lead.status} className="field">
                    {statuses.map((status) => (
                      <option key={status} value={status}>{LEAD_LABEL_FR[status] ?? status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="assignedToId" className="label">Assigné à</label>
                  <select id="assignedToId" name="assignedToId" defaultValue={lead.assignedToId ?? ""} className="field">
                    <option value="">Non assigné</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>{member.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="priority" className="label">Priorité</label>
                  <select id="priority" name="priority" defaultValue={lead.priority} className="field">
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="followUpAt" className="label">Relance</label>
                  <input id="followUpAt" name="followUpAt" type="date" defaultValue={lead.followUpAt ? lead.followUpAt.toISOString().slice(0, 10) : ""} className="field" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="note" className="label">Note de suivi</label>
                  <textarea id="note" name="note" rows={2} className="field" />
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" className="btn-primary">Enregistrer</button>
                </div>
              </form>
            </section>
          ) : null}

          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Historique des notes</h2>
            </header>
            {canWrite ? (
              <form action={addLeadNoteAction} className="flex gap-2 border-b border-line bg-soft/50 p-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <input name="body" required placeholder="Ajouter une note interne…" className="field" />
                <button type="submit" className="btn-outline shrink-0">Ajouter</button>
              </form>
            ) : null}
            <ul className="divide-y divide-line">
              {lead.notesList.map((note) => (
                <li key={note.id} className="px-4 py-2.5 text-[12px]">
                  <p>{note.body}</p>
                  <p className="mt-1 text-[10px] text-muted">{note.staff?.fullName ?? "—"} · {formatDateTime(note.createdAt, "fr")}</p>
                </li>
              ))}
              {!lead.notesList.length ? <li className="px-4 py-6 text-xs text-muted">Aucune note.</li> : null}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="border border-line bg-white p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Statut</h2>
            <p className="mt-2 text-sm">{LEAD_LABEL_FR[lead.status] ?? lead.status}</p>
            <p className="mt-1 text-[11px] text-muted">Assigné : {lead.assignedTo?.fullName ?? "non assigné"}</p>
            <p className="text-[11px] text-muted">Priorité : {lead.priority}</p>
            <p className="text-[11px] text-muted">Relance : {formatDate(lead.followUpAt, "fr")}</p>
          </section>

          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Visites</h2>
            </header>
            <ul className="divide-y divide-line">
              {lead.appointments.map((appointment) => (
                <li key={appointment.id} className="px-4 py-3 text-[11px]">
                  <p className="font-medium">{formatDateTime(appointment.requestedAt, "fr")}</p>
                  <p className="text-muted">{appointment.status} {appointment.assignedTo ? `· ${appointment.assignedTo.fullName}` : ""}</p>
                  {canAppointment ? (
                    <form action={updateAppointmentAction} className="mt-2 flex flex-wrap gap-1">
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <button type="submit" name="status" value="confirmed" className="btn-outline btn-sm">Confirmer</button>
                      <button type="submit" name="status" value="cancelled" className="btn-outline btn-sm">Annuler</button>
                      <button type="submit" name="status" value="completed" className="btn-outline btn-sm">Effectuée</button>
                      <button type="submit" name="status" value="no_show" className="btn-outline btn-sm">Absent</button>
                    </form>
                  ) : null}
                </li>
              ))}
              {!lead.appointments.length ? <li className="px-4 py-4 text-[11px] text-muted">Aucune visite demandée.</li> : null}
            </ul>
          </section>

          <section className="border border-line bg-soft p-4 text-[10px] leading-relaxed text-muted">
            Données personnelles : accès limité aux rôles CRM. Ne pas exporter ni partager en dehors des finalités
            opérationnelles.
          </section>
        </aside>
      </div>
    </div>
  );
}
