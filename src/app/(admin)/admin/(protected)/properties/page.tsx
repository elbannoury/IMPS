import Link from "next/link";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getAdminProperties } from "@/lib/queries";
import { STATUS_LABEL_FR } from "@/lib/status";
import { StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; archived?: string; deleted?: string }>;
}) {
  await requireStaffPage("property.read");
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const [result, categories] = await Promise.all([
    getAdminProperties({ q: params.q, status: params.status, page, perPage: 20 }),
    prisma.propertyCategory.findMany({ orderBy: { nameFr: "asc" }, select: { id: true, nameFr: true } }),
  ]);

  const statuses = ["draft", "in_review", "published", "reserved", "sold", "rented", "unavailable", "expired", "archived", "rejected"];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations</p>
          <h1 className="mt-1 font-display text-3xl">Biens</h1>
          <p className="mt-1 text-xs text-muted">{result.total} bien(s) — les archives et brouillons sont inclus.</p>
        </div>
        <Link href="/admin/properties/new" className="btn-primary btn-sm">
          Nouveau bien
        </Link>
      </div>

      {params.archived ? <p className="mt-4 border border-line bg-white px-3 py-2 text-xs">Bien archivé. Les demandes et l&apos;audit sont conservés.</p> : null}
      {params.deleted ? <p className="mt-4 border border-line bg-white px-3 py-2 text-xs">Brouillon supprimé définitivement (aucune demande associée).</p> : null}

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 border border-line bg-white p-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="label">Recherche</label>
          <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Référence, titre, URL…" className="field" />
        </div>
        <div>
          <label htmlFor="status" className="label">Statut</label>
          <select id="status" name="status" defaultValue={params.status ?? ""} className="field min-w-[160px]">
            <option value="">Tous</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL_FR[status] ?? status}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-outline">Filtrer</button>
        <Link href="/admin/properties" className="btn-ghost">Réinitialiser</Link>
      </form>

      <div className="mt-5 overflow-x-auto border border-line bg-white">
        <table className="table-admin min-w-[980px]">
          <thead>
            <tr>
              <th>Bien</th>
              <th>Statut</th>
              <th>Transaction</th>
              <th>Prix</th>
              <th>Catégorie</th>
              <th>Responsable</th>
              <th>Médias</th>
              <th>Demandes</th>
              <th>Mise à jour</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/admin/properties/${row.id}`} className="font-medium hover:underline">
                    {row.reference}
                  </Link>
                  <p className="max-w-[280px] truncate text-[11px] text-muted">{row.titleFr}</p>
                  <p className="text-[10px] text-muted">{row.city.nameFr} · {row.category.nameFr}</p>
                </td>
                <td>
                  <StatusPill status={row.status} label={STATUS_LABEL_FR[row.status] ?? row.status} />
                  {row.isSample ? <span className="ms-1 badge-muted">Démo</span> : null}
                </td>
                <td className="text-[12px]">{row.transactionType === "rent" ? "Location" : "Vente"}</td>
                <td className="whitespace-nowrap text-[12px] tabular-nums">
                  {formatPrice(row.primaryPrice, "fr", { period: row.primaryRentPeriod, suffix: row.transactionType === "rent" })}
                </td>
                <td className="text-[12px]">{row.category.nameFr}</td>
                <td className="text-[12px]">{row.assignedTo?.fullName ?? "—"}</td>
                <td className="text-[12px] tabular-nums">{row._count.media}</td>
                <td className="text-[12px] tabular-nums">{row._count.leads}</td>
                <td className="whitespace-nowrap text-[11px] text-muted">{formatDateTime(row.updatedAt, "fr")}</td>
                <td className="text-end">
                  <Link href={`/admin/properties/${row.id}`} className="btn-outline btn-sm">Ouvrir</Link>
                </td>
              </tr>
            ))}
            {!result.rows.length ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-sm text-muted">Aucun bien ne correspond à ce filtre.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {result.totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-between text-xs">
          <Link
            href={`/admin/properties?page=${Math.max(1, result.page - 1)}${params.status ? `&status=${params.status}` : ""}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
            className={`btn-outline btn-sm ${result.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Précédent
          </Link>
          <span className="text-muted">Page {result.page} / {result.totalPages}</span>
          <Link
            href={`/admin/properties?page=${Math.min(result.totalPages, result.page + 1)}${params.status ? `&status=${params.status}` : ""}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
            className={`btn-outline btn-sm ${result.page >= result.totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            Suivant
          </Link>
        </nav>
      ) : null}
      <p className="mt-3 text-[10px] text-muted">{categories.length} catégories actives — gérez-les dans Catégories.</p>
    </div>
  );
}
