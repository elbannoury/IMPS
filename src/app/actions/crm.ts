"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaffAction } from "@/lib/auth";
import { writeAudit, notifyStaff } from "@/lib/audit";
import { appointmentUpdateSchema, leadUpdateSchema } from "@/lib/validation";

export async function updateLeadAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("crm.write");
  const parsed = leadUpdateSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status") || undefined,
    assignedToId: String(formData.get("assignedToId") ?? ""),
    priority: formData.get("priority") || undefined,
    followUpAt: String(formData.get("followUpAt") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) redirect("/admin/crm?error=INVALID");

  const lead = await prisma.lead.findUnique({ where: { id: parsed.data.leadId } });
  if (!lead) redirect("/admin/crm?error=NOT_FOUND");

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: parsed.data.status ?? lead.status,
      assignedToId: parsed.data.assignedToId || null,
      priority: parsed.data.priority ?? lead.priority,
      followUpAt: parsed.data.followUpAt ? new Date(parsed.data.followUpAt) : null,
    },
  });

  if (parsed.data.note) {
    await prisma.leadNote.create({
      data: { leadId: lead.id, staffId: user.id, body: parsed.data.note },
    });
  }

  if (parsed.data.assignedToId && parsed.data.assignedToId !== lead.assignedToId) {
    await notifyStaff({
      profileId: parsed.data.assignedToId,
      type: "lead.assigned",
      title: "Nouvelle demande assignée",
      body: `${lead.code} — ${lead.name}`,
      link: `/admin/crm/${lead.id}`,
    });
  }

  await writeAudit({
    actorId: user.id,
    action: "lead.update",
    entityType: "lead",
    entityId: lead.id,
    summary: `${lead.code}: status ${lead.status} → ${parsed.data.status ?? lead.status}`,
    before: { status: lead.status, assignedToId: lead.assignedToId },
    after: { status: parsed.data.status ?? lead.status, assignedToId: parsed.data.assignedToId },
  });
  redirect(`/admin/crm/${lead.id}?saved=1`);
}

export async function addLeadNoteAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("crm.write");
  const leadId = String(formData.get("leadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(`/admin/crm/${leadId}?error=EMPTY`);
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) redirect("/admin/crm?error=NOT_FOUND");
  await prisma.leadNote.create({ data: { leadId, staffId: user.id, body } });
  await prisma.lead.update({ where: { id: leadId }, data: { updatedAt: new Date() } });
  redirect(`/admin/crm/${leadId}?note=1`);
}

export async function updateAppointmentAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("appointment.manage");
  const parsed = appointmentUpdateSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    status: formData.get("status"),
    assignedToId: String(formData.get("assignedToId") ?? ""),
    staffNotes: String(formData.get("staffNotes") ?? ""),
  });
  if (!parsed.success) redirect("/admin/appointments?error=INVALID");

  const appointment = await prisma.viewingAppointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: { property: { select: { reference: true } } },
  });
  if (!appointment) redirect("/admin/appointments?error=NOT_FOUND");

  // Scheduling conflict check when confirming (same staff, overlapping hour).
  if (parsed.data.status === "confirmed") {
    const from = new Date(appointment.requestedAt.getTime() - 60 * 60 * 1000);
    const to = new Date(appointment.requestedAt.getTime() + 60 * 60 * 1000);
    const conflict = await prisma.viewingAppointment.findFirst({
      where: {
        id: { not: appointment.id },
        status: "confirmed",
        requestedAt: { gte: from, lte: to },
        assignedToId: parsed.data.assignedToId || appointment.assignedToId || null,
      },
    });
    if (conflict) redirect(`/admin/appointments?error=CONFLICT`);
  }

  await prisma.viewingAppointment.update({
    where: { id: appointment.id },
    data: {
      status: parsed.data.status,
      assignedToId: parsed.data.assignedToId || appointment.assignedToId,
      staffNotes: parsed.data.staffNotes || appointment.staffNotes,
      confirmedAt: parsed.data.status === "confirmed" ? new Date() : appointment.confirmedAt,
    },
  });

  const leadStatusByAppointment: Record<string, string | undefined> = {
    confirmed: "viewing_scheduled",
    completed: "viewing_completed",
    cancelled: "contacted",
    no_show: "unresponsive",
  };
  const nextLeadStatus = leadStatusByAppointment[parsed.data.status];
  if (appointment.leadId && nextLeadStatus) {
    await prisma.lead.update({ where: { id: appointment.leadId }, data: { status: nextLeadStatus } });
  }

  await writeAudit({
    actorId: user.id,
    action: "appointment.update",
    entityType: "viewing_appointment",
    entityId: appointment.id,
    summary: `Viewing for ${appointment.property.reference}: ${appointment.status} → ${parsed.data.status}`,
    before: { status: appointment.status },
    after: { status: parsed.data.status },
  });
  redirect("/admin/appointments?saved=1");
}

export async function createTaskAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("task.manage");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/tasks?error=EMPTY");
  await prisma.staffTask.create({
    data: {
      title,
      description: String(formData.get("description") ?? "") || null,
      assigneeId: String(formData.get("assigneeId") ?? "") || user.id,
      dueAt: formData.get("dueAt") ? new Date(String(formData.get("dueAt"))) : null,
      priority: String(formData.get("priority") ?? "normal"),
      entityType: String(formData.get("entityType") ?? "") || null,
      entityId: String(formData.get("entityId") ?? "") || null,
    },
  });
  await writeAudit({
    actorId: user.id,
    action: "task.create",
    entityType: "staff_task",
    entityId: "new",
    summary: `Task created: ${title}`,
  });
  redirect("/admin/tasks?created=1");
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("task.manage");
  const id = String(formData.get("taskId") ?? "");
  const task = await prisma.staffTask.findUnique({ where: { id } });
  if (!task) redirect("/admin/tasks?error=NOT_FOUND");
  await prisma.staffTask.update({
    where: { id },
    data: { status: task.status === "open" ? "done" : "open", completedAt: task.status === "open" ? new Date() : null },
  });
  await writeAudit({
    actorId: user.id,
    action: "task.complete",
    entityType: "staff_task",
    entityId: id,
    summary: `Task ${task.status === "open" ? "completed" : "reopened"}: ${task.title}`,
  });
  redirect("/admin/tasks?done=1");
}
