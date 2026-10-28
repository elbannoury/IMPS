import Link from "next/link";
import { Notice } from "@/components/ui";
import { updateAppointmentAction } from "@/app/actions/crm";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_FR: Record<string, string> = {
  requested: "Demandée",
  confirmed: "Confirmée",
  rescheduled: "Reprogrammée",
  cancelled: "Annulée",
  completed: "Effectuée",
  no_show: "Absent",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; saved?: string }>;
}) {
  await requireStaffPage("appointment.manage");
  const flags = await searchParams;

  const appointments = await prisma.viewingAppointment.findMany({
    where: flags.status ? { status: flags.status } : {},
    orderBy: [{ requestedAt: "asc" }],
    take: 100,
    include: {
      property: { select: { id: true, reference: true, titleFr: true } },
      lead: { select: { id: true, code: true, name: true } },
      assignedTo: { select: { fullName: true } },
    },
  });

  const statuses = ["requested", "confirmed", "completed", "cancelled", "no_show"];

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Opérations</p>
      <h1 className="mt-1 font-display text-3xl">Visites</h1>
      <p className="mt-1 text-xs text-muted">
        Une demande n&apos;est jamais présentée comme confirmée avant une confirmation explicite de l&apos;équipe.
      </p>

      {flags.error === "CONFLICT" ? <div className="mt-4"><Notice tone="warning">Conflit de créneaux : un autre rendez-vous confirmé existe pour ce membre de l&apos;équipe dans l&apos;heure.</Notice></div> : null}
      {flags.saved ? <div className="mt-4"><Notice tone="success">Visite mise à jour.</Notice></div> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/admin/appointments" className={`badge ${!flags.status ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"}`}>Toutes</Link>
        {statuses.map((status) => (
          <Link key={status} href={`/admin/appointments?status=${status}`} className={`badge ${flags.status === status ? "border-ink bg-ink text-white" : "border-line bg-white text-muted"}`}>
            {STATUS_FR[status]}
          </Link>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto border border-line bg-white">
        <table className="table-admin min-w-[1000px]">
          <thead>
            <tr>
              <th>Créneau demandé</th>
              <th>Bien</th>
              <th>Visiteur</th>
              <th>Statut</th>
              <th>Assigné</th>
              <th>Demande</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id}>
                <td className="whitespace-nowrap text-[12px] tabular-nums">{formatDateTime(appointment.requestedAt, "fr")}</td>
                <td>
                  <Link href={`/admin/properties/${appointment.property.id}`} className="text-[11px] hover:underline">
                    {appointment.property.reference}
                  </Link>
                  <p className="max-w-[220px] truncate text-[10px] text-muted">{appointment.property.titleFr}</p>
                </td>
                <td className="text-[12px]">
                  {appointment.visitorName}
                  {appointment.visitorPhone ? <p dir="ltr" className="text-[10px] text-muted">{appointment.visitorPhone}</p> : null}
                  {appointment.lead ? (
                    <Link href={`/admin/crm/${appointment.lead.id}`} className="text-[10px] underline underline-offset-2">
                      {appointment.lead.code}
                    </Link>
                  ) : null}
                </td>
                <td><span className={`badge ${appointment.status === "confirmed" ? "border-ink bg-ink text-white" : appointment.status === "requested" ? "border-lemon bg-lemon text-ink" : "border-line bg-soft text-muted"}`}>{STATUS_FR[appointment.status] ?? appointment.status}</span></td>
                <td className="text-[11px]">{appointment.assignedTo?.fullName ?? "—"}</td>
                <td className="text-[10px] text-muted">{formatDateTime(appointment.createdAt, "fr")}</td>
                <td>
                  <form action={updateAppointmentAction} className="flex flex-wrap gap-1">
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    {appointment.status === "requested" ? (
                      <button type="submit" name="status" value="confirmed" className="btn-primary btn-sm">Confirmer</button>
                    ) : null}
                    {appointment.status !== "cancelled" && appointment.status !== "completed" ? (
                      <>
                        <button type="submit" name="status" value="completed" className="btn-outline btn-sm">Effectuée</button>
                        <button type="submit" name="status" value="cancelled" className="btn-outline btn-sm">Annuler</button>
                        <button type="submit" name="status" value="no_show" className="btn-outline btn-sm">Absent</button>
                      </>
                    ) : null}
                  </form>
                </td>
              </tr>
            ))}
            {!appointments.length ? <tr><td colSpan={7} className="py-10 text-center text-sm text-muted">Aucune visite pour ce filtre.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
