import Link from "next/link";
import { Notice } from "@/components/ui";
import { completeTaskAction, createTaskAction } from "@/app/actions/crm";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ done?: string; created?: string }> }) {
  await requireStaffPage("task.manage");
  const flags = await searchParams;

  const [tasks, staff] = await Promise.all([
    prisma.staffTask.findMany({
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 100,
      include: { assignee: { select: { fullName: true } }, property: { select: { id: true, reference: true } } },
    }),
    prisma.profile.findMany({ where: { isStaff: true, isActive: true }, select: { id: true, fullName: true } }),
  ]);

  const open = tasks.filter((task) => task.status === "open");
  const closed = tasks.filter((task) => task.status !== "open");

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations</p>
      <h1 className="mt-1 font-display text-3xl">Tâches internes</h1>
      <p className="mt-1 text-xs text-muted">Relances, compléments d&apos;information et contrôles de disponibilité.</p>

      {flags.created ? <div className="mt-4"><Notice tone="success">Tâche créée.</Notice></div> : null}
      {flags.done ? <div className="mt-4"><Notice tone="success">Tâche mise à jour.</Notice></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="border border-line bg-white">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Ouvertes ({open.length})</h2>
          </header>
          <ul className="divide-y divide-line">
            {open.map((task) => {
              const overdue = task.dueAt && task.dueAt.getTime() < Date.now();
              return (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium">{task.title}</p>
                    <p className="text-[10px] text-muted">
                      {task.assignee?.fullName ?? "—"}
                      {task.dueAt ? ` · échéance ${formatDate(task.dueAt, "fr")}` : ""}
                      {overdue ? " · ⚠ en retard" : ""}
                      {task.priority === "high" ? " · haute priorité" : ""}
                    </p>
                    {task.property ? (
                      <Link href={`/admin/properties/${task.property.id}`} className="text-[10px] underline underline-offset-2">
                        {task.property.reference}
                      </Link>
                    ) : null}
                  </div>
                  <form action={completeTaskAction}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button type="submit" className="btn-outline btn-sm">Terminer</button>
                  </form>
                </li>
              );
            })}
            {!open.length ? <li className="px-4 py-8 text-center text-xs text-muted">Aucune tâche ouverte.</li> : null}
          </ul>
        </section>

        <aside className="space-y-4">
          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Nouvelle tâche</h2>
            </header>
            <form action={createTaskAction} className="space-y-2 p-4">
              <div>
                <label htmlFor="title" className="label">Titre</label>
                <input id="title" name="title" required className="field" />
              </div>
              <div>
                <label htmlFor="assigneeId" className="label">Assignée à</label>
                <select id="assigneeId" name="assigneeId" className="field">
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>{member.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dueAt" className="label">Échéance</label>
                <input id="dueAt" name="dueAt" type="date" className="field" />
              </div>
              <div>
                <label htmlFor="priority" className="label">Priorité</label>
                <select id="priority" name="priority" className="field">
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="low">Basse</option>
                </select>
              </div>
              <div>
                <label htmlFor="description" className="label">Description</label>
                <textarea id="description" name="description" rows={2} className="field" />
              </div>
              <button type="submit" className="btn-primary w-full">Créer</button>
            </form>
          </section>

          {closed.length ? (
            <section className="border border-line bg-white">
              <header className="border-b border-line px-4 py-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Terminées</h2>
              </header>
              <ul className="divide-y divide-line">
                {closed.slice(0, 8).map((task) => (
                  <li key={task.id} className="px-4 py-2 text-[11px] text-muted">
                    {task.title} · {task.completedAt ? formatDateTime(task.completedAt, "fr") : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
