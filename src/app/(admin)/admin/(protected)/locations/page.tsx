import { Notice } from "@/components/ui";
import { saveCityAction, saveNeighborhoodAction } from "@/app/actions/taxonomy";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaffPage("location.manage");
  const flags = await searchParams;

  const cities = await prisma.city.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }],
    include: {
      neighborhoods: { orderBy: { nameFr: "asc" }, include: { _count: { select: { properties: true } } } },
      _count: { select: { properties: true } },
    },
  });

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Référentiels</p>
      <h1 className="mt-1 font-display text-3xl">Villes & quartiers</h1>
      <p className="mt-1 text-xs text-muted">Les pages villes ne sont indexées que si elles sont publiées et contiennent des biens publiés.</p>

      {flags.saved ? <div className="mt-4"><Notice tone="success">Localisation enregistrée.</Notice></div> : null}
      {flags.error === "INVALID" ? <div className="mt-4"><Notice tone="warning">Formulaire invalide.</Notice></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="border border-line bg-white">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Villes ({cities.length})</h2>
          </header>
          <div className="divide-y divide-line">
            {cities.map((city) => (
              <details key={city.id}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium">{city.nameFr} <span className="text-muted">/ {city.nameAr}</span></p>
                    <p className="text-[10px] text-muted">
                      {city.region ?? "—"} · {city._count.properties} bien(s) · {city.neighborhoods.length} quartier(s)
                      {city.isPublished ? "" : " · non publiée"}
                    </p>
                  </div>
                  <span className={`badge ${city.isPublished ? "border-ink bg-ink text-white" : "border-line bg-soft text-muted"}`}>
                    {city.isPublished ? "Publiée" : "Masquée"}
                  </span>
                </summary>
                <div className="space-y-4 border-t border-line bg-soft/40 p-4">
                  <form action={saveCityAction} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={city.id} />
                    <div>
                      <label className="label" htmlFor={`city-fr-${city.id}`}>Nom (FR)</label>
                      <input id={`city-fr-${city.id}`} name="nameFr" defaultValue={city.nameFr} required className="field" />
                    </div>
                    <div>
                      <label className="label" htmlFor={`city-ar-${city.id}`}>Nom (AR)</label>
                      <input id={`city-ar-${city.id}`} name="nameAr" defaultValue={city.nameAr} required dir="rtl" className="field" />
                    </div>
                    <div>
                      <label className="label" htmlFor={`city-region-${city.id}`}>Région</label>
                      <input id={`city-region-${city.id}`} name="region" defaultValue={city.region ?? ""} className="field" />
                    </div>
                    <div>
                      <label className="label" htmlFor={`city-order-${city.id}`}>Ordre</label>
                      <input id={`city-order-${city.id}`} name="sortOrder" type="number" defaultValue={city.sortOrder} className="field" />
                    </div>
                    <div>
                      <label className="label" htmlFor={`city-lat-${city.id}`}>Latitude</label>
                      <input id={`city-lat-${city.id}`} name="latitude" type="number" step="0.000001" defaultValue={city.latitude ?? ""} className="field" />
                    </div>
                    <div>
                      <label className="label" htmlFor={`city-lng-${city.id}`}>Longitude</label>
                      <input id={`city-lng-${city.id}`} name="longitude" type="number" step="0.000001" defaultValue={city.longitude ?? ""} className="field" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor={`city-desc-${city.id}`}>Description (FR)</label>
                      <textarea id={`city-desc-${city.id}`} name="descriptionFr" rows={2} defaultValue={city.descriptionFr ?? ""} className="field" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor={`city-desc-ar-${city.id}`}>Description (AR)</label>
                      <textarea id={`city-desc-ar-${city.id}`} name="descriptionAr" rows={2} defaultValue={city.descriptionAr ?? ""} dir="rtl" className="field" />
                    </div>
                    <label className="flex items-center gap-2 text-[12px]">
                      <input type="checkbox" name="isPublished" defaultChecked={city.isPublished} className="h-4 w-4 accent-[#111111]" /> Publiée
                    </label>
                    <div className="flex items-end">
                      <button type="submit" className="btn-primary btn-sm">Enregistrer</button>
                    </div>
                  </form>

                  <div className="border-t border-line pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Quartiers</p>
                    <ul className="mt-2 space-y-1">
                      {city.neighborhoods.map((hood) => (
                        <li key={hood.id} className="flex items-center justify-between gap-2 text-[12px]">
                          <span>{hood.nameFr} <span className="text-muted">/ {hood.nameAr}</span> · {hood._count.properties}</span>
                        </li>
                      ))}
                      {!city.neighborhoods.length ? <li className="text-[11px] text-muted">Aucun quartier.</li> : null}
                    </ul>
                    <form action={saveNeighborhoodAction} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="cityId" value={city.id} />
                      <input name="nameFr" placeholder="Quartier (FR)" required className="field w-40" />
                      <input name="nameAr" placeholder="الحي" required dir="rtl" className="field w-40" />
                      <button type="submit" className="btn-outline btn-sm">Ajouter</button>
                    </form>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <aside className="border border-line bg-white">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Nouvelle ville</h2>
          </header>
          <form action={saveCityAction} className="space-y-2 p-4">
            <div>
              <label htmlFor="new-city-fr" className="label">Nom (FR)</label>
              <input id="new-city-fr" name="nameFr" required className="field" />
            </div>
            <div>
              <label htmlFor="new-city-ar" className="label">Nom (AR)</label>
              <input id="new-city-ar" name="nameAr" required dir="rtl" className="field" />
            </div>
            <div>
              <label htmlFor="new-city-region" className="label">Région</label>
              <input id="new-city-region" name="region" className="field" />
            </div>
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4 accent-[#111111]" /> Publier
            </label>
            <button type="submit" className="btn-primary w-full">Créer la ville</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
