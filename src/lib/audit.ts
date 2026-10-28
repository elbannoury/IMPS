import "server-only";
import { prisma } from "./db";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        beforeJson: input.before ? JSON.stringify(input.before).slice(0, 8000) : null,
        afterJson: input.after ? JSON.stringify(input.after).slice(0, 8000) : null,
        ip: input.ip ?? null,
      },
    });
  } catch (error) {
    // Audit failures must be visible in logs but should not roll back a
    // business operation that already succeeded.
    console.error("[audit] failed to write audit log", error);
  }
}

export async function notifyStaff(params: {
  profileId?: string | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      profileId: params.profileId ?? null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
    },
  });
}
