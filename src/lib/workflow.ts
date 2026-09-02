import { prisma } from "@/lib/prisma";

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
