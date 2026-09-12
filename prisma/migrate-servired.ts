import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TTL = 72 * 60 * 60 * 1000;
const REQUEST_TTL = 7 * 24 * 60 * 60 * 1000;

const statusMap: Record<string, string> = {
  solicitada: "requested",
  presupuestada: "requested",
  aceptada: "in_progress",
  completada: "completed",
  cancelada: "cancelled",
};

async function main() {
  const professionalCategorySlugs = new Set(["abogado", "contador", "diseno"]);
  const categories = await prisma.category.findMany();
  for (const category of categories) {
    await prisma.category.update({ where: { id: category.id }, data: { kind: professionalCategorySlugs.has(category.slug) ? "profesional" : category.kind || "oficio" } });
  }

  const professionals = await prisma.professional.findMany({ select: { id: true, categoryId: true, userId: true, category: { select: { kind: true } } } });
  for (const professional of professionals) {
    await prisma.professional.update({ where: { id: professional.id }, data: { providerType: professional.category.kind === "profesional" ? "profesional" : "oficio" } });
    await prisma.professionalCategory.upsert({
      where: { professionalId_categoryId: { professionalId: professional.id, categoryId: professional.categoryId } },
      create: { professionalId: professional.id, categoryId: professional.categoryId, isPrimary: true },
      update: { isPrimary: true },
    });
  }

  await prisma.user.updateMany({ where: { emailVerifiedAt: { not: null }, accountStatus: { not: "suspended" } }, data: { accountStatus: "approved" } });
  await prisma.user.updateMany({ where: { emailVerifiedAt: null, accountStatus: { not: "suspended" } }, data: { accountStatus: "email_pending" } });

  const legacyPhotos = await prisma.workPhoto.findMany();
  for (const photo of legacyPhotos) {
    const alreadyCopied = await prisma.workSample.findFirst({ where: { professionalId: photo.professionalId, title: photo.title, images: { some: { url: photo.url } } } });
    if (!alreadyCopied) await prisma.workSample.create({ data: { professionalId: photo.professionalId, title: photo.title, description: photo.description, address: photo.address, latitude: photo.latitude, longitude: photo.longitude, createdAt: photo.createdAt, images: { create: { url: photo.url, position: 0, createdAt: photo.createdAt } } } });
  }

  const bookings = await prisma.booking.findMany({ include: { proposals: true } });
  for (const booking of bookings) {
    const oldStatus = booking.status;
    const nextStatus = statusMap[oldStatus];
    if (!nextStatus) continue;
    let proposalId = booking.acceptedProposalId;
    if (booking.quotedPrice && booking.proposals.length === 0) {
      const accepted = oldStatus === "aceptada" || oldStatus === "completada";
      const expiresAt = new Date(booking.updatedAt.getTime() + TTL);
      const proposal = await prisma.proposal.create({ data: { bookingId: booking.id, amount: booking.quotedPrice, status: accepted ? "accepted" : expiresAt <= new Date() ? "expired" : "pending", expiresAt, decidedAt: accepted || expiresAt <= new Date() ? booking.updatedAt : null, createdAt: booking.createdAt } });
      if (accepted) proposalId = proposal.id;
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { status: nextStatus, acceptedProposalId: proposalId, completedAt: nextStatus === "completed" ? booking.updatedAt : booking.completedAt } });
  }

  // Las solicitudes viejas nacieron sin vencimiento y `db push` les puso la
  // fecha de hoy: se las corre a los 7 días reales desde que se publicaron, y
  // las que ya pasaron ese plazo quedan vencidas de entrada.
  const requests = await prisma.serviceRequest.findMany({ select: { id: true, createdAt: true, status: true } });
  const now = new Date();
  for (const request of requests) {
    const expiresAt = new Date(request.createdAt.getTime() + REQUEST_TTL);
    await prisma.serviceRequest.update({ where: { id: request.id }, data: { expiresAt, status: request.status === "abierta" && expiresAt <= now ? "vencida" : request.status } });
  }

  // Un solo dato de cobro: si había CVU gana el CVU, que es el que no depende
  // de que el alias siga apuntando a la misma cuenta.
  const withPayment = await prisma.professional.findMany({ where: { paymentHandle: null }, select: { id: true, paymentAlias: true, paymentCvu: true, userId: true } });
  for (const professional of withPayment) {
    const cvu = professional.paymentCvu?.trim();
    const alias = professional.paymentAlias?.trim();
    const handle = cvu || alias;
    if (handle) await prisma.professional.update({ where: { id: professional.id }, data: { paymentHandle: handle, paymentHandleKind: cvu ? "cvu" : "alias" } });
  }

  // El teléfono público arranca con el que declararon en el KYC; de ahí en más
  // lo maneja cada quien desde su perfil.
  const kycPhones = await prisma.kycCase.findMany({ select: { phone: true, user: { select: { professional: { select: { id: true, phone: true } } } } } });
  let phonesCopied = 0;
  for (const kyc of kycPhones) {
    const professional = kyc.user.professional;
    if (!professional || professional.phone) continue;
    await prisma.professional.update({ where: { id: professional.id }, data: { phone: kyc.phone } });
    phonesCopied += 1;
  }

  if (process.env.NODE_ENV !== "production") {
    await prisma.user.updateMany({ where: { email: { endsWith: ".test" } }, data: { emailVerifiedAt: new Date(), accountStatus: "approved" } });
  }

  console.log(`Migración lista: ${professionals.length} perfiles, ${legacyPhotos.length} fotos históricas, ${bookings.length} contrataciones, ${requests.length} solicitudes con vencimiento y ${phonesCopied} teléfonos copiados del KYC.`);
}

main().finally(() => prisma.$disconnect());
