import Link from "next/link";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; q?: string; page?: string }>;
}) {
  await requireStaffPage("audit.read");
  const flags = await searchParams;
  const page = Math.max(1, Number(flags.page ?? 1));
  const perPage = 50;

  const where = {
    ...(flags.action ? { action: { contains: flags.action } } : {}),
    ...(flags.q ? { OR: [{ summary: { contains: flags.q } }, { entityId: { contains: flags.q } }] } : {}),
  };

  const [total, entries, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { actor: { select: { fullName: true, email: true } } },
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true } }),
  ]);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Administration</p>
      <h1 className="mt-1 font-display text-3xl">Journal d&apos;audit</h1>
      <p className="mt-1 text-xs text-muted">
        Publication, prix, archivage, rôles et actions sensibles. Les entrées ne sont jamais modifiables depuis l&apos;interface.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/admin/audit" className={`badge ${!flags.action ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"}`}>Tout · {total}</Link>
        {actions.slice(0, 10).map((row) => (
          <Link key={row.action} href={`/admin/audit?action=${row.action}`} className={`badge ${flags.action === row.action ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"}`}>
            {row.action} · {row._count._all}
          </Link>
        ))}
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3 border border-line bg-white p-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="label">Recherche</label>
          <input id="q" name="q" defaultValue={flags.q ?? ""} className="field" placeholder="Résumé ou identifiant…" />
        </div>
        <div>
          <label htmlFor="action" className="label">Action</label>
          <input id="action" name="action" defaultValue={flags.action ?? ""} className="field" placeholder="property.publish" />
        </div>
        <button type="submit" className="btn-outline">Filtrer</button>
      </form>

      <div className="mt-5 overflow-x-auto border border-line bg-white">
        <table className="table-admin min-w-[900px]">
          <thead>
            <tr className="text-start">
              <th>Date</th>
              <th>Auteur</th>
              <th>Action</th>
              <th>Objet</th>
              <th>Résumé</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap text-[11px] text-muted">{formatDateTime(entry.createdAt, "fr")}</td>
                <td className="text-[11px]">
                  {entry.actor?.fullName ?? "Système / public"}
                  {entry.actor?.email ? <p className="text-[10px] text-muted">{entry.actor.email}</p> : null}
                </td>
                <td className="text-[11px]"><span className="badge-muted">{entry.action}</span></td>
                <td className="text-[10px] text-muted">{entry.entityType}</td>
                <td className="max-w-[420px] text-[11px]">{entry.summary}</td>
              </tr>
            ))}
            {!entries.length ? <tr><td colSpan={5} className="py-10 text-center text-sm text-muted">Aucun événement.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <Link href={`/admin/audit?page=${Math.max(1, page - 1)}${flags.action ? `&action=${flags.action}` : ""}`} className={`btn-outline btn-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>
          Précédent
        </Link>
        <span className="text-muted">Page {page} · {total} entrée(s)</span>
        <Link href={`/admin/audit?page=${page + 1}${flags.action ? `&action=${flags.action}` : ""}`} className={`btn-outline btn-sm ${page * perPage >= total ? "pointer-events-none opacity-40" : ""}`}>
          Suivant
        </Link>
      </div>
    </div>
  );
}
