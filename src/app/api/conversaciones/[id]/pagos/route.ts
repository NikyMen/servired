import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { participantIn } from "@/lib/mensajes-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);
  if (!user) return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  if (!role || !conversation) return NextResponse.json({ error: "La conversación no existe." }, { status: 404 });
  const payments = await prisma.payment.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, include: { review: { select: { id: true } } } });
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, conversation } = await participantIn(id);
  if (!user) return NextResponse.json({ error: "Entrá para pagar." }, { status: 401 });
  if (role !== "cliente" || !conversation) return NextResponse.json({ error: "Solo el cliente puede iniciar el pago." }, { status: 403 });
  await req.json().catch(() => null);

  const booking = await prisma.booking.findFirst({
    where: { userId: user.id, professionalId: conversation.professionalId, status: { in: ["presupuestada", "aceptada"] }, quotedPrice: { not: null } },
    orderBy: { updatedAt: "desc" },
    include: { payments: { where: { status: "pendiente" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!booking?.quotedPrice) return NextResponse.json({ error: "Esperá a que el profesional envíe su presupuesto." }, { status: 409 });
  if (booking.payments[0]) return NextResponse.json(booking.payments[0]);

  const amount = booking.quotedPrice;
  const commission = Math.round(amount * 0.1);
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: { amount, commission, netAmount: amount - commission, userId: user.id, professionalId: conversation.professionalId, conversationId: id, bookingId: booking.id },
      include: { review: { select: { id: true } } },
    });
    await tx.booking.update({ where: { id: booking.id }, data: { status: "aceptada" } });
    return created;
  });
  return NextResponse.json(payment, { status: 201 });
}
