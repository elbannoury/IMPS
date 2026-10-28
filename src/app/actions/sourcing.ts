"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaffAction } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sourcingStageSchema } from "@/lib/validation";
import { propertySlug, referenceFor } from "@/lib/slug";

async function nextSourceCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.propertyLead.count();
  for (let i = 0; i < 50; i++) {
    const candidate = `SRC-${year}-${String(count + 1 + i).padStart(4, "0")}`;
    const exists = await prisma.propertyLead.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `SRC-${year}-${Date.now() % 9000}`;
}

export async function createSourcingLeadAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("sourcing.manage");
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 4) redirect("/admin/sourcing?error=INVALID");

  const lead = await prisma.propertyLead.create({
    data: {
      code: await nextSourceCode(),
      title,
      sourceType: String(formData.get("sourceType") ?? "owner"),
      sourceDetail: String(formData.get("sourceDetail") ?? "") || null,
      cityId: String(formData.get("cityId") ?? "") || null,
      categoryId: String(formData.get("categoryId") ?? "") || null,
      transactionType: String(formData.get("transactionType") ?? "") || null,
      askingPrice: formData.get("askingPrice") ? Number(formData.get("askingPrice")) : null,
      description: String(formData.get("description") ?? "") || null,
      stage: "discovered",
      permissionToPublish: "none",
      assignedToId: String(formData.get("assignedToId") ?? "") || user.id,
      createdById: user.id,
      nextFollowUpAt: formData.get("nextFollowUpAt") ? new Date(String(formData.get("nextFollowUpAt"))) : null,
      internalNotes: String(formData.get("internalNotes") ?? "") || null,
    },
  });

  const ownerName = String(formData.get("ownerName") ?? "").trim();
  if (ownerName) {
    await prisma.ownerContact.create({
      data: {
        propertyLeadId: lead.id,
        name: ownerName,
        phone: String(formData.get("ownerPhone") ?? "") || null,
        email: String(formData.get("ownerEmail") ?? "") || null,
        role: "owner",
        isPrimary: true,
      },
    });
  }

  await writeAudit({
    actorId: user.id,
    action: "sourcing.create",
    entityType: "property_lead",
    entityId: lead.id,
    summary: `Sourcing lead created: ${lead.code} — ${lead.title}`,
  });
  redirect(`/admin/sourcing/${lead.id}`);
}

export async function updateSourcingAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("sourcing.manage");
  const id = String(formData.get("leadId") ?? "");
  const lead = await prisma.propertyLead.findUnique({ where: { id } });
  if (!lead) redirect("/admin/sourcing?error=NOT_FOUND");

  const stageRaw = String(formData.get("stage") ?? lead.stage);
  const stage = sourcingStageSchema.safeParse(stageRaw);
  if (!stage.success) redirect(`/admin/sourcing/${id}?error=INVALID`);

  await prisma.propertyLead.update({
    where: { id },
    data: {
      stage: stage.data,
      permissionToPublish: String(formData.get("permissionToPublish") ?? lead.permissionToPublish),
      assignedToId: String(formData.get("assignedToId") ?? "") || null,
      nextFollowUpAt: formData.get("nextFollowUpAt") ? new Date(String(formData.get("nextFollowUpAt"))) : null,
      missingInfo: String(formData.get("missingInfo") ?? "") || null,
      internalNotes: String(formData.get("internalNotes") ?? "") || null,
      description: String(formData.get("description") ?? "") || lead.description,
      askingPrice: formData.get("askingPrice") ? Number(formData.get("askingPrice")) : lead.askingPrice,
      firstContactAt: formData.get("firstContactAt") ? new Date(String(formData.get("firstContactAt"))) : lead.firstContactAt,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "sourcing.update",
    entityType: "property_lead",
    entityId: id,
    summary: `${lead.code}: stage ${lead.stage} → ${stage.data}`,
    before: { stage: lead.stage },
    after: { stage: stage.data },
  });
  redirect(`/admin/sourcing/${id}?saved=1`);
}

export async function addContactAttemptAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("sourcing.manage");
  const id = String(formData.get("leadId") ?? "");
  const lead = await prisma.propertyLead.findUnique({ where: { id } });
  if (!lead) redirect("/admin/sourcing?error=NOT_FOUND");

  await prisma.leadContactAttempt.create({
    data: {
      propertyLeadId: id,
      staffId: user.id,
      channel: String(formData.get("channel") ?? "call"),
      outcome: String(formData.get("outcome") ?? "reached"),
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  await prisma.propertyLead.update({
    where: { id },
    data: {
      firstContactAt: lead.firstContactAt ?? new Date(),
      stage: lead.stage === "discovered" ? "contacted" : lead.stage,
    },
  });
  await writeAudit({
    actorId: user.id,
    action: "sourcing.contact_attempt",
    entityType: "property_lead",
    entityId: id,
    summary: `Contact attempt logged on ${lead.code}`,
  });
  redirect(`/admin/sourcing/${id}?attempt=1`);
}

export async function convertSourcingAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("property.write");
  const id = String(formData.get("leadId") ?? "");
  const lead = await prisma.propertyLead.findUnique({ where: { id }, include: { ownerContacts: true } });
  if (!lead) redirect("/admin/sourcing?error=NOT_FOUND");
  if (lead.convertedPropertyId) redirect(`/admin/properties/${lead.convertedPropertyId}`);

  const category = lead.categoryId
    ? await prisma.propertyCategory.findUnique({ where: { id: lead.categoryId } })
    : await prisma.propertyCategory.findFirst({ where: { slug: "apartment" } });
  const cityId = lead.cityId ?? (await prisma.city.findFirst({ where: { isPublished: true } }))?.id;
  if (!category || !cityId) redirect(`/admin/sourcing/${id}?error=MISSING_TAXONOMY`);

  const year = new Date().getFullYear();
  const count = await prisma.property.count();
  let reference = referenceFor(year, count + 1);
  if (await prisma.property.findUnique({ where: { reference }, select: { id: true } })) {
    reference = referenceFor(year, count + 17);
  }

  const owner = lead.ownerContacts.find((c) => c.isPrimary) ?? lead.ownerContacts[0];
  const property = await prisma.property.create({
    data: {
      reference,
      slug: propertySlug(lead.title, reference),
      titleFr: lead.title,
      descriptionFr:
        lead.description ??
        `Bien issu de la piste ${lead.code}. Description à compléter par l'équipe avant révision.`,
      categoryId: category.id,
      transactionType: lead.transactionType ?? "sale",
      cityId,
      neighborhoodId: lead.neighborhoodId,
      status: "draft",
      sourcingStage: "collecting",
      publicationPermission: lead.permissionToPublish,
      dataSource: `${lead.sourceType}${lead.sourceDetail ? ` — ${lead.sourceDetail}` : ""}`,
      internalNotes: `Créé depuis la piste ${lead.code}.${owner ? ` Contact : ${owner.name} ${owner.phone ?? ""}` : ""}`,
      assignedToId: lead.assignedToId ?? user.id,
      createdById: user.id,
    },
  });

  if (lead.askingPrice) {
    await prisma.propertyOffer.create({
      data: {
        propertyId: property.id,
        transactionType: lead.transactionType ?? "sale",
        price: lead.askingPrice,
        rentPeriod: lead.transactionType === "rent" ? "month" : null,
        isActive: true,
      },
    });
    await prisma.property.update({
      where: { id: property.id },
      data: {
        primaryPrice: lead.askingPrice,
        primaryRentPeriod: lead.transactionType === "rent" ? "month" : null,
      },
    });
  }

  await prisma.propertyLead.update({
    where: { id },
    data: { stage: "collecting", convertedPropertyId: property.id },
  });
  await writeAudit({
    actorId: user.id,
    action: "sourcing.convert",
    entityType: "property",
    entityId: property.id,
    summary: `${lead.code} converted into draft ${property.reference}`,
  });
  redirect(`/admin/properties/${property.id}?fromSourcing=1`);
}
