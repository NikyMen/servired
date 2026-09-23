import { prisma } from "@/lib/prisma";

export const MENSAJE_CALIFICACION_PENDIENTE = "Antes de seguir, calificá el último trabajo que contrataste.";

/**
 * El trabajo pagado más viejo que el cliente todavía no calificó. Mientras
 * exista, la calificación es obligatoria (como en Uber): la pantalla de
 * calificar tapa el sitio y no puede contratar, escribirle a otro oferente ni
 * publicar solicitudes.
 */
export async function calificacionPendiente(userId: string) {
  const booking = await prisma.booking.findFirst({
    where: { userId, status: "paid_awaiting_review", payments: { some: { status: "pagado", review: null } } },
    orderBy: { paidAt: "asc" },
    select: {
      id: true,
      workSummary: true,
      service: { select: { title: true } },
      professional: { select: { name: true, businessName: true, avatarColor: true, avatarUrl: true } },
      payments: { where: { status: "pagado", review: null }, orderBy: { paidAt: "asc" }, take: 1, select: { id: true } },
    },
  });
  const payment = booking?.payments[0];
  if (!booking || !payment) return null;
  return {
    paymentId: payment.id,
    trabajo: booking.service?.title ?? booking.workSummary ?? "Servicio contratado",
    profesional: {
      nombre: booking.professional.businessName || booking.professional.name,
      avatarColor: booking.professional.avatarColor,
      avatarUrl: booking.professional.avatarUrl,
    },
  };
}

export type CalificacionPendiente = NonNullable<Awaited<ReturnType<typeof calificacionPendiente>>>;
