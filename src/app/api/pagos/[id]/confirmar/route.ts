import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.userId !== user.id) return NextResponse.json({ error: "El pago no existe." }, { status: 404 });
  if (payment.status === "pagado") return NextResponse.json(payment);
  const updated = await prisma.$transaction(async (tx) => {
    const paid = await tx.payment.update({ where: { id }, data: { status: "pagado", paidAt: new Date() } });
    if (payment.bookingId) await tx.booking.update({ where: { id: payment.bookingId }, data: { status: "completada", finalPrice: payment.amount, workSummary: "Trabajo abonado mediante Mercado Pago demo." } });
    await tx.message.create({ data: { conversationId: payment.conversationId, sender: "cliente", text: `Pago confirmado por $${payment.amount.toLocaleString("es-AR")} (demo).` } });
    return paid;
  });
  return NextResponse.json(updated);
}

