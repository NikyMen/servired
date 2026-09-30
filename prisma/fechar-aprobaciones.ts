import { PrismaClient } from "@prisma/client";

/**
 * Se corre una vez al deployar el orden de perfiles. Los perfiles aceptados
 * antes de existir `approvedAt` toman la fecha en que se aprobó su KYC; los
 * que no tienen KYC aprobado (los del seed), la de creación. Solo toca a los
 * que no tienen fecha, así que correrlo de nuevo no cambia nada.
 */
const prisma = new PrismaClient();

async function main() {
  const pros = await prisma.professional.findMany({
    where: { profileStatus: "approved", approvedAt: null },
    select: { id: true, createdAt: true, user: { select: { kycCase: { select: { status: true, reviewedAt: true } } } } },
  });
  for (const pro of pros) {
    const kyc = pro.user?.kycCase;
    const approvedAt = kyc?.status === "approved" && kyc.reviewedAt ? kyc.reviewedAt : pro.createdAt;
    await prisma.professional.update({ where: { id: pro.id }, data: { approvedAt } });
  }
  console.log(`Perfiles con fecha de aceptación: ${pros.length}.`);
}

main().finally(() => prisma.$disconnect());
