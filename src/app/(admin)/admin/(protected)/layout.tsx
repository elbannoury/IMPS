import Link from "next/link";
import { requireStaffPage, hasPermission } from "@/lib/auth";
import { staffLogoutAction } from "@/app/actions/auth";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { Logo } from "@/components/site/Logo";
import { prisma } from "@/lib/db";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();

  const [newLeads, pendingViewings, unread, reviewPending] = await Promise.all([
    hasPermission(user, "crm.read") ? prisma.lead.count({ where: { status: "new" } }) : Promise.resolve(0),
    hasPermission(user, "appointment.manage") ? prisma.viewingAppointment.count({ where: { status: "requested" } }) : Promise.resolve(0),
    prisma.notification.count({ where: { OR: [{ profileId: user.id }, { profileId: null }], isRead: false } }),
    hasPermission(user, "property.review") ? prisma.property.count({ where: { status: "in_review" } }) : Promise.resolve(0),
  ]);

  const items: NavItem[] = [
    { href: "/admin", label: "Tableau de bord", group: "Pilotage" },
    { href: "/admin/properties", label: "Biens", group: "Opérations" },
    { href: "/admin/sourcing", label: "Sourcing", group: "Opérations" },
    { href: "/admin/review", label: "Révision", group: "Opérations", badge: reviewPending || undefined },
    { href: "/admin/crm", label: "Clients & demandes", group: "Opérations", badge: newLeads || undefined },
    { href: "/admin/appointments", label: "Visites", group: "Opérations", badge: pendingViewings || undefined },
    { href: "/admin/tasks", label: "Tâches", group: "Opérations" },
    { href: "/admin/taxonomy", label: "Catégories", group: "Référentiels" },
    { href: "/admin/locations", label: "Villes & quartiers", group: "Référentiels" },
    { href: "/admin/content", label: "Contenu", group: "Référentiels" },
    { href: "/admin/staff", label: "Équipe", group: "Administration" },
    { href: "/admin/reports", label: "Rapports", group: "Administration" },
    { href: "/admin/audit", label: "Journal d'audit", group: "Administration" },
    { href: "/admin/settings", label: "Paramètres", group: "Administration" },
  ];

  const gate: Record<string, Parameters<typeof hasPermission>[1]> = {
    "/admin/properties": "property.read",
    "/admin/sourcing": "sourcing.manage",
    "/admin/review": "property.review",
    "/admin/crm": "crm.read",
    "/admin/appointments": "appointment.manage",
    "/admin/tasks": "task.manage",
    "/admin/taxonomy": "taxonomy.manage",
    "/admin/locations": "location.manage",
    "/admin/content": "content.manage",
    "/admin/staff": "staff.manage",
    "/admin/reports": "report.read",
    "/admin/audit": "audit.read",
    "/admin/settings": "settings.manage",
  };

  const allowed = items.filter((item) => {
    const permission = gate[item.href];
    return !permission || hasPermission(user, permission);
  });

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="bg-ink lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-5">
          <Logo href="/admin" tone="light" compact />
          <span className="badge border-white/20 text-[8px] text-white/60">ADMIN</span>
        </div>
        <div className="px-2 pb-8">
          <AdminNav items={allowed} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/fr" className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink">
                ← Voir le site
              </Link>
              <Link href="/admin" className="lg:hidden text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink">
                Accueil admin
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="relative flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink">
                Notifications
                {unread ? <span className="min-w-4 rounded-full bg-lemon px-1 text-center text-[9px] font-bold text-ink tabular-nums">{unread}</span> : null}
              </Link>
              <div className="text-end">
                <p className="text-[11px] font-medium leading-tight">{user.fullName}</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-muted">{user.roleKey}</p>
              </div>
              <form action={staffLogoutAction}>
                <button type="submit" className="btn-outline btn-sm">
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="px-5 py-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
