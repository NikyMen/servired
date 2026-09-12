import { prisma } from "@/lib/prisma";
import { removeUpload } from "@/lib/uploads";
import { removeKycDocument } from "@/lib/kyc";
import { ACTIVE_JOB_STATUSES } from "@/lib/workflow";

/**
 * Baja de cuenta: borrado definitivo, no suspensión.
 *
 * La cascada del esquema se lleva sesiones, conversaciones, mensajes,
 * contrataciones, solicitudes, pagos, cuentas OAuth, el expediente KYC y el
 * perfil con sus servicios, muestras y reseñas recibidas. Lo que NO se lleva
 * son los archivos, así que se borran a mano antes de la fila.
 *
 * Sobreviven las reseñas que la persona escribió (`Review.userId` es SetNull):
 * son la reputación de otro, y quedan con el nombre que ya tenían guardado.
 */
export async function deleteAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatarUrl: true,
      kycCase: { select: { documents: { select: { filename: true } } } },
      professional: {
        select: {
          id: true,
          avatarUrl: true,
          coverUrl: true,
          workPhotos: { select: { url: true } },
          workSamples: { select: { images: { select: { url: true } } } },
        },
      },
    },
  });
  if (!user) return { ok: false as const, error: "La cuenta no existe." };

  // Borrar en medio de un trabajo deja al otro lado sin con quién hablar y sin
  // a quién pagarle: primero hay que terminarlo o cancelarlo.
  const activos = await prisma.booking.count({
    where: {
      status: { in: ACTIVE_JOB_STATUSES },
      OR: [{ userId }, ...(user.professional ? [{ professionalId: user.professional.id }] : [])],
    },
  });
  if (activos > 0) {
    return { ok: false as const, error: "Tenés trabajos en curso. Terminalos o cancelalos antes de dar de baja la cuenta." };
  }

  const adjuntos = await prisma.message.findMany({
    where: { conversation: { OR: [{ userId }, ...(user.professional ? [{ professionalId: user.professional.id }] : [])] }, attachmentUrl: { not: null } },
    select: { attachmentUrl: true },
  });

  const publicos = [
    user.avatarUrl,
    user.professional?.avatarUrl,
    user.professional?.coverUrl,
    ...(user.professional?.workPhotos.map((foto) => foto.url) ?? []),
    ...(user.professional?.workSamples.flatMap((muestra) => muestra.images.map((imagen) => imagen.url)) ?? []),
    ...adjuntos.map((mensaje) => mensaje.attachmentUrl),
  ];

  // Primero los archivos: si algo falla, la fila todavía está y se puede
  // reintentar. Al revés quedarían huérfanos sin nadie que sepa de ellos.
  await Promise.all(publicos.map((url) => removeUpload(url)));
  for (const document of user.kycCase?.documents ?? []) {
    await removeKycDocument(document.filename);
  }

  await prisma.user.delete({ where: { id: userId } });
  return { ok: true as const };
}
