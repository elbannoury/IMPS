import { Notice } from "@/components/ui";
import { deactivateCategoryAction, saveCategoryAction, toggleAmenityAction } from "@/app/actions/taxonomy";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const KIND_FR: Record<string, string> = { residential: "Résidentiel", commercial: "Commercial", land: "Terrains", development: "Programme" };

export default async function TaxonomyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaffPage("taxonomy.manage");
  const flags = await searchParams;

  const [categories, amenities] = await Promise.all([
    prisma.propertyCategory.findMany({
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      include: { _count: { select: { properties: true } } },
    }),
    prisma.amenity.findMany({ orderBy: [{ group: "asc" }, { labelFr: "asc" }], include: { _count: { select: { properties: true } } } }),
  ]);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Référentiels</p>
      <h1 className="mt-1 font-display text-3xl">Catégories & équipements</h1>
      <p className="mt-1 text-xs text-muted">Une catégorie utilisée ne peut pas être supprimée : elle est désactivée pour préserver les biens.</p>

      {flags.saved ? <div className="mt-4"><Notice tone="success">Référentiel enregistré.</Notice></div> : null}
      {flags.deactivated ? <div className="mt-4"><Notice tone="warning">Catégorie utilisée : elle a été désactivée (les biens existants sont conservés).</Notice></div> : null}
      {flags.deleted ? <div className="mt-4"><Notice tone="success">Catégorie inutilisée supprimée.</Notice></div> : null}
      {flags.error === "INVALID" ? <div className="mt-4"><Notice tone="warning">Formulaire invalide.</Notice></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="border border-line bg-white">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Catégories de biens</h2>
            <span className="text-[10px] text-muted">{categories.length}</span>
          </header>
          <div className="divide-y divide-line">
            {categories.map((category) => (
              <details key={category.id} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium">
                      {category.nameFr} <span className="text-[11px] text-muted">/ {category.nameAr}</span>
                    </p>
                    <p className="text-[10px] text-muted">
                      {KIND_FR[category.kind] ?? category.kind} · /{category.slug} · {category._count.properties} bien(s)
                      {category.isActive ? "" : " · désactivée"}
                    </p>
                  </div>
                  <span className={`badge ${category.isActive ? "border-ink bg-ink text-white" : "border-line bg-soft text-muted"}`}>
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                </summary>
                <div className="border-t border-line bg-soft/40 p-4">
                  <form action={saveCategoryAction} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={category.id} />
                    <div>
                      <label className="label" htmlFor={`nameFr-${category.id}`}>Nom (FR)</label>
                      <input id={`nameFr-${category.id}`} name="nameFr" defaultValue={category.nameFr} className="field" required />
                    </div>
                    <div>
                      <label className="label" htmlFor={`nameAr-${category.id}`}>Nom (AR)</label>
                      <input id={`nameAr-${category.id}`} name="nameAr" defaultValue={category.nameAr} dir="rtl" className="field" required />
                    </div>
                    <div>
                      <label className="label" htmlFor={`kind-${category.id}`}>Famille</label>
                      <select id={`kind-${category.id}`} name="kind" defaultValue={category.kind} className="field">
                        {Object.entries(KIND_FR).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`sort-${category.id}`}>Ordre</label>
                      <input id={`sort-${category.id}`} name="sortOrder" type="number" defaultValue={category.sortOrder} className="field" />
                    </div>
                    <label className="flex items-center gap-2 text-[12px]">
                      <input type="checkbox" name="isActive" defaultChecked={category.isActive} className="h-4 w-4 accent-[#111111]" />
                      Active
                    </label>
                    <div className="flex items-end gap-2">
                      <button type="submit" className="btn-primary btn-sm">Enregistrer</button>
                    </div>
                  </form>
                  <form action={deactivateCategoryAction} className="mt-2">
                    <input type="hidden" name="id" value={category.id} />
                    <button type="submit" className="btn-ghost btn-sm text-muted">
                      {category.isActive ? (category._count.properties ? "Désactiver" : "Supprimer (inutilisée)") : "Supprimer / réactiver"}
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Nouvelle catégorie</h2>
            </header>
            <form action={saveCategoryAction} className="space-y-2 p-4">
              <div>
                <label htmlFor="new-nameFr" className="label">Nom (FR)</label>
                <input id="new-nameFr" name="nameFr" required className="field" />
              </div>
              <div>
                <label htmlFor="new-nameAr" className="label">Nom (AR)</label>
                <input id="new-nameAr" name="nameAr" required dir="rtl" className="field" />
              </div>
              <div>
                <label htmlFor="new-kind" className="label">Famille</label>
                <select id="new-kind" name="kind" className="field">
                  {Object.entries(KIND_FR).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full">Créer</button>
            </form>
          </section>

          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Équipements</h2>
            </header>
            <ul className="divide-y divide-line">
              {amenities.map((amenity) => (
                <li key={amenity.id} className="flex items-center justify-between gap-2 px-4 py-2">
                  <div>
                    <p className="text-[12px]">{amenity.labelFr}</p>
                    <p className="text-[10px] text-muted">{amenity.group} · {amenity._count.properties} bien(s)</p>
                  </div>
                  <form action={toggleAmenityAction}>
                    <input type="hidden" name="id" value={amenity.id} />
                    <button type="submit" className="btn-outline btn-sm">{amenity.isActive ? "Désactiver" : "Activer"}</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
