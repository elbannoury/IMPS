/**
 * Role-based access control.
 *
 * Permissions are enforced on the server (server actions, route handlers and
 * server components). Hiding a button in the UI is never the security
 * boundary. Every permission-sensitive mutation also writes an audit record.
 */

export const PERMISSIONS = {
  PROPERTY_READ: "property.read",
  PROPERTY_WRITE: "property.write",
  PROPERTY_PUBLISH: "property.publish",
  PROPERTY_REVIEW: "property.review",
  PROPERTY_ARCHIVE: "property.archive",
  PROPERTY_PRICE: "property.price_change",
  SOURCING_MANAGE: "sourcing.manage",
  MEDIA_MANAGE: "media.manage",
  TAXONOMY_MANAGE: "taxonomy.manage",
  LOCATION_MANAGE: "location.manage",
  STAFF_MANAGE: "staff.manage",
  CRM_READ: "crm.read",
  CRM_WRITE: "crm.write",
  APPOINTMENT_MANAGE: "appointment.manage",
  TASK_MANAGE: "task.manage",
  CONTENT_MANAGE: "content.manage",
  REPORT_READ: "report.read",
  AUDIT_READ: "audit.read",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_META: Record<Permission, { group: string; label: string }> = {
  "property.read": { group: "Properties", label: "View properties" },
  "property.write": { group: "Properties", label: "Create and edit properties" },
  "property.publish": { group: "Properties", label: "Publish and unpublish listings" },
  "property.review": { group: "Properties", label: "Review and approve listings" },
  "property.archive": { group: "Properties", label: "Archive and restore listings" },
  "property.price_change": { group: "Properties", label: "Change asking prices" },
  "sourcing.manage": { group: "Sourcing", label: "Manage sourcing pipeline" },
  "media.manage": { group: "Media", label: "Upload and order media" },
  "taxonomy.manage": { group: "Taxonomy", label: "Manage categories and amenities" },
  "location.manage": { group: "Taxonomy", label: "Manage cities and neighbourhoods" },
  "staff.manage": { group: "Staff", label: "Manage staff accounts and roles" },
  "crm.read": { group: "CRM", label: "Read inquiries and appointments" },
  "crm.write": { group: "CRM", label: "Update inquiries and follow-ups" },
  "appointment.manage": { group: "CRM", label: "Manage viewing appointments" },
  "task.manage": { group: "Operations", label: "Create and complete internal tasks" },
  "content.manage": { group: "Content", label: "Manage guides and developments" },
  "report.read": { group: "Reporting", label: "Read operational reports" },
  "audit.read": { group: "Security", label: "Read the audit trail" },
  "settings.manage": { group: "Settings", label: "Manage platform settings" },
};

export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  COLLECTOR: "collector",
  REVIEWER: "reviewer",
  CRM: "crm",
  EDITOR: "editor",
  ANALYST: "analyst",
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_META: Record<RoleKey, { nameFr: string; nameAr: string; description: string }> = {
  owner: {
    nameFr: "Propriétaire de la plateforme",
    nameAr: "مالك المنصة",
    description: "Full administrative authority over the platform.",
  },
  manager: {
    nameFr: "Responsable de plateforme",
    nameAr: "مدير المنصة",
    description: "Property operations, publishing oversight, CRM and reporting.",
  },
  collector: {
    nameFr: "Collecteur de biens",
    nameAr: "جامع العقارات",
    description: "Sourcing, owner contact tracking and property data entry.",
  },
  reviewer: {
    nameFr: "Réviseur de contenu",
    nameAr: "مراجع المحتوى",
    description: "Reviews, corrects and approves listings before publication.",
  },
  crm: {
    nameFr: "Relations clients",
    nameAr: "علاقات العملاء",
    description: "Inquiries, appointments and follow-up.",
  },
  editor: {
    nameFr: "Éditeur de contenu",
    nameAr: "محرر المحتوى",
    description: "Cities, guides, development pages and SEO content.",
  },
  analyst: {
    nameFr: "Analyste",
    nameAr: "محلل",
    description: "Read-only access to approved operational reports.",
  },
};

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  owner: ALL_PERMISSIONS,
  manager: [
    "property.read",
    "property.write",
    "property.publish",
    "property.review",
    "property.archive",
    "property.price_change",
    "sourcing.manage",
    "media.manage",
    "taxonomy.manage",
    "location.manage",
    "staff.manage",
    "crm.read",
    "crm.write",
    "appointment.manage",
    "task.manage",
    "content.manage",
    "report.read",
    "audit.read",
  ],
  collector: [
    "property.read",
    "property.write",
    "sourcing.manage",
    "media.manage",
    "task.manage",
  ],
  reviewer: [
    "property.read",
    "property.write",
    "property.review",
    "property.publish",
    "property.archive",
    "task.manage",
    "audit.read",
  ],
  crm: ["property.read", "crm.read", "crm.write", "appointment.manage", "task.manage"],
  editor: ["property.read", "content.manage", "location.manage", "taxonomy.manage"],
  analyst: ["property.read", "report.read"],
};

export function permissionsForRole(roleKey: string | null | undefined): Permission[] {
  if (!roleKey) return [];
  return ROLE_PERMISSIONS[roleKey as RoleKey] ?? [];
}

export function can(roleKey: string | null | undefined, permission: Permission): boolean {
  if (!roleKey) return false;
  if (roleKey === ROLES.OWNER) return true;
  return permissionsForRole(roleKey).includes(permission);
}

/** Roles a given actor is allowed to create or edit. Owner is never transferable. */
export function manageableRoles(actorRole: string | null | undefined): RoleKey[] {
  if (actorRole === ROLES.OWNER) return Object.keys(ROLE_META) as RoleKey[];
  if (actorRole === ROLES.MANAGER) {
    return ["manager", "collector", "reviewer", "crm", "editor", "analyst"];
  }
  return [];
}
