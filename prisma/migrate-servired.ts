import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TTL = 72 * 60 * 60 * 1000;

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

  if (process.env.NODE_ENV !== "production") {
    await prisma.user.updateMany({ where: { email: { endsWith: ".test" } }, data: { emailVerifiedAt: new Date(), accountStatus: "approved" } });
  }

  console.log(`Migración lista: ${professionals.length} perfiles, ${legacyPhotos.length} fotos históricas y ${bookings.length} contrataciones revisadas.`);
}

main().finally(() => prisma.$disconnect());
