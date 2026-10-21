import { PrismaClient } from "@prisma/client";

/**
 * Se corre una vez al deployar el presupuesto del chat (después del `db push`).
 * Los mensajes 💰 de antes no sabían de qué presupuesto eran; este script los
 * vincula con el suyo (misma pareja cliente–oferente, mismo monto, creado con
 * menos de 2 minutos de diferencia) para que el chat muestre su estado.
 * Solo toca los que no tienen vínculo: correrlo de nuevo no cambia nada.
 *
 *   npx tsx prisma/vincular-presupuestos.ts
 */
const prisma = new PrismaClient();
const VENTANA_MS = 2 * 60 * 1000;

async function main() {
  const mensajes = await prisma.message.findMany({
    where: { proposalId: null, text: { startsWith: "💰" } },
    select: { id: true, text: true, createdAt: true, conversation: { select: { userId: true, professionalId: true } } },
    orderBy: { createdAt: "asc" },
  });
  const usadas = new Set((await prisma.message.findMany({ where: { proposalId: { not: null } }, select: { proposalId: true } })).map((m) => m.proposalId!));

  let vinculados = 0;
  for (const mensaje of mensajes) {
    const monto = Number(mensaje.text.match(/\$\s?([\d.]+)/)?.[1]?.replace(/\./g, ""));
    if (!monto) continue;
    const candidatas = await prisma.proposal.findMany({
      where: {
        amount: monto,
        createdAt: { gte: new Date(mensaje.createdAt.getTime() - VENTANA_MS), lte: new Date(mensaje.createdAt.getTime() + VENTANA_MS) },
        booking: { userId: mensaje.conversation.userId, professionalId: mensaje.conversation.professionalId },
      },
      select: { id: true, createdAt: true },
    });
    const elegida = candidatas
      .filter((p) => !usadas.has(p.id))
      .sort((a, b) => Math.abs(a.createdAt.getTime() - mensaje.createdAt.getTime()) - Math.abs(b.createdAt.getTime() - mensaje.createdAt.getTime()))[0];
    if (!elegida) continue;
    await prisma.message.update({ where: { id: mensaje.id }, data: { proposalId: elegida.id } });
    usadas.add(elegida.id);
    vinculados++;
  }
  console.log(`Presupuestos vinculados: ${vinculados} de ${mensajes.length} mensajes sin vínculo.`);
}

main().finally(() => prisma.$disconnect());
