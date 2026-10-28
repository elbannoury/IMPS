import Link from "next/link";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatDate } from "@/lib/format";
import { LEAD_LABEL_FR } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; assignee?: string; q?: string }>;
}) {
  const user = await requireStaffPage("crm.read");
  const flags = await searchParams;

  const where = {
    ...(flags.status ? { status: flags.status } : {}),
    ...(flags.source ? { source: flags.source } : {}),
    ...(flags.assignee ? { assignedToId: flags.assignee === "none" ? null : flags.assignee } : {}),
    ...(flags.q ? { OR: [{ name: { contains: flags.q } }, { phone: { contains: flags.q } }, { code: { contains: flags.q } }, { email: { contains: flags.q } }] } : {}),
  };

  const [leads, staff, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      include: {
        property: { select: { id: true, reference: true, titleFr: true, slug: true } },
        assignedTo: { select: { fullName: true } },
        appointments: { select: { id: true, status: true, requestedAt: true } },
      },
    }),
    prisma.profile.findMany({ where: { isStaff: true, isActive: true }, select: { id: true, fullName: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const statusCounts = Object.fromEntries(counts.map((row) => [row.status, row._count._all]));
  const statuses = ["new", "attempted", "contacted", "qualified", "viewing_scheduled", "viewing_completed", "negotiating", "converted", "lost", "unresponsive"];
  const sources = ["website_form", "viewing_form", "whatsapp", "phone", "report", "other"];

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations</p>
      <h1 className="mt-1 font-display text-3xl">Clients & demandes</h1>
      <p className="mt-1 text-xs text-muted">Données personnelles — accès restreint aux rôles autorisés.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/admin/crm" className={`badge ${!flags.status ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
          Toutes
        </Link>
        {statuses.map((status) => (
          <Link key={status} href={`/admin/crm?status=${status}`} className={`badge ${flags.status === status ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"}`}>
            {LEAD_LABEL_FR[status] ?? status} · {statusCounts[status] ?? 0}
          </Link>
        ))}
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3 border border-line bg-white p-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="q" className="label">Recherche</label>
          <input id="q" name="q" defaultValue={flags.q ?? ""} className="field" placeholder="Nom, téléphone, code…" />
        </div>
        <div>
          <label htmlFor="source" className="label">Source</label>
          <select id="source" name="source" defaultValue={flags.source ?? ""} className="field min-w-[150px]">
            <option value="">Toutes</option>
            {sources.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assignee" className="label">Assigné à</label>
          <select id="assignee" name="assignee" defaultValue={flags.assignee ?? ""} className="field min-w-[160px]">
            <option value="">Tous</option>
            <option value="none">Non assigné</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.fullName}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-outline">Filtrer</button>
        <Link href="/admin/crm" className="btn-ghost">Réinitialiser</Link>
      </form>

      <div className="mt-5 overflow-x-auto border border-line bg-white">
        <table className="table-admin min-w-[1000px]">
          <thead>
            <tr>
              <th>Code</th>
              <th>Client</th>
              <th>Bien</th>
              <th>Source</th>
              <th>Statut</th>
              <th>Assigné</th>
              <th>Relance</th>
              <th>Reçu</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="text-[11px] tabular-nums">{lead.code}</td>
                <td>
                  <Link href={`/admin/crm/${lead.id}`} className="font-medium hover:underline">{lead.name}</Link>
                  <p className="text-[10px] text-muted" dir="ltr">{lead.phone ?? lead.email ?? "—"}</p>
                  {lead.appointments.some((a) => a.status === "requested") ? (
                    <span className="badge-lemon mt-1">Visite demandée</span>
                  ) : null}
                </td>
                <td className="max-w-[220px]">
                  {lead.property ? (
                    <Link href={`/admin/properties/${lead.property.id}`} className="text-[11px] hover:underline">
                      {lead.property.reference}
                    </Link>
                  ) : (
                    <span className="text-[11px] text-muted">—</span>
                  )}
                  <p className="truncate text-[10px] text-muted">{lead.property?.titleFr ?? "Message général"}</p>
                </td>
                <td className="text-[11px]">{lead.source}</td>
                <td><span className="badge-muted">{LEAD_LABEL_FR[lead.status] ?? lead.status}</span></td>
                <td className="text-[11px]">{lead.assignedTo?.fullName ?? <span className="text-muted">Non assigné</span>}</td>
                <td className="text-[11px]">{formatDate(lead.followUpAt, "fr")}</td>
                <td className="whitespace-nowrap text-[10px] text-muted">{formatDateTime(lead.createdAt, "fr")}</td>
                <td className="text-end"><Link href={`/admin/crm/${lead.id}`} className="btn-outline btn-sm">Ouvrir</Link></td>
              </tr>
            ))}
            {!leads.length ? <tr><td colSpan={9} className="py-10 text-center text-sm text-muted">Aucune demande pour ce filtre.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-muted">
        Connecté en tant que {user.fullName} — export CSV disponible via l&apos;API interne (non activé dans cette version).
      </p>
    </div>
  );
}
