import Link from "next/link";
import { Kpi, Notice, StatusPill } from "@/components/ui";
import { hasPermission, requireStaffPage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getDashboardData } from "@/lib/queries";
import { STATUS_LABEL_FR, STAGE_LABEL_FR } from "@/lib/status";
import { confirmAvailabilityAction } from "@/app/actions/properties";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireStaffPage();
  const { denied } = await searchParams;
  const data = await getDashboardData();
  const c = data.counts;

  const pipelineStages = ["discovered", "contacted", "collecting", "verification", "review", "approved", "published"];
  const maxStage = Math.max(1, ...pipelineStages.map((stage) => data.stageCounts[stage] ?? 0));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">IMPS · Pilotage</p>
          <h1 className="mt-1 font-display text-3xl">Tableau de bord</h1>
          <p className="mt-1 text-xs text-muted">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission(user, "sourcing.manage") ? (
            <Link href="/admin/sourcing?new=1" className="btn-outline btn-sm">
              Nouvelle piste
            </Link>
          ) : null}
          {hasPermission(user, "property.write") ? (
            <Link href="/admin/properties/new" className="btn-primary btn-sm">
              Nouveau bien
            </Link>
          ) : null}
        </div>
      </div>

      {denied ? (
        <div className="mt-4">
          <Notice tone="danger">Accès refusé : votre rôle ne permet pas cette page.</Notice>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Biens au total" value={data.totalActive} />
        <Kpi label="En ligne" value={c.published ?? 0} />
        <Kpi label="En révision" value={c.in_review ?? 0} hint="File de révision" />
        <Kpi label="Brouillons" value={c.draft ?? 0} />
        <Kpi label="À reconfirmer" value={data.staleCount} hint="Disponibilité > 30 j" />
        <Kpi label="Archivés" value={c.archived ?? 0} />
        <Kpi label="Nouvelles demandes" value={data.newLeads} />
        <Kpi label="Visites à traiter" value={data.pendingViewings} />
        <Kpi label="Relances dues" value={data.followUpsDue} />
        <Kpi label="Réservés" value={c.reserved ?? 0} />
        <Kpi label="Vendus / loués" value={(c.sold ?? 0) + (c.rented ?? 0)} />
        <Kpi label="Indisponibles / expirés" value={(c.unavailable ?? 0) + (c.expired ?? 0)} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="border border-line bg-white">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Pipeline de sourcing</h2>
            {hasPermission(user, "sourcing.manage") ? (
              <Link href="/admin/sourcing" className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink">
                Ouvrir
              </Link>
            ) : null}
          </header>
          <div className="space-y-3 p-4">
            {pipelineStages.map((stage) => {
              const count = data.stageCounts[stage] ?? 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-[11px] text-muted">{STAGE_LABEL_FR[stage]}</span>
                  <div className="h-3 flex-1 bg-soft">
                    <div className="h-full bg-ink" style={{ width: `${(count / maxStage) * 100}%` }} />
                  </div>
                  <span className="w-8 text-end text-[11px] tabular-nums">{count}</span>
                </div>
              );
            })}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              {Object.entries(data.stageCounts)
                .filter(([stage]) => !pipelineStages.includes(stage))
                .map(([stage, count]) => (
                  <span key={stage} className="badge-muted">
                    {STAGE_LABEL_FR[stage] ?? stage}: {count}
                  </span>
                ))}
            </div>
          </div>
        </section>

        <section className="border border-line bg-white">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Annonces à reconfirmer</h2>
          </header>
          <div className="divide-y divide-line">
            {data.staleList.length ? (
              data.staleList.map((property) => (
                <div key={property.id} className="px-4 py-3">
                  <Link href={`/admin/properties/${property.id}`} className="text-[13px] font-medium hover:underline">
                    {property.reference} — {property.titleFr}
                  </Link>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Dernier contrôle : {property.availabilityConfirmedAt ? formatDateTime(property.availabilityConfirmedAt, "fr") : "jamais"}
                    {property.assignedTo ? ` · ${property.assignedTo.fullName}` : ""}
                  </p>
                  {hasPermission(user, "property.write") ? (
                    <form action={confirmAvailabilityAction} className="mt-2">
                      <input type="hidden" name="propertyId" value={property.id} />
                      <button type="submit" className="btn-outline btn-sm">
                        Reconfirmer
                      </button>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-xs text-muted">Aucune annonce en retard de reconfirmation.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 border border-line bg-white">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Activité récente</h2>
          {hasPermission(user, "audit.read") ? (
            <Link href="/admin/audit" className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink">
              Journal complet
            </Link>
          ) : null}
        </header>
        <ul className="divide-y divide-line">
          {data.recentAudit.length ? (
            data.recentAudit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12px]">
                <span className="text-ink/85">{entry.summary}</span>
                <span className="text-[10px] text-muted">
                  {entry.actor?.fullName ?? "Système"} · {formatDateTime(entry.createdAt, "fr")}
                </span>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-xs text-muted">Aucune activité pour le moment.</li>
          )}
        </ul>
      </section>

      <section className="mt-6 border border-line bg-white">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Répartition par statut</h2>
        </header>
        <div className="flex flex-wrap gap-2 p-4">
          {Object.entries(data.counts).map(([status, count]) => (
            <span key={status} className="flex items-center gap-2">
              <StatusPill status={status} label={STATUS_LABEL_FR[status] ?? status} />
              <span className="text-[11px] tabular-nums text-muted">{count}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
