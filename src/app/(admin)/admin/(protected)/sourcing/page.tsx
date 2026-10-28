import Link from "next/link";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { STAGE_LABEL_FR } from "@/lib/status";
import { createSourcingLeadAction } from "@/app/actions/sourcing";
import { Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SourcingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; stage?: string; error?: string }>;
}) {
  await requireStaffPage("sourcing.manage");
  const flags = await searchParams;

  const [leads, cities, categories, staff] = await Promise.all([
    prisma.propertyLead.findMany({
      where: flags.stage ? { stage: flags.stage } : {},
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
      take: 100,
      include: {
        city: { select: { nameFr: true } },
        category: { select: { nameFr: true } },
        assignedTo: { select: { fullName: true } },
        ownerContacts: { take: 1 },
        _count: { select: { attempts: true } },
      },
    }),
    prisma.city.findMany({ where: { isPublished: true }, orderBy: { nameFr: "asc" }, select: { id: true, nameFr: true } }),
    prisma.propertyCategory.findMany({ where: { isActive: true }, orderBy: { nameFr: "asc" }, select: { id: true, nameFr: true } }),
    prisma.profile.findMany({ where: { isStaff: true, isActive: true }, select: { id: true, fullName: true } }),
  ]);

  const stages = ["discovered", "contacted", "collecting", "verification", "review", "approved", "published", "rejected", "unresponsive", "duplicate", "not_authorized", "unavailable"];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations</p>
          <h1 className="mt-1 font-display text-3xl">Sourcing</h1>
          <p className="mt-1 text-xs text-muted">Pistes de biens, contacts propriétaires et collecte d&apos;informations.</p>
        </div>
        <Link href="/admin/sourcing?new=1" className="btn-primary btn-sm">Nouvelle piste</Link>
      </div>

      {flags.error === "INVALID" ? <div className="mt-4"><Notice tone="warning">Titre trop court. Renseignez au moins un titre descriptif.</Notice></div> : null}

      {flags.new ? (
        <section className="mt-6 border border-line bg-white">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Nouvelle piste</h2>
          </header>
          <form action={createSourcingLeadAction} className="grid gap-3 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="title" className="label">Titre / description courte *</label>
              <input id="title" name="title" required className="field" placeholder="Appartement 3 chambres — Anfa" />
            </div>
            <div>
              <label htmlFor="sourceType" className="label">Source</label>
              <select id="sourceType" name="sourceType" className="field">
                <option value="owner">Propriétaire</option>
                <option value="agency">Agence</option>
                <option value="developer">Promoteur</option>
                <option value="referral">Recommandation</option>
                <option value="walk_in">Visite spontanée</option>
                <option value="web">Web</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label htmlFor="assignedToId" className="label">Responsable</label>
              <select id="assignedToId" name="assignedToId" className="field">
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>{member.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cityId" className="label">Ville</label>
              <select id="cityId" name="cityId" className="field">
                <option value="">—</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.nameFr}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="categoryId" className="label">Catégorie</label>
              <select id="categoryId" name="categoryId" className="field">
                <option value="">—</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.nameFr}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="transactionType" className="label">Transaction</label>
              <select id="transactionType" name="transactionType" className="field">
                <option value="sale">Vente</option>
                <option value="rent">Location</option>
              </select>
            </div>
            <div>
              <label htmlFor="askingPrice" className="label">Prix demandé (MAD)</label>
              <input id="askingPrice" name="askingPrice" type="number" min={0} className="field tabular-nums" />
            </div>
            <div>
              <label htmlFor="ownerName" className="label">Contact propriétaire — nom</label>
              <input id="ownerName" name="ownerName" className="field" />
            </div>
            <div>
              <label htmlFor="ownerPhone" className="label">Téléphone (confidentiel)</label>
              <input id="ownerPhone" name="ownerPhone" className="field" dir="ltr" />
            </div>
            <div>
              <label htmlFor="nextFollowUpAt" className="label">Prochaine relance</label>
              <input id="nextFollowUpAt" name="nextFollowUpAt" type="date" className="field" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="internalNotes" className="label">Notes internes</label>
              <textarea id="internalNotes" name="internalNotes" rows={3} className="field" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">Créer la piste</button>
            </div>
          </form>
        </section>
      ) : null}

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 border border-line bg-white p-3">
        <div>
          <label htmlFor="stage" className="label">Étape</label>
          <select id="stage" name="stage" defaultValue={flags.stage ?? ""} className="field min-w-[180px]">
            <option value="">Toutes</option>
            {stages.map((stage) => (
              <option key={stage} value={stage}>{STAGE_LABEL_FR[stage] ?? stage}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-outline">Filtrer</button>
        <Link href="/admin/sourcing" className="btn-ghost">Réinitialiser</Link>
      </form>

      <div className="mt-5 overflow-x-auto border border-line bg-white">
        <table className="table-admin min-w-[900px]">
          <thead>
            <tr>
              <th>Piste</th>
              <th>Étape</th>
              <th>Prix demandé</th>
              <th>Propriétaire</th>
              <th>Responsable</th>
              <th>Relance</th>
              <th>Contacts</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link href={`/admin/sourcing/${lead.id}`} className="font-medium hover:underline">{lead.code}</Link>
                  <p className="max-w-[260px] truncate text-[11px] text-muted">{lead.title}</p>
                  <p className="text-[10px] text-muted">{lead.city?.nameFr ?? "—"} · {lead.category?.nameFr ?? "—"}</p>
                </td>
                <td><span className="badge-muted">{STAGE_LABEL_FR[lead.stage] ?? lead.stage}</span></td>
                <td className="text-[12px] tabular-nums">{formatPrice(lead.askingPrice, "fr")}</td>
                <td className="text-[11px]">
                  {lead.ownerContacts[0]?.name ?? "—"}
                  {lead.ownerContacts[0]?.phone ? <p className="text-muted" dir="ltr">{lead.ownerContacts[0].phone}</p> : null}
                </td>
                <td className="text-[12px]">{lead.assignedTo?.fullName ?? "—"}</td>
                <td className="text-[11px]">{formatDate(lead.nextFollowUpAt, "fr")}</td>
                <td className="text-[12px] tabular-nums">{lead._count.attempts}</td>
                <td className="text-end"><Link href={`/admin/sourcing/${lead.id}`} className="btn-outline btn-sm">Ouvrir</Link></td>
              </tr>
            ))}
            {!leads.length ? (
              <tr><td colSpan={8} className="py-10 text-center text-sm text-muted">Aucune piste pour ce filtre.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
