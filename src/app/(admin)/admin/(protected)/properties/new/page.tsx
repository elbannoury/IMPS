import Link from "next/link";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { Notice } from "@/components/ui";
import { createPropertyAction } from "@/app/actions/properties";
import { hasPermission, requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewPropertyPage({ searchParams }: { searchParams: Promise<{ error?: string; fromSourcing?: string }> }) {
  const user = await requireStaffPage("property.write");
  const { error } = await searchParams;

  const [categories, cities, amenities, staff] = await Promise.all([
    prisma.propertyCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ where: { isPublished: true }, orderBy: { nameFr: "asc" }, include: { neighborhoods: { orderBy: { nameFr: "asc" } } } }),
    prisma.amenity.findMany({ where: { isActive: true }, orderBy: [{ group: "asc" }, { labelFr: "asc" }] }),
    prisma.profile.findMany({ where: { isStaff: true, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations · Biens</p>
          <h1 className="mt-1 font-display text-3xl">Nouveau bien</h1>
          <p className="mt-1 text-xs text-muted">Le bien est créé en brouillon. La publication exige une révision et une autorisation.</p>
        </div>
        <Link href="/admin/properties" className="btn-outline btn-sm">Retour</Link>
      </div>

      {error === "INVALID" ? (
        <div className="mt-4"><Notice tone="warning">Formulaire incomplet ou invalide. Vérifiez le titre, la description (40 caractères), la catégorie, la ville et le prix.</Notice></div>
      ) : null}

      <div className="mt-6">
        <PropertyForm
          action={createPropertyAction}
          submitLabel="Créer le brouillon"
          canFeature={hasPermission(user, "property.publish")}
          options={{ categories, cities, amenities, staff }}
          values={{ transactionType: "sale", locationPrecision: "approximate", publicationPermission: "none", assignedToId: user.id }}
        />
      </div>
    </div>
  );
}
