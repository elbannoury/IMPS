"use server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function toggleFavoriteAction(propertyId: string): Promise<{ saved: boolean; authenticated: boolean }> {
  const user = await getSessionUser();
  if (!user || user.isStaff) return { saved: false, authenticated: false };
  const existing = await prisma.savedProperty.findUnique({
    where: { profileId_propertyId: { profileId: user.id, propertyId } },
  });
  if (existing) {
    await prisma.savedProperty.delete({ where: { id: existing.id } });
    return { saved: false, authenticated: true };
  }
  await prisma.savedProperty.create({ data: { profileId: user.id, propertyId } });
  return { saved: true, authenticated: true };
}

export async function saveSearchAction(payload: { name: string; query: string }): Promise<{ ok: boolean; authenticated: boolean }> {
  const user = await getSessionUser();
  if (!user || user.isStaff) return { ok: false, authenticated: false };
  await prisma.savedSearch.create({
    data: { profileId: user.id, name: payload.name.slice(0, 80), queryJson: payload.query.slice(0, 2000) },
  });
  return { ok: true, authenticated: true };
}
