import Image from "next/image";
import Link from "next/link";
import { Notice } from "@/components/ui";
import { reviewDecisionAction } from "@/app/actions/properties";
import { hasPermission, requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatPrice } from "@/lib/format";
import { missingPublishFields } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaffPage("property.review");
  const flags = await searchParams;

  const queue = await prisma.property.findMany({
    where: { status: "in_review", deletedAt: null },
    orderBy: { updatedAt: "asc" },
    include: {
      media: { orderBy: { sortOrder: "asc" }, take: 3 },
      offers: { where: { isActive: true }, take: 1 },
      city: true,
      category: true,
      assignedTo: { select: { fullName: true } },
      reviews: { where: { decision: "pending" }, take: 1, include: { submittedBy: { select: { fullName: true } } } },
      _count: { select: { media: true, leads: true } },
      verifications: { orderBy: { verifiedAt: "desc" }, take: 3 },
    },
  });

  const canPublish = hasPermission(user, "property.publish");

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations</p>
      <h1 className="mt-1 font-display text-3xl">File de révision</h1>
      <p className="mt-1 text-xs text-muted">Inspectez chaque fiche avant publication. La publication est journalisée.</p>

      {flags.published ? <div className="mt-4"><Notice tone="success">Annonce approuvée et publiée.</Notice></div> : null}
      {flags.changes ? <div className="mt-4"><Notice tone="success">Modifications demandées : la fiche est revenue en brouillon.</Notice></div> : null}
      {flags.rejected ? <div className="mt-4"><Notice tone="success">Annonce rejetée.</Notice></div> : null}
      {flags.error === "MISSING_FIELDS" ? <div className="mt-4"><Notice tone="warning">Publication bloquée : champs requis manquants (photos, vérification, autorisation…).</Notice></div> : null}

      <div className="mt-6 space-y-5">
        {queue.map((property) => {
          const missing = missingPublishFields({
            titleFr: property.titleFr,
            descriptionFr: property.descriptionFr,
            categoryId: property.categoryId,
            cityId: property.cityId,
            price: property.offers[0]?.price ?? null,
            publicationPermission: property.publicationPermission,
            mediaCount: property._count.media,
            verificationLevel: property.verificationLevel,
          });
          return (
            <article key={property.id} className="border border-line bg-white">
              <div className="grid gap-4 p-4 lg:grid-cols-[280px_1fr_260px]">
                <div className="grid grid-cols-3 gap-1">
                  {property.media.slice(0, 3).map((media) => (
                    <div key={media.id} className="relative aspect-square overflow-hidden bg-soft">
                      <Image src={media.url} alt="" fill sizes="120px" className="object-cover" />
                    </div>
                  ))}
                  {!property.media.length ? <p className="col-span-3 text-[11px] text-muted">Aucune photo</p> : null}
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                    {property.reference} · {property.city.nameFr} · {property.category.nameFr}
                  </p>
                  <h2 className="mt-1 font-display text-xl">{property.titleFr}</h2>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {formatPrice(property.offers[0]?.price ?? null, "fr", { period: property.offers[0]?.rentPeriod, suffix: property.transactionType === "rent" })}
                  </p>
                  <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-muted">{property.descriptionFr}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                    <span className="badge-muted">Autorisation : {property.publicationPermission}</span>
                    <span className="badge-muted">Vérification : {property.verificationLevel}</span>
                    <span className="badge-muted">{property._count.media} média(s)</span>
                    <span className="badge-muted">{property._count.leads} demande(s)</span>
                  </div>
                  <p className="mt-2 text-[10px] text-muted">
                    Soumis par {property.reviews[0]?.submittedBy?.fullName ?? "—"} · {formatDateTime(property.reviews[0]?.createdAt ?? property.updatedAt, "fr")}
                    {property.assignedTo ? ` · Responsable ${property.assignedTo.fullName}` : ""}
                  </p>
                  {missing.length ? (
                    <p className="mt-2 text-[11px] text-ink">⚠ Manquant : {missing.join(" · ")}</p>
                  ) : null}
                </div>

                <div className="border-t border-line pt-3 lg:border-s lg:border-t-0 lg:ps-4 lg:pt-0">
                  <form action={reviewDecisionAction} className="space-y-2">
                    <input type="hidden" name="propertyId" value={property.id} />
                    <textarea name="notes" placeholder="Commentaire de révision" rows={3} className="field" />
                    <button type="submit" name="decision" value="approve" disabled={!canPublish || missing.length > 0} className="btn-primary w-full">
                      Approuver & publier
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="submit" name="decision" value="changes" className="btn-outline">Modifications</button>
                      <button type="submit" name="decision" value="reject" className="btn-outline">Rejeter</button>
                    </div>
                    {!canPublish ? <p className="text-[10px] text-muted">Votre rôle peut demander des modifications mais pas publier.</p> : null}
                  </form>
                  <Link href={`/admin/properties/${property.id}`} className="btn-ghost btn-sm mt-2 w-full">Ouvrir la fiche complète</Link>
                </div>
              </div>
            </article>
          );
        })}
        {!queue.length ? <p className="border border-dashed border-line py-16 text-center text-sm text-muted">Aucune annonce en attente de révision.</p> : null}
      </div>
    </div>
  );
}
