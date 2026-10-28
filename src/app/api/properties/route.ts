import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cardSelect } from "@/lib/queries";
import { PUBLIC_STATUSES } from "@/lib/status";

export const dynamic = "force-dynamic";

/**
 * Public read-only endpoint used by the favourites and comparison views.
 * Returns only fields that are already public on the website — never internal
 * notes, owner contacts, permissions, verification evidence or staff data.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id.length < 40)
    .slice(0, 12);

  if (!ids.length) return NextResponse.json({ items: [] });

  const items = await prisma.property.findMany({
    where: { id: { in: ids }, deletedAt: null, status: { in: PUBLIC_STATUSES } },
    select: cardSelect,
    take: 12,
  });

  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
}
