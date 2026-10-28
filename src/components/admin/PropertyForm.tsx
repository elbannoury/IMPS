import type { Amenity, City, Profile, PropertyCategory, Neighborhood } from "@prisma/client";

type Options = {
  categories: PropertyCategory[];
  cities: (City & { neighborhoods: Neighborhood[] })[];
  amenities: Amenity[];
  staff: { id: string; fullName: string }[];
};

type Values = {
  id?: string;
  titleFr?: string;
  titleAr?: string | null;
  descriptionFr?: string;
  descriptionAr?: string | null;
  categoryId?: string;
  transactionType?: string;
  cityId?: string;
  neighborhoodId?: string | null;
  addressLine?: string | null;
  locationPrecision?: string;
  latitude?: number | null;
  longitude?: number | null;
  builtArea?: number | null;
  landArea?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floors?: number | null;
  floorNumber?: number | null;
  parkingSpaces?: number | null;
  yearBuilt?: number | null;
  condition?: string | null;
  furnished?: boolean | null;
  streetFrontage?: number | null;
  occupancyStatus?: string | null;
  publicationPermission?: string;
  dataSource?: string | null;
  internalNotes?: string | null;
  assignedToId?: string | null;
  metaTitleFr?: string | null;
  metaDescriptionFr?: string | null;
  metaTitleAr?: string | null;
  metaDescriptionAr?: string | null;
  price?: number | null;
  rentPeriod?: string | null;
  isFeatured?: boolean;
  amenityIds?: string[];
};

export function PropertyForm({
  action,
  options,
  values = {},
  submitLabel,
  canFeature = true,
}: {
  action: (formData: FormData) => void | Promise<void>;
  options: Options;
  values?: Values;
  submitLabel: string;
  canFeature?: boolean;
}) {
  const v = values;
  const kindLabel: Record<string, string> = { residential: "Résidentiel", commercial: "Commercial", land: "Terrains", development: "Programmes" };
  const amenityGroups = Array.from(new Set(options.amenities.map((a) => a.group)));

  return (
    <form action={action} className="space-y-6">
      {v.id ? <input type="hidden" name="propertyId" value={v.id} /> : null}

      <section className="border border-line bg-white">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Identité du bien</h2>
        </header>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="titleFr" className="label">Titre (français) *</label>
            <input id="titleFr" name="titleFr" required defaultValue={v.titleFr ?? ""} maxLength={140} className="field" placeholder="Appartement lumineux 3 chambres — Anfa" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="titleAr" className="label">Titre (العربية)</label>
            <input id="titleAr" name="titleAr" defaultValue={v.titleAr ?? ""} maxLength={140} dir="rtl" className="field" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="descriptionFr" className="label">Description (français) * — min. 40 caractères</label>
            <textarea id="descriptionFr" name="descriptionFr" required defaultValue={v.descriptionFr ?? ""} rows={6} className="field" />
            <p className="mt-1 text-[10px] text-muted">N&apos;affirmez jamais une vérification juridique qui n&apos;a pas été effectuée.</p>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="descriptionAr" className="label">Description (العربية)</label>
            <textarea id="descriptionAr" name="descriptionAr" defaultValue={v.descriptionAr ?? ""} rows={5} dir="rtl" className="field" />
          </div>
        </div>
      </section>

      <section className="border border-line bg-white">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Classification et localisation</h2>
        </header>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label htmlFor="transactionType" className="label">Transaction *</label>
            <select id="transactionType" name="transactionType" defaultValue={v.transactionType ?? "sale"} className="field">
              <option value="sale">Vente</option>
              <option value="rent">Location</option>
            </select>
          </div>
          <div>
            <label htmlFor="categoryId" className="label">Catégorie *</label>
            <select id="categoryId" name="categoryId" required defaultValue={v.categoryId ?? ""} className="field">
              <option value="">—</option>
              {["residential", "commercial", "land", "development"].map((kind) => (
                <optgroup key={kind} label={kindLabel[kind]}>
                  {options.categories
                    .filter((c) => c.kind === kind && c.isActive)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nameFr}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cityId" className="label">Ville *</label>
            <select id="cityId" name="cityId" required defaultValue={v.cityId ?? ""} className="field">
              <option value="">—</option>
              {options.cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nameFr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="neighborhoodId" className="label">Quartier</label>
            <select id="neighborhoodId" name="neighborhoodId" defaultValue={v.neighborhoodId ?? ""} className="field">
              <option value="">—</option>
              {options.cities.map((city) => (
                <optgroup key={city.id} label={city.nameFr}>
                  {city.neighborhoods.map((hood) => (
                    <option key={hood.id} value={hood.id}>
                      {hood.nameFr}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="locationPrecision" className="label">Précision de la localisation</label>
            <select id="locationPrecision" name="locationPrecision" defaultValue={v.locationPrecision ?? "approximate"} className="field">
              <option value="exact">Exacte (adresse publiée)</option>
              <option value="approximate">Approximative</option>
              <option value="city_only">Ville uniquement</option>
            </select>
          </div>
          <div>
            <label htmlFor="addressLine" className="label">Adresse interne (non publiée si approximative)</label>
            <input id="addressLine" name="addressLine" defaultValue={v.addressLine ?? ""} className="field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="latitude" className="label">Latitude</label>
              <input id="latitude" name="latitude" type="number" step="0.000001" defaultValue={v.latitude ?? ""} className="field tabular-nums" />
            </div>
            <div>
              <label htmlFor="longitude" className="label">Longitude</label>
              <input id="longitude" name="longitude" type="number" step="0.000001" defaultValue={v.longitude ?? ""} className="field tabular-nums" />
            </div>
          </div>
        </div>
      </section>

      <section className="border border-line bg-white">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Caractéristiques</h2>
        </header>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "builtArea", label: "Surface bâtie (m²)", value: v.builtArea },
            { name: "landArea", label: "Surface terrain (m²)", value: v.landArea },
            { name: "bedrooms", label: "Chambres", value: v.bedrooms },
            { name: "bathrooms", label: "Salles de bain", value: v.bathrooms },
            { name: "floors", label: "Nombre de niveaux", value: v.floors },
            { name: "floorNumber", label: "Étage", value: v.floorNumber },
            { name: "parkingSpaces", label: "Parkings", value: v.parkingSpaces },
            { name: "yearBuilt", label: "Année de construction", value: v.yearBuilt },
            { name: "streetFrontage", label: "Vitrine (m)", value: v.streetFrontage },
          ].map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="label">{field.label}</label>
              <input id={field.name} name={field.name} type="number" min={0} defaultValue={field.value ?? ""} className="field tabular-nums" />
            </div>
          ))}
          <div>
            <label htmlFor="condition" className="label">État</label>
            <select id="condition" name="condition" defaultValue={v.condition ?? ""} className="field">
              <option value="">—</option>
              <option value="new">Neuf</option>
              <option value="excellent">Excellent</option>
              <option value="good">Bon</option>
              <option value="needs_work">À rénover</option>
            </select>
          </div>
          <div>
            <label htmlFor="furnished" className="label">Meublé</label>
            <select id="furnished" name="furnished" defaultValue={v.furnished === null || v.furnished === undefined ? "" : String(v.furnished)} className="field">
              <option value="">Non renseigné</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="occupancyStatus" className="label">Occupation actuelle</label>
            <input id="occupancyStatus" name="occupancyStatus" defaultValue={v.occupancyStatus ?? ""} placeholder="Vacant, occupé par le propriétaire…" className="field" />
          </div>
        </div>
      </section>

      <section className="border border-line bg-white">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Prix</h2>
        </header>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="price" className="label">Prix demandé (MAD) *</label>
            <input id="price" name="price" type="number" min={1} required defaultValue={v.price ?? ""} className="field tabular-nums" />
            <p className="mt-1 text-[10px] text-muted">Une modification de prix est journalisée et nécessite la permission dédiée.</p>
          </div>
          <div>
            <label htmlFor="rentPeriod" className="label">Période (location)</label>
            <select id="rentPeriod" name="rentPeriod" defaultValue={v.rentPeriod ?? ""} className="field">
              <option value="">—</option>
              <option value="month">Par mois</option>
              <option value="day">Par jour</option>
              <option value="year">Par an</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 pb-3 text-[13px]">
              <input type="checkbox" name="isFeatured" defaultChecked={v.isFeatured ?? false} disabled={!canFeature} className="h-4 w-4 accent-[#111111]" />
              Mettre en vedette
            </label>
          </div>
        </div>
      </section>

      <section className="border border-line bg-white">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Équipements</h2>
        </header>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {amenityGroups.map((group) => (
            <div key={group}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{group}</p>
              <div className="space-y-1.5">
                {options.amenities
                  .filter((a) => a.group === group && a.isActive)
                  .map((amenity) => (
                    <label key={amenity.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                      <input type="checkbox" name="amenityIds" value={amenity.id} defaultChecked={v.amenityIds?.includes(amenity.id)} className="h-4 w-4 accent-[#111111]" />
                      {amenity.labelFr}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-line bg-white">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Publication et interne</h2>
        </header>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label htmlFor="publicationPermission" className="label">Autorisation de publier *</label>
            <select id="publicationPermission" name="publicationPermission" defaultValue={v.publicationPermission ?? "none"} className="field">
              <option value="none">Aucune</option>
              <option value="verbal">Verbale</option>
              <option value="written">Écrite</option>
              <option value="documented">Documentée (mandat)</option>
            </select>
          </div>
          <div>
            <label htmlFor="assignedToId" className="label">Responsable</label>
            <select id="assignedToId" name="assignedToId" defaultValue={v.assignedToId ?? ""} className="field">
              <option value="">—</option>
              {options.staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="dataSource" className="label">Source de l&apos;information (interne)</label>
            <input id="dataSource" name="dataSource" defaultValue={v.dataSource ?? ""} placeholder="Appel propriétaire, agence…" className="field" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="internalNotes" className="label">Notes internes — jamais publiées</label>
            <textarea id="internalNotes" name="internalNotes" defaultValue={v.internalNotes ?? ""} rows={4} className="field" />
          </div>
          <div>
            <label htmlFor="metaTitleFr" className="label">Meta title (FR)</label>
            <input id="metaTitleFr" name="metaTitleFr" defaultValue={v.metaTitleFr ?? ""} maxLength={180} className="field" />
          </div>
          <div>
            <label htmlFor="metaDescriptionFr" className="label">Meta description (FR)</label>
            <input id="metaDescriptionFr" name="metaDescriptionFr" defaultValue={v.metaDescriptionFr ?? ""} maxLength={320} className="field" />
          </div>
          <div>
            <label htmlFor="metaTitleAr" className="label">Meta title (AR)</label>
            <input id="metaTitleAr" name="metaTitleAr" defaultValue={v.metaTitleAr ?? ""} maxLength={180} dir="rtl" className="field" />
          </div>
          <div>
            <label htmlFor="metaDescriptionAr" className="label">Meta description (AR)</label>
            <input id="metaDescriptionAr" name="metaDescriptionAr" defaultValue={v.metaDescriptionAr ?? ""} maxLength={320} dir="rtl" className="field" />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        <span className="text-[11px] text-muted">Les champs marqués * sont requis avant publication.</span>
      </div>
    </form>
  );
}

export type { Options as PropertyFormOptions };
export type { Profile };
