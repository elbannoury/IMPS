import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaManager } from "@/components/admin/MediaManager";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { Notice, StatusPill } from "@/components/ui";
import { hasPermission, requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { missingPublishFields } from "@/lib/validation";
import { STATUS_LABEL_FR } from "@/lib/status";
import {
  addVerificationAction,
  archivePropertyAction,
  changeStatusAction,
  confirmAvailabilityAction,
  deleteDraftAction,
  duplicatePropertyAction,
  restorePropertyAction,
  reviewDecisionAction,
  submitReviewAction,
  updatePropertyAction,
} from "@/app/actions/properties";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireStaffPage("property.read");
  const { id } = await params;
  const flags = await searchParams;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      offers: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
      media: { orderBy: { sortOrder: "asc" } },
      amenities: true,
      verifications: { orderBy: { verifiedAt: "desc" }, include: { verifiedBy: { select: { fullName: true } } } },
      reviews: { orderBy: { createdAt: "desc" }, take: 8, include: { reviewer: { select: { fullName: true } }, submittedBy: { select: { fullName: true } } } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 12 },
      assignedTo: { select: { fullName: true } },
      _count: { select: { leads: true, appointments: true } },
    },
  });
  if (!property) notFound();

  const [categories, cities, amenities, staff] = await Promise.all([
    prisma.propertyCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ where: { isPublished: true }, orderBy: { nameFr: "asc" }, include: { neighborhoods: { orderBy: { nameFr: "asc" } } } }),
    prisma.amenity.findMany({ where: { isActive: true }, orderBy: [{ group: "asc" }, { labelFr: "asc" }] }),
    prisma.profile.findMany({ where: { isStaff: true, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  const activeOffer = property.offers[0];
  const missing = missingPublishFields({
    titleFr: property.titleFr,
    descriptionFr: property.descriptionFr,
    categoryId: property.categoryId,
    cityId: property.cityId,
    price: activeOffer?.price ?? null,
    publicationPermission: property.publicationPermission,
    mediaCount: property.media.filter((m) => m.kind === "image").length,
    verificationLevel: property.verificationLevel,
  });

  const canReview = hasPermission(user, "property.review");
  const canPublish = hasPermission(user, "property.publish");
  const canWrite = hasPermission(user, "property.write");
  const canArchive = hasPermission(user, "property.archive");
  const canMedia = hasPermission(user, "media.manage");

  const notice: Record<string, string> = {
    created: "Brouillon créé. Complétez les informations, ajoutez des photos, puis envoyez en révision.",
    saved: "Modifications enregistrées.",
    submitted: "Bien envoyé en révision. Un réviseur doit l'approuver avant publication.",
    media: "Médias mis à jour.",
    verified: "Vérification enregistrée.",
    confirmed: "Disponibilité reconfirmée aujourd'hui.",
    status: "Statut mis à jour.",
    restored: "Bien restauré en brouillon.",
    duplicated: "Copie créée en brouillon — vérifiez les informations avant révision.",
    fromSourcing: "Bien créé depuis une piste de sourcing. Complétez la fiche.",
    saved_price: "Prix mis à jour.",
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations · Biens</p>
          <h1 className="mt-1 font-display text-2xl">{property.reference} — {property.titleFr}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <StatusPill status={property.status} label={STATUS_LABEL_FR[property.status] ?? property.status} />
            <span>·</span>
            <span>{property.transactionType === "rent" ? "Location" : "Vente"}</span>
            <span>·</span>
            <span className="tabular-nums">{formatPrice(activeOffer?.price ?? null, "fr", { period: activeOffer?.rentPeriod, suffix: property.transactionType === "rent" })}</span>
            <span>·</span>
            <span>{property._count.leads} demande(s)</span>
            <span>·</span>
            <span>{property._count.appointments} visite(s)</span>
            {property.isSample ? <span className="badge-muted ms-1">Démo</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {property.status === "published" || property.status === "reserved" ? (
            <Link href={`/fr/properties/${property.slug}`} target="_blank" className="btn-outline btn-sm">Aperçu public</Link>
          ) : null}
          <Link href="/admin/properties" className="btn-ghost btn-sm">Retour</Link>
        </div>
      </div>

      {Object.entries(notice).map(([key, message]) =>
        flags[key] ? (
          <div key={key} className="mt-4">
            <Notice tone="success">{message}</Notice>
          </div>
        ) : null,
      )}
      {flags.error ? (
        <div className="mt-4">
          <Notice tone="warning">
            {flags.error === "MISSING_FIELDS"
              ? "Champs requis manquants pour la révision/publication : " + missing.join(", ")
              : flags.error === "INVALID"
                ? "Formulaire invalide : vérifiez les champs requis."
                : flags.error === "CANNOT_DELETE"
                  ? "Suppression impossible : ce bien a des demandes ou n'est pas un brouillon."
                  : flags.error === "INVALID_STATE"
                    ? "Transition de statut non autorisée depuis l'état actuel."
                    : "Action impossible : " + flags.error}
          </Notice>
        </div>
      ) : null}

      {missing.length && property.status !== "archived" ? (
        <div className="mt-4">
          <Notice tone="warning">
            <strong>Avant publication :</strong> {missing.join(" · ")}
          </Notice>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {canWrite ? (
            <PropertyForm
              action={updatePropertyAction}
              submitLabel="Enregistrer"
              canFeature={canPublish}
              options={{ categories, cities, amenities, staff }}
              values={{
                id: property.id,
                titleFr: property.titleFr,
                titleAr: property.titleAr,
                descriptionFr: property.descriptionFr,
                descriptionAr: property.descriptionAr,
                categoryId: property.categoryId,
                transactionType: property.transactionType,
                cityId: property.cityId,
                neighborhoodId: property.neighborhoodId,
                addressLine: property.addressLine,
                locationPrecision: property.locationPrecision,
                latitude: property.latitude,
                longitude: property.longitude,
                builtArea: property.builtArea,
                landArea: property.landArea,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                floors: property.floors,
                floorNumber: property.floorNumber,
                parkingSpaces: property.parkingSpaces,
                yearBuilt: property.yearBuilt,
                condition: property.condition,
                furnished: property.furnished,
                streetFrontage: property.streetFrontage,
                occupancyStatus: property.occupancyStatus,
                publicationPermission: property.publicationPermission,
                dataSource: property.dataSource,
                internalNotes: property.internalNotes,
                assignedToId: property.assignedToId,
                metaTitleFr: property.metaTitleFr,
                metaDescriptionFr: property.metaDescriptionFr,
                metaTitleAr: property.metaTitleAr,
                metaDescriptionAr: property.metaDescriptionAr,
                price: activeOffer?.price ?? null,
                rentPeriod: activeOffer?.rentPeriod ?? null,
                isFeatured: property.isFeatured,
                amenityIds: property.amenities.map((a) => a.amenityId),
              }}
            />
          ) : (
            <Notice tone="neutral">Votre rôle permet la lecture seule sur cette fiche.</Notice>
          )}

          <div className="mt-6">
            <MediaManager propertyId={property.id} media={property.media} canManage={canMedia} />
          </div>
        </div>

        <aside className="space-y-4">
          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Workflow</h2>
            </header>
            <div className="space-y-3 p-4">
              <p className="text-[11px] text-muted">
                Statut actuel : <strong className="text-ink">{STATUS_LABEL_FR[property.status]}</strong>
                {property.publishedAt ? ` · publié le ${formatDateTime(property.publishedAt, "fr")}` : ""}
              </p>
              <p className="text-[11px] text-muted">
                Disponibilité : {property.availabilityConfirmedAt ? formatDateTime(property.availabilityConfirmedAt, "fr") : "non confirmée"}
                {property.nextAvailabilityCheckAt ? ` · prochain contrôle ${formatDateTime(property.nextAvailabilityCheckAt, "fr")}` : ""}
              </p>

              {property.status === "draft" && canWrite ? (
                <form action={submitReviewAction} className="space-y-2">
                  <input type="hidden" name="propertyId" value={property.id} />
                  <input name="notes" placeholder="Note pour le réviseur (facultatif)" className="field" />
                  <button type="submit" className="btn-primary w-full" disabled={missing.length > 0}>
                    Envoyer en révision
                  </button>
                  {missing.length ? <p className="text-[10px] text-muted">Complétez les champs manquants pour envoyer.</p> : null}
                </form>
              ) : null}

              {property.status === "in_review" && canReview ? (
                <form action={reviewDecisionAction} className="space-y-2">
                  <input type="hidden" name="propertyId" value={property.id} />
                  <input name="notes" placeholder="Commentaire de révision" className="field" />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="submit" name="decision" value="approve" className="btn-primary" disabled={!canPublish || missing.length > 0}>
                      Approuver & publier
                    </button>
                    <button type="submit" name="decision" value="changes" className="btn-outline">
                      Modifications
                    </button>
                  </div>
                  <button type="submit" name="decision" value="reject" className="btn-ghost w-full text-muted">
                    Rejeter
                  </button>
                </form>
              ) : null}

              {property.status === "published" && canPublish ? (
                <form action={changeStatusAction} className="grid grid-cols-2 gap-2">
                  <input type="hidden" name="propertyId" value={property.id} />
                  <button type="submit" name="status" value="reserved" className="btn-outline btn-sm">Réservé</button>
                  <button type="submit" name="status" value="sold" className="btn-outline btn-sm">Vendu</button>
                  <button type="submit" name="status" value="rented" className="btn-outline btn-sm">Loué</button>
                  <button type="submit" name="status" value="unavailable" className="btn-outline btn-sm">Indisponible</button>
                </form>
              ) : null}

              {["reserved", "sold", "rented", "unavailable", "expired"].includes(property.status) && canPublish ? (
                <form action={changeStatusAction}>
                  <input type="hidden" name="propertyId" value={property.id} />
                  <button type="submit" name="status" value="published" className="btn-outline btn-sm w-full">Republier</button>
                </form>
              ) : null}

              {canWrite ? (
                <form action={confirmAvailabilityAction}>
                  <input type="hidden" name="propertyId" value={property.id} />
                  <button type="submit" className="btn-outline w-full">Reconfirmer la disponibilité</button>
                </form>
              ) : null}

              <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
                {canWrite ? (
                  <form action={duplicatePropertyAction}>
                    <input type="hidden" name="propertyId" value={property.id} />
                    <button type="submit" className="btn-ghost btn-sm w-full">Dupliquer</button>
                  </form>
                ) : null}
                {canArchive && property.status !== "archived" ? (
                  <form action={archivePropertyAction}>
                    <input type="hidden" name="propertyId" value={property.id} />
                    <button type="submit" className="btn-ghost btn-sm w-full">Archiver</button>
                  </form>
                ) : null}
                {canArchive && (property.status === "archived" || property.status === "rejected") ? (
                  <form action={restorePropertyAction}>
                    <input type="hidden" name="propertyId" value={property.id} />
                    <button type="submit" className="btn-ghost btn-sm w-full">Restaurer</button>
                  </form>
                ) : null}
                {canArchive && property.status === "draft" ? (
                  <form action={deleteDraftAction}>
                    <input type="hidden" name="propertyId" value={property.id} />
                    <button type="submit" className="btn-ghost btn-sm w-full text-muted">Supprimer le brouillon</button>
                  </form>
                ) : null}
              </div>
            </div>
          </section>

          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Vérifications</h2>
            </header>
            <div className="p-4">
              <p className="text-[11px] text-muted">
                Niveau actuel : <strong className="text-ink">{property.verificationLevel}</strong>
              </p>
              <ul className="mt-3 space-y-2 border-t border-line pt-3">
                {property.verifications.map((verification) => (
                  <li key={verification.id} className="text-[11px]">
                    <p className="font-medium">{verification.type} · {verification.result}</p>
                    <p className="text-muted">
                      {formatDateTime(verification.verifiedAt, "fr")} {verification.verifiedBy ? `· ${verification.verifiedBy.fullName}` : ""}
                    </p>
                    {verification.notes ? <p className="text-muted">{verification.notes}</p> : null}
                  </li>
                ))}
                {!property.verifications.length ? <li className="text-[11px] text-muted">Aucune vérification enregistrée.</li> : null}
              </ul>
              {canWrite ? (
                <form action={addVerificationAction} className="mt-4 space-y-2 border-t border-line pt-3">
                  <input type="hidden" name="propertyId" value={property.id} />
                  <select name="type" className="field" defaultValue="availability">
                    <option value="availability">Disponibilité</option>
                    <option value="identity">Identité du vendeur</option>
                    <option value="ownership_document">Documents de propriété</option>
                    <option value="legal">Vérification juridique</option>
                  </select>
                  <select name="result" className="field" defaultValue="passed">
                    <option value="passed">Réussie</option>
                    <option value="partial">Partielle</option>
                    <option value="failed">Échouée</option>
                  </select>
                  <input name="notes" placeholder="Preuve / commentaire interne" className="field" />
                  <button type="submit" className="btn-outline btn-sm w-full">Ajouter une vérification</button>
                </form>
              ) : null}
            </div>
          </section>

          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Révisions</h2>
            </header>
            <ul className="divide-y divide-line">
              {property.reviews.map((review) => (
                <li key={review.id} className="px-4 py-2.5 text-[11px]">
                  <p className="font-medium">{review.decision}</p>
                  <p className="text-muted">
                    {formatDateTime(review.decidedAt ?? review.createdAt, "fr")}
                    {review.reviewer ? ` · ${review.reviewer.fullName}` : ""}
                  </p>
                  {review.notes ? <p className="mt-1 text-muted">{review.notes}</p> : null}
                </li>
              ))}
              {!property.reviews.length ? <li className="px-4 py-4 text-[11px] text-muted">Aucune révision.</li> : null}
            </ul>
          </section>

          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Historique</h2>
            </header>
            <ul className="divide-y divide-line">
              {property.statusHistory.map((entry) => (
                <li key={entry.id} className="px-4 py-2 text-[11px] text-muted">
                  {formatDateTime(entry.createdAt, "fr")} — {entry.fromStatus ?? "—"} → {entry.toStatus}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-line bg-soft p-4 text-[11px] leading-relaxed text-muted">
            <p className="font-semibold uppercase tracking-[0.12em] text-ink">Confidentiel</p>
            <p className="mt-2">Source : {property.dataSource || "—"}</p>
            <p>Autorisation de publier : {property.publicationPermission}</p>
            <p>Responsable : {property.assignedTo?.fullName ?? "—"}</p>
            <p>Notes internes : {property.internalNotes || "—"}</p>
            <p className="mt-2">Ces informations ne sont jamais exposées sur le site public.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
