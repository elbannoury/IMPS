"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaffAction } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("settings.manage");
  const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("setting:"));
  for (const [field, value] of entries) {
    const key = field.replace("setting:", "");
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value), group: "general" },
    });
  }
  await writeAudit({
    actorId: user.id,
    action: "settings.update",
    entityType: "site_setting",
    entityId: "bulk",
    summary: `Updated ${entries.length} setting(s)`,
  });
  revalidatePath("/fr");
  revalidatePath("/ar");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
