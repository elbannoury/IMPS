import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * PropertyOffer rows are the source of truth for pricing. `Property.primaryPrice`
 * and `primaryRentPeriod` are a denormalised read model used for search,
 * sorting and cards; they are refreshed whenever offers change.
 */
export async function syncPrimaryOffer(db: Db, propertyId: string): Promise<void> {
  const offer = await db.propertyOffer.findFirst({
    where: { propertyId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  await db.property.update({
    where: { id: propertyId },
    data: {
      primaryPrice: offer?.price ?? null,
      primaryRentPeriod: offer?.rentPeriod ?? null,
    },
  });
}

export async function setPropertyPrice(
  db: Db,
  propertyId: string,
  price: number,
  transactionType: string,
  rentPeriod?: string | null,
): Promise<void> {
  await db.propertyOffer.updateMany({
    where: { propertyId, isActive: true },
    data: { isActive: false },
  });
  await db.propertyOffer.create({
    data: {
      propertyId,
      transactionType,
      price,
      rentPeriod: transactionType === "rent" ? rentPeriod ?? "month" : null,
      isActive: true,
    },
  });
  await syncPrimaryOffer(db, propertyId);
}
