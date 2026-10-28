/** Lifecycle constants, valid transitions and human labels. */

export const PROPERTY_STATUSES = [
  "draft",
  "in_review",
  "published",
  "reserved",
  "sold",
  "rented",
  "unavailable",
  "expired",
  "archived",
  "rejected",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const SOURCING_STAGES = [
  "discovered",
  "contacted",
  "collecting",
  "verification",
  "review",
  "approved",
  "published",
  "rejected",
  "unresponsive",
  "duplicate",
  "not_authorized",
  "unavailable",
] as const;
export type SourcingStage = (typeof SOURCING_STAGES)[number];

export const LEAD_STATUSES = [
  "new",
  "attempted",
  "contacted",
  "qualified",
  "viewing_scheduled",
  "viewing_completed",
  "negotiating",
  "converted",
  "lost",
  "unresponsive",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  "requested",
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const VERIFICATION_LEVELS = [
  "unverified",
  "identity_checked",
  "availability_confirmed",
  "documents_reviewed",
  "legally_verified",
] as const;

/** Statuses whose listings may be shown on the public website. */
export const PUBLIC_STATUSES: PropertyStatus[] = [
  "published",
  "reserved",
  "sold",
  "rented",
  "unavailable",
];

/** Statuses that mean "currently available to buy or rent". */
export const AVAILABLE_STATUSES: PropertyStatus[] = ["published"];

const TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  draft: ["in_review", "archived", "rejected"],
  in_review: ["published", "draft", "rejected", "archived"],
  published: ["reserved", "sold", "rented", "unavailable", "expired", "in_review", "archived"],
  reserved: ["published", "sold", "rented", "unavailable", "archived"],
  sold: ["archived", "published"],
  rented: ["archived", "published"],
  unavailable: ["published", "expired", "archived"],
  expired: ["published", "archived"],
  archived: ["draft", "published"],
  rejected: ["draft", "archived"],
};

export function canTransition(from: string, to: PropertyStatus): boolean {
  const allowed = TRANSITIONS[from as PropertyStatus];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function assertTransition(from: string, to: PropertyStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_TRANSITION:${from}->${to}`);
  }
}

export const STATUS_LABEL_FR: Record<string, string> = {
  draft: "Brouillon",
  in_review: "En révision",
  published: "Publié",
  reserved: "Réservé",
  sold: "Vendu",
  rented: "Loué",
  unavailable: "Indisponible",
  expired: "Expiré",
  archived: "Archivé",
  rejected: "Rejeté",
};

export const STATUS_LABEL_AR: Record<string, string> = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  published: "منشور",
  reserved: "محجوز",
  sold: "مباع",
  rented: "مكترى",
  unavailable: "غير متوفر",
  expired: "منتهي",
  archived: "مؤرشف",
  rejected: "مرفوض",
};

export const STAGE_LABEL_FR: Record<string, string> = {
  discovered: "Découvert",
  contacted: "Contacté",
  collecting: "Collecte d'informations",
  verification: "Vérification",
  review: "Révision",
  approved: "Approuvé",
  published: "Publié",
  rejected: "Rejeté",
  unresponsive: "Sans réponse",
  duplicate: "Doublon",
  not_authorized: "Non autorisé à publier",
  unavailable: "Plus disponible",
};

export const STAGE_LABEL_AR: Record<string, string> = {
  discovered: "مكتشف",
  contacted: "تم التواصل",
  collecting: "جمع المعلومات",
  verification: "التحقق",
  review: "المراجعة",
  approved: "معتمد",
  published: "منشور",
  rejected: "مرفوض",
  unresponsive: "لا استجابة",
  duplicate: "مكرر",
  not_authorized: "غير مصرح بالنشر",
  unavailable: "لم يعد متوفراً",
};

export const LEAD_LABEL_FR: Record<string, string> = {
  new: "Nouveau",
  attempted: "Tentative de contact",
  contacted: "Contacté",
  qualified: "Qualifié",
  viewing_scheduled: "Visite planifiée",
  viewing_completed: "Visite effectuée",
  negotiating: "Négociation",
  converted: "Converti",
  lost: "Perdu",
  unresponsive: "Sans réponse",
};

export const LEAD_LABEL_AR: Record<string, string> = {
  new: "جديد",
  attempted: "محاولة تواصل",
  contacted: "تم التواصل",
  qualified: "مؤهل",
  viewing_scheduled: "زيارة مبرمجة",
  viewing_completed: "زيارة منجزة",
  negotiating: "تفاوض",
  converted: "محول",
  lost: "مفقود",
  unresponsive: "لا استجابة",
};

export const APPOINTMENT_LABEL_FR: Record<string, string> = {
  requested: "Demandée",
  confirmed: "Confirmée",
  rescheduled: "Reprogrammée",
  cancelled: "Annulée",
  completed: "Effectuée",
  no_show: "Absent",
};

export const MAINTENANCE_MIN_DAYS = 30;
