import { prisma } from "@/lib/prisma";
import { notificar } from "@/lib/notificaciones";
import { REQUEST_WARN_MS } from "@/lib/solicitudes";

export const ACTIVE_JOB_STATUSES = ["in_progress", "finished", "payment_reported", "paid_awaiting_review"];
export const OPEN_BOOKING_STATUSES = ["requested", ...ACTIVE_JOB_STATUSES];
export const PROPOSAL_TTL_MS = 72 * 60 * 60 * 1000;

export function proposalIsActive(proposal: { status: string; expiresAt: Date }, now = new Date()) {
  return proposal.status === "pending" && proposal.expiresAt > now;
}

export function hasJobCapacity(activeJobs: number) {
  return activeJobs < 3;
}

export async function expirePendingProposals(bookingId?: string) {
  return prisma.proposal.updateMany({
    where: { ...(bookingId ? { bookingId } : {}), status: "pending", expiresAt: { lte: new Date() } },
    data: { status: "expired", decidedAt: new Date() },
  });
}

export async function activeJobsCount(professionalId: string) {
  return prisma.booking.count({ where: { professionalId, status: { in: ACTIVE_JOB_STATUSES } } });
}

/**
 * Vencer y avisar, perezoso: no hay cron, así que esto viaja en los listados de
 * solicitudes igual que `expirePendingProposals` viaja en los de trabajos.
 * `warnedAt` es lo que evita que cada visita al panel vuelva a avisar lo mismo.
 */
export async function expireServiceRequests() {
  const now = new Date();
  await prisma.serviceRequest.updateMany({
    where: { status: "abierta", expiresAt: { lte: now } },
    data: { status: "vencida" },
  });

  const porVencer = await prisma.serviceRequest.findMany({
    where: { status: "abierta", warnedAt: null, expiresAt: { lte: new Date(now.getTime() + REQUEST_WARN_MS) } },
    select: { id: true, title: true, userId: true, expiresAt: true },
  });
  for (const request of porVencer) {
    await prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({ where: { id: request.id }, data: { warnedAt: now } });
      await notificar(tx, request.userId, {
        kind: "solicitud_por_vencer",
        title: "Tu solicitud está por vencer",
        body: `"${request.title}" se cierra mañana. Podés volver a publicarla.`,
        url: "/solicitudes#mias",
        groupKey: `req:${request.id}`,
      });
    });
  }
}

/**
 * Lo que ve el oferente: abiertas, todavía vigentes y que no descartó.
 * El vencimiento se mira acá también por si nadie barrió todavía.
 */
export function openRequestsWhere(professionalId?: string | null) {
  return {
    status: "abierta",
    expiresAt: { gt: new Date() },
    ...(professionalId ? { dismissals: { none: { professionalId } } } : {}),
  };
}
