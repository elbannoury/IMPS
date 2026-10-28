import { requireStaffPage } from "@/lib/auth";
import { getReportData } from "@/lib/queries";
import { LEAD_LABEL_FR, STATUS_LABEL_FR } from "@/lib/status";

export const dynamic = "force-dynamic";

function BarList({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center gap-3 text-[12px]">
          <span className="w-32 shrink-0 truncate text-muted">{row.label}</span>
          <span className="h-2.5 flex-1 bg-soft">
            <span className="block h-full bg-ink" style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="w-14 text-end tabular-nums">
            {row.count}
            <span className="ms-1 text-[10px] text-muted">{total ? `${Math.round((row.count / total) * 100)}%` : ""}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function ReportsPage() {
  await requireStaffPage("report.read");
  const data = await getReportData();

  const totalProperties = data.byCategory.reduce((sum, row) => sum + row.count, 0);
  const totalLeads = data.leadBySource.reduce((sum, row) => sum + row.count, 0);
  const converted = data.leadByStatus.find((row) => row.label === "converted")?.count ?? 0;
  const totalViewings = data.appointmentByStatus.reduce((sum, row) => sum + row.count, 0);
  const completedViewings = data.appointmentByStatus.find((row) => row.label === "completed")?.count ?? 0;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Administration</p>
      <h1 className="mt-1 font-display text-3xl">Rapports</h1>
      <p className="mt-1 text-xs text-muted">Données calculées à partir des enregistrements de la base, sans estimation.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="border border-line bg-white p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Biens</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{totalProperties}</p>
        </div>
        <div className="border border-line bg-white p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Demandes</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{totalLeads}</p>
        </div>
        <div className="border border-line bg-white p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Conversion</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{totalLeads ? Math.round((converted / totalLeads) * 100) : 0}%</p>
        </div>
        <div className="border border-line bg-white p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Visites effectuées</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{completedViewings}/{totalViewings}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Inventaire par catégorie</h2>
          <div className="mt-4"><BarList rows={data.byCategory} total={totalProperties} /></div>
        </section>
        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Inventaire par ville</h2>
          <div className="mt-4"><BarList rows={data.byCity} total={totalProperties} /></div>
        </section>
        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Demandes par source</h2>
          <div className="mt-4"><BarList rows={data.leadBySource.map((r) => ({ label: r.label, count: r.count }))} total={totalLeads} /></div>
        </section>
        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Demandes par statut</h2>
          <div className="mt-4">
            <BarList rows={data.leadByStatus.map((r) => ({ label: LEAD_LABEL_FR[r.label] ?? r.label, count: r.count }))} total={totalLeads} />
          </div>
        </section>
        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Résultats des visites</h2>
          <div className="mt-4"><BarList rows={data.appointmentByStatus} total={totalViewings} /></div>
        </section>
        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Charge de l&apos;équipe (demandes assignées)</h2>
          <div className="mt-4"><BarList rows={data.staffWorkload} total={totalLeads} /></div>
        </section>
        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Pipeline de sourcing</h2>
          <div className="mt-4"><BarList rows={data.stageCounts} total={data.stageCounts.reduce((s, r) => s + r.count, 0)} /></div>
        </section>
        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Variations de prix journalisées</h2>
          <p className="mt-4 font-display text-4xl tabular-nums">{data.priceChanges}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Les prix affichés sur le site sont des prix demandés. Ils ne constituent pas des transactions confirmées.
          </p>
        </section>
      </div>

      <p className="mt-6 border border-line bg-white p-4 text-[11px] leading-relaxed text-muted">
        Les rapports n&apos;utilisent que les données saisies dans la plateforme. Aucune moyenne de marché, aucun prix de
        transaction et aucune projection ne sont inventés. Les données de marché réelles doivent provenir d&apos;une source
        vérifiée et être clairement séparées des prix demandés.
      </p>
    </div>
  );
}
