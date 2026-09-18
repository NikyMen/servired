import { PrismaClient } from "@prisma/client";
import { PROPOSAL_TTL_DAYS, PROPOSAL_TTL_MS } from "../src/lib/trabajo";

/**
 * Se corre una vez al deployar el cambio de 72 h a 5 días: las propuestas que
 * siguen pendientes pasan a vencer a los 5 días de enviadas, así no conviven
 * dos plazos. Solo alarga, nunca acorta, así que correrlo de nuevo no cambia
 * nada. Las que el barrido ya marcó vencidas quedan como están.
 */
const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.proposal.findMany({ where: { status: "pending" }, select: { id: true, createdAt: true, expiresAt: true } });
  let extended = 0;
  for (const proposal of pending) {
    const expiresAt = new Date(proposal.createdAt.getTime() + PROPOSAL_TTL_MS);
    // El vencimiento se calcula un instante antes de guardar, así que las que ya
    // nacieron con 5 días quedan unos milisegundos cortas: eso no es "extender".
    if (expiresAt.getTime() - proposal.expiresAt.getTime() < 60_000) continue;
    await prisma.proposal.update({ where: { id: proposal.id }, data: { expiresAt } });
    extended += 1;
  }
  console.log(`Propuestas pendientes: ${pending.length}. Extendidas a ${PROPOSAL_TTL_DAYS} días desde su envío: ${extended}.`);
}

main().finally(() => prisma.$disconnect());
